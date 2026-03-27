import type { TimeSeries } from '~/types/mutation'
import type { SpatialClusterAssignment, SpatialClusterSummary, ClusterBandPoint } from '~/types/clustering'
import { kmeans } from 'ml-kmeans'
import { computeMean, computeStd, computeOlsSlope } from './slidingWindow'

export function getYear(t: Date | string): number {
  return typeof t === 'string' ? new Date(t).getFullYear() : t.getFullYear()
}

function standardizeValue(value: number, stats: { mean: number, std: number }): number {
  if (!Number.isFinite(value)) return 0
  if (!Number.isFinite(stats.mean)) return 0
  const std = Number.isFinite(stats.std) && stats.std !== 0 ? stats.std : 1
  return (value - stats.mean) / std
}

/**
 * Build feature vector for clustering from a time series
 * Features: [lat, lon, meanTemp, variance, slope, range]
 */
export function buildClusterFeatureVector(
  series: TimeSeries,
  globalStats: { mean: number, std: number, min: number, max: number },
): number[] {
  const values = series.points.map(p => p.v)
  const years = series.points.map(p => getYear(p.t))

  const meanTemp = computeMean(values)
  const variance = computeStd(values) ** 2
  const slope = computeOlsSlope(years, values)
  const range = values.length ? Math.max(...values) - Math.min(...values) : NaN

  return [
    standardizeValue(series.lat, globalStats),
    standardizeValue(series.lon, globalStats),
    standardizeValue(meanTemp, globalStats),
    standardizeValue(variance, globalStats),
    standardizeValue(slope, globalStats),
    standardizeValue(range, globalStats),
  ]
}

/**
 * Standardize feature matrix (z-score normalization)
 * Returns standardized matrix and the statistics used
 */
export function standardizeFeatureMatrix(matrix: number[][]): {
  standardized: number[][]
  means: number[]
  stds: number[]
} {
  if (!matrix.length || !matrix[0]) return { standardized: [], means: [], stds: [] }

  const numFeatures = matrix[0].length
  const means: number[] = []
  const stds: number[] = []

  // Calculate mean and std for each feature
  for (let i = 0; i < numFeatures; i++) {
    const values = matrix.map(row => row[i]!).filter(v => Number.isFinite(v))
    const mean = computeMean(values)
    const std = computeStd(values)

    means.push(mean)
    stds.push(Number.isFinite(std) && std !== 0 ? std : 1)
  }

  // Standardize
  const standardized = matrix.map((row) => {
    return row.map((val, i) => (val - means[i]!) / stds[i]!)
  })

  return { standardized, means, stds }
}

/**
 * Apply coordinate weight to feature matrix
 * First two columns (lat, lon) are multiplied by the weight
 */
export function applyCoordinateWeight(
  matrix: number[][],
  coordinateWeight: number,
): number[][] {
  const weight = Math.min(1, Math.max(0, coordinateWeight))
  return matrix.map((row) => {
    const newRow = [...row]
    if (newRow[0] !== undefined) newRow[0] *= weight
    if (newRow[1] !== undefined) newRow[1] *= weight
    return newRow
  })
}

/**
 * Run K-means clustering on feature matrix
 */
export function runKMeansClustering(
  featureMatrix: number[][],
  k: number,
  coordinateWeight: number,
): { assignments: number[], centroids: number[][] } {
  if (!featureMatrix.length || k <= 0) {
    return { assignments: [], centroids: [] }
  }

  const weightedMatrix = coordinateWeight < 1
    ? applyCoordinateWeight(featureMatrix, coordinateWeight)
    : featureMatrix

  const result = kmeans(weightedMatrix, k, {
    maxIterations: 100,
    tolerance: 1e-4,
    initialization: 'kmeans++',
  })

  return {
    assignments: result.clusters,
    centroids: result.centroids,
  }
}

/**
 * Build cluster mean time series with bands
 */
