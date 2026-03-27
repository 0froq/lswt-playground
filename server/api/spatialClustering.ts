import type { TimeSeries } from '~/types/mutation'
import type { SpatialClusteringResponse } from '~/types/clustering'
import { performSpatialClustering, getYear } from '../utils/spatialClustering'
import { computeSlidingWindowAnalysis } from '../utils/slidingWindow'

export default defineEventHandler(async (event): Promise<SpatialClusteringResponse> => {
  const body = await readBody(event)
  const {
    rawSeries,
    clusterCount = 5,
    coordinateWeight = 0.35,
    bandMode = 'std',
    windowSizes = [5, 9, 13],
  } = body as {
    rawSeries: TimeSeries[]
    clusterCount: number
    coordinateWeight: number
    bandMode: 'std' | 'minmax'
    windowSizes?: number[]
  }

  if (!rawSeries?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No time series data provided',
    })
  }

  try {
    const result = performSpatialClustering(rawSeries, clusterCount, coordinateWeight, bandMode)

    const clustersWithSliding = result.clusters.map((cluster) => {
      const clusterLakeIds = new Set(
        result.assignments
          .filter(a => a.clusterId === cluster.clusterId)
          .map(a => a.lakeId),
      )

      const clusterSeries = rawSeries.filter(s => clusterLakeIds.has(s.id))

      const slidingAnalysis = computeSlidingWindowAnalysis(
        clusterSeries,
        windowSizes,
        ['mean', 'std', 'slope'],
      )

      const clusterSlidingFeatures = slidingAnalysis.globalMeanFeatures.map(f => ({
        ...f,
        lakeId: `cluster_${cluster.clusterId}`,
      }))

      const memberSeries = clusterSeries.map(s => ({
        lakeId: s.id,
        label: s.label,
        points: s.points.map(p => ({ year: getYear(p.t), value: p.v })),
      }))

      return {
        ...cluster,
        slidingFeatures: clusterSlidingFeatures,
        memberSeries,
      }
    })

    return {
      ...result,
      clusters: clustersWithSliding,
    }
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Spatial clustering failed: ${error}`,
    })
  }
})
