import { describe, expect, it } from 'vitest'
import type { TimeSeries } from '../../../app/types/mutation'
import type { SpatialClusterAssignment } from '../../../app/types/clustering'
import {
  buildClusterFeatureVector,
  buildClusterMeanSeries,
  runKMeansClustering,
  standardizeFeatureMatrix,
} from '../../../server/utils/spatialClustering'
import { computeMean, computeStd, computeOlsSlope } from '../../../server/utils/slidingWindow'

function buildSeries(id: string, lat: number, lon: number, values: number[], startYear = 2000): TimeSeries {
  return {
    id,
    lat,
    lon,
    label: id,
    points: values.map((v, i) => ({
      t: new Date(startYear + i, 0, 1),
      v,
    })),
  }
}

describe('spatialClustering utils', () => {
  describe('buildClusterFeatureVector', () => {
    it('builds a 6D vector with standardized values', () => {
      const series = buildSeries('lake-a', 10, 20, [1, 3, 5, 7])
      const globalStats = { mean: 0, std: 1, min: 0, max: 1 }
      const vector = buildClusterFeatureVector(series, globalStats)

      const values = series.points.map(p => p.v)
      const years = series.points.map(p => p.t.getFullYear())
      const meanTemp = computeMean(values)
      const variance = computeStd(values) ** 2
      const slope = computeOlsSlope(years, values)
      const range = Math.max(...values) - Math.min(...values)

      expect(vector.length).toBe(6)
      expect(vector[0]).toBeCloseTo(series.lat)
      expect(vector[1]).toBeCloseTo(series.lon)
      expect(vector[2]).toBeCloseTo(meanTemp)
      expect(vector[3]).toBeCloseTo(variance)
      expect(vector[4]).toBeCloseTo(slope)
      expect(vector[5]).toBeCloseTo(range)
    })

    it('applies z-score normalization based on global stats', () => {
      const series = buildSeries('lake-b', 10, 20, [2, 4, 6, 8])
      const globalStats = { mean: 5, std: 5, min: 0, max: 10 }
      const vector = buildClusterFeatureVector(series, globalStats)

      expect(vector.length).toBe(6)
      vector.forEach((val) => {
        expect(Number.isFinite(val)).toBe(true)
      })
      expect(vector[0]).toBeCloseTo((series.lat - globalStats.mean) / globalStats.std)
      expect(vector[1]).toBeCloseTo((series.lon - globalStats.mean) / globalStats.std)
    })
  })

  describe('standardizeFeatureMatrix', () => {
    it('standardizes each column to mean 0 and std 1', () => {
      const matrix = [
        [1, 2, 3],
        [3, 4, 5],
        [5, 6, 7],
      ]
      const { standardized } = standardizeFeatureMatrix(matrix)

      const columnCount = standardized[0]?.length ?? 0
      for (let i = 0; i < columnCount; i++) {
        const columnValues = standardized.map(row => row[i]!)
        expect(computeMean(columnValues)).toBeCloseTo(0)
        expect(computeStd(columnValues)).toBeCloseTo(1)
      }
    })

    it('handles constant columns without NaN', () => {
      const matrix = [
        [2, 5],
        [2, 7],
        [2, 9],
      ]
      const { standardized } = standardizeFeatureMatrix(matrix)

      const firstColumn = standardized.map(row => row[0])
      expect(firstColumn.every(v => v === 0)).toBe(true)
    })
  })

  describe('runKMeansClustering', () => {
    const clusterA = [
      [0, 0, 0, 0],
      [0.2, 0.1, 0.1, 0],
      [0.1, 0.2, 0, 0.2],
      [0.3, 0.1, 0.2, 0.1],
      [0.1, 0.3, 0.1, 0.1],
    ]
    const clusterB = [
      [10, 10, 5, 5],
      [10.2, 10.1, 5.1, 5],
      [9.9, 10.2, 5.2, 5.1],
      [10.1, 9.9, 5, 5.2],
      [10.3, 10.2, 5.1, 5.2],
    ]
    const featureMatrix = [...clusterA, ...clusterB]

    it('clusters points into two distinct groups with full coordinate weight', () => {
      const { assignments, centroids } = runKMeansClustering(featureMatrix, 2, 1)

      expect(assignments.length).toBe(featureMatrix.length)
      expect(centroids.length).toBe(2)

      const groupA = new Set(assignments.slice(0, 5))
      const groupB = new Set(assignments.slice(5))
      expect(groupA.size).toBe(1)
      expect(groupB.size).toBe(1)
      expect([...groupA][0]).not.toBe([...groupB][0])
    })

    it('respects coordinateWeight by down-weighting lat/lon', () => {
      const { assignments } = runKMeansClustering(featureMatrix, 2, 0)

      const groupA = new Set(assignments.slice(0, 5))
      const groupB = new Set(assignments.slice(5))
      expect(groupA.size).toBe(1)
      expect(groupB.size).toBe(1)
      expect([...groupA][0]).not.toBe([...groupB][0])
    })
  })

  describe('buildClusterMeanSeries', () => {
    it('builds mean series with std bands and centroid', () => {
      const seriesA = buildSeries('lake-a', 10, 20, [10, 14])
      const seriesB = buildSeries('lake-b', 12, 22, [14, 18])
      const assignments: SpatialClusterAssignment[] = [
        { lakeId: 'lake-a', clusterId: 0, distanceToCentroid: 0, lat: 10, lon: 20 },
        { lakeId: 'lake-b', clusterId: 0, distanceToCentroid: 0, lat: 12, lon: 22 },
      ]

      const summaries = buildClusterMeanSeries(assignments, [seriesA, seriesB], 'std')
      expect(summaries.length).toBe(1)

      const summary = summaries[0]!
      expect(summary.clusterId).toBe(0)
      expect(summary.lakeCount).toBe(2)
      expect(summary.centroidLat).toBeCloseTo(11)
      expect(summary.centroidLon).toBeCloseTo(21)

      const year2000 = summary.meanSeries.find(p => p.year === 2000)!
      expect(year2000.mean).toBeCloseTo(12)
      expect(year2000.upper).toBeCloseTo(12 + Math.sqrt(8))
      expect(year2000.lower).toBeCloseTo(12 - Math.sqrt(8))
    })

    it('builds mean series with minmax bands', () => {
      const seriesC = buildSeries('lake-c', 30, 40, [5, 7])
      const assignments: SpatialClusterAssignment[] = [
        { lakeId: 'lake-c', clusterId: 1, distanceToCentroid: 0, lat: 30, lon: 40 },
      ]

      const summaries = buildClusterMeanSeries(assignments, [seriesC], 'minmax')
      expect(summaries.length).toBe(1)

      const summary = summaries[0]!
      const year2001 = summary.meanSeries.find(p => p.year === 2001)!
      expect(year2001.upper).toBeCloseTo(7)
      expect(year2001.lower).toBeCloseTo(7)
    })
  })
})