export function buildClusterMeanSeries(
  clusterAssignments: SpatialClusterAssignment[],
  allSeries: TimeSeries[],
  bandMode: 'std' | 'minmax',
): SpatialClusterSummary[] {
  // Group series by cluster
  const clusterGroups = new Map<number, TimeSeries[]>()

  clusterAssignments.forEach((assignment) => {
    const series = allSeries.find(s => s.id === assignment.lakeId)
    if (!series) return

    if (!clusterGroups.has(assignment.clusterId)) {
      clusterGroups.set(assignment.clusterId, [])
    }
    clusterGroups.get(assignment.clusterId)!.push(series)
  })

  // Build summary for each cluster
  const summaries: SpatialClusterSummary[] = []

  clusterGroups.forEach((seriesList, clusterId) => {
    // Collect all years across series in this cluster
    const yearSet = new Set<number>()
    seriesList.forEach((series) => {
      series.points.forEach(p => yearSet.add(getYear(p.t)))
    })
    const years = Array.from(yearSet).sort((a, b) => a - b)

    // Calculate centroid
    const centroidLat = computeMean(seriesList.map(s => s.lat))
    const centroidLon = computeMean(seriesList.map(s => s.lon))

    // Build mean series with bands
    const meanSeries: ClusterBandPoint[] = years.map((year) => {
      const values: number[] = []
      seriesList.forEach((series) => {
        const point = series.points.find(p => getYear(p.t) === year)
        if (point && Number.isFinite(point.v)) {
          values.push(point.v)
        }
      })

      const mean = computeMean(values)
      let upper: number
      let lower: number

      if (bandMode === 'std') {
        const std = computeStd(values)
        if (Number.isFinite(std)) {
          upper = mean + std
          lower = mean - std
        }
        else {
          upper = mean
          lower = mean
        }
      }
      else {
        if (values.length) {
          upper = Math.max(...values)
          lower = Math.min(...values)
        }
        else {
          upper = mean
          lower = mean
        }
      }

      return {
        year,
        mean,
        upper,
        lower,
      }
    }).filter(p => Number.isFinite(p.mean))

    summaries.push({
      clusterId,
      lakeCount: seriesList.length,
      centroidLat,
      centroidLon,
      meanSeries,
      slidingFeatures: [],
      memberSeries: seriesList.map(s => ({
        lakeId: s.id,
        label: s.label,
        points: s.points.map(p => ({ year: getYear(p.t), value: p.v })),
      })),
    })
  })

  // Sort by clusterId
  summaries.sort((a, b) => a.clusterId - b.clusterId)

  return summaries
}

/**
 * Perform spatial clustering on time series data
 */
export function performSpatialClustering(
  allSeries: TimeSeries[],
  clusterCount: number,
  coordinateWeight: number,
  bandMode: 'std' | 'minmax',
): {
  assignments: SpatialClusterAssignment[]
  clusters: SpatialClusterSummary[]
  clusterCount: number
  featureNames: string[]
} {
  // Build feature vectors
  const globalValues = allSeries.flatMap(series => series.points.map(p => p.v))
  const globalStats = {
    mean: computeMean(globalValues),
    std: computeStd(globalValues),
    min: globalValues.length ? Math.min(...globalValues) : 0,
    max: globalValues.length ? Math.max(...globalValues) : 0,
  }

  const featureVectors = allSeries.map(series => buildClusterFeatureVector(series, globalStats))

  // Standardize features
  const { standardized } = standardizeFeatureMatrix(featureVectors)

  const weightedFeatures = applyCoordinateWeight(standardized, coordinateWeight)

  // Run clustering
  const { assignments, centroids } = runKMeansClustering(standardized, clusterCount, coordinateWeight)

  // Build assignments
  const clusterAssignments: SpatialClusterAssignment[] = allSeries.map((series, i) => {
    const clusterId = assignments[i] ?? 0
    // Calculate distance to centroid
    const centroid = centroids[clusterId] ?? []
    const features = weightedFeatures[i] ?? []
    const distance = Math.sqrt(
      features.reduce((sum, val, j) => sum + (val - (centroid[j] ?? 0)) ** 2, 0),
    )

    return {
      lakeId: series.id,
      clusterId,
      distanceToCentroid: distance,
      lat: series.lat,
      lon: series.lon,
    }
  })

  // Build cluster summaries
  const clusters = buildClusterMeanSeries(clusterAssignments, allSeries, bandMode)

  return {
    assignments: clusterAssignments,
    clusters,
    clusterCount,
    featureNames: ['lat', 'lon', 'meanTemp', 'variance', 'slope', 'range'],
  }
}
