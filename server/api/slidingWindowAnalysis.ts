import type { TimeSeries } from '~/types/mutation'
import type { SlidingWindowAnalysisResponse } from '~/types/sliding'
import { computeSlidingWindowAnalysis } from '../utils/slidingWindow'

export default defineEventHandler(async (event): Promise<SlidingWindowAnalysisResponse> => {
  const body = await readBody(event)
  const { rawSeries, windowSizes = [5, 9, 13], metrics = ['mean', 'std', 'slope'] } = body as {
    rawSeries: TimeSeries[]
    windowSizes: number[]
    metrics: ('mean' | 'std' | 'slope')[]
  }

  if (!rawSeries?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No time series data provided',
    })
  }

  try {
    const result = computeSlidingWindowAnalysis(rawSeries, windowSizes, metrics)
    return result
  }
  catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Sliding window analysis failed: ${error}`,
    })
  }
})
