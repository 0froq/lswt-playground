import type { TimeSeries } from '~/types/mutation'
import type { STLResult } from '~/types/stl'
import { stl, createConfigFromParams, spanToWindow } from '../utils/stl'

interface STLRequest {
  series: TimeSeries[]
  seasonalPeriod?: number
  seasonalSpan?: number
  trendSpan?: number
  seasonalWindow?: number
  trendWindow?: number
  innerIterations?: number
  outerIterations?: number
  robust?: boolean
  skipLowPass?: boolean
  skipFinishingLoop?: boolean
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as STLRequest
    const {
      series,
      seasonalPeriod = 12,
      seasonalSpan,
      trendSpan,
      seasonalWindow,
      trendWindow,
      innerIterations = 2,
      outerIterations = 0,
      robust = false,
      skipLowPass = false,
      skipFinishingLoop = false,
    } = body

    if (!series || !Array.isArray(series) || series.length === 0) {
      return {
        results: [],
        error: 'No time series data provided',
      }
    }

    const useFixedWindow = seasonalWindow !== undefined && trendWindow !== undefined

    const results: STLResult[] = []

    for (const ts of series) {
      const result = decomposeSTL(ts, {
        period: seasonalPeriod,
        seasonalSpan: seasonalSpan ?? 0.15,
        trendSpan: trendSpan ?? 0.25,
        seasonalWindow,
        trendWindow,
        useFixedWindow,
        innerIterations,
        outerIterations,
        robust,
        skipLowPass,
        skipFinishingLoop,
      })
      results.push(result)
    }

    return {
      results,
      error: null,
    }
  }
  catch (error: any) {
    return {
      results: [],
      error: error.message || 'Failed to decompose time series',
    }
  }
})

interface STLDecomposeParams {
  period: number
  seasonalSpan: number
  trendSpan: number
  seasonalWindow?: number
  trendWindow?: number
  useFixedWindow: boolean
  innerIterations: number
  outerIterations: number
  robust: boolean
  skipLowPass: boolean
  skipFinishingLoop: boolean
}

function resolveWindowLength(
  useFixed: boolean,
  fixedValue: number | undefined,
  spanValue: number,
  n: number,
): number {
  if (useFixed && fixedValue !== undefined) {
    return Math.max(7, fixedValue % 2 === 0 ? fixedValue + 1 : fixedValue)
  }
  return spanToWindow(spanValue, n)
}

function decomposeSTL(
  series: TimeSeries,
  params: STLDecomposeParams,
): STLResult {
  const values = series.points.map(p => p.v)
  const times = series.points.map(p => new Date(p.t))
  const n = values.length

  if (n < params.period * 2) {
    return createEmptyResult(series, times)
  }

  const seasonalWindow = resolveWindowLength(
    params.useFixedWindow,
    params.seasonalWindow,
    params.seasonalSpan,
    n,
  )

  const trendWindow = resolveWindowLength(
    params.useFixedWindow,
    params.trendWindow,
    params.trendSpan,
    n,
  )

  const config = createConfigFromParams({
    period: params.period,
    seasonalWindow,
    trendWindow,
    innerIterations: params.innerIterations,
    outerIterations: params.outerIterations,
    robust: params.robust,
    skipLowPass: params.skipLowPass,
    skipFinishingLoop: params.skipFinishingLoop,
  })

  const result = stl(values, config)

  return {
    original: result.original,
    trend: result.trend,
    seasonal: result.seasonal,
    remainder: result.remainder,
    lakeId: series.id,
    label: series.label,
    lat: series.lat,
    lon: series.lon,
    time: times,
    diagnostics: result.diagnostics,
    weights: result.weights,
  }
}

function createEmptyResult(series: TimeSeries, times: Date[]): STLResult {
  const n = series.points.length
  return {
    original: series.points.map(p => p.v),
    trend: Array.from({ length: n }, () => 0),
    seasonal: Array.from({ length: n }, () => 0),
    remainder: Array.from({ length: n }, () => 0),
    lakeId: series.id,
    label: series.label,
    lat: series.lat,
    lon: series.lon,
    time: times,
  }
}
