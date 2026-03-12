import type { TimeSeries } from '~/types/mutation'
import type { STLResult } from '~/types/stl'

interface STLRequest {
  series: TimeSeries[]
  seasonalPeriod?: number
  seasonalSpan?: number
  trendSpan?: number
}

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event) as STLRequest
    const { series, seasonalPeriod = 12, seasonalSpan = 0.15, trendSpan = 0.25 } = body

    if (!series || !Array.isArray(series) || series.length === 0) {
      return {
        results: [],
        error: 'No time series data provided',
      }
    }

    const results: STLResult[] = []

    for (const ts of series) {
      const result = decomposeSTL(ts, seasonalPeriod, seasonalSpan, trendSpan)
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

function decomposeSTL(
  series: TimeSeries,
  seasonalPeriod: number,
  seasonalSpan: number,
  trendSpan: number,
): STLResult {
  const values = series.points.map(p => p.v)
  const times = series.points.map(p => new Date(p.t))
  const n = values.length

  if (n < seasonalPeriod * 2) {
    return createEmptyResult(series, times)
  }

  let trend = Array.from({ length: n }, () => 0)
  let seasonal = Array.from({ length: n }, () => 0)
  const detrended = Array.from({ length: n }, () => 0)
  const remainder = Array.from({ length: n }, () => 0)

  const seasonalLength = Math.round(seasonalSpan * n)
  const trendLength = Math.round(trendSpan * n)

  const detrendedValues = [...values]

  for (let iter = 0; iter < 2; iter++) {
    for (let i = 0; i < n; i++) {
      detrended[i] = detrendedValues[i] - trend[i]
    }

    seasonal = extractSeasonal(detrended, seasonalPeriod, seasonalLength)

    const deseasonalized: number[] = Array.from({ length: n }, () => 0)
    for (let i = 0; i < n; i++) {
      deseasonalized[i] = detrendedValues[i] - seasonal[i]
    }

    trend = smoothTrend(deseasonalized, trendLength)
  }

  for (let i = 0; i < n; i++) {
    remainder[i] = values[i] - trend[i] - seasonal[i]
  }

  return {
    original: values,
    trend,
    seasonal,
    remainder,
    lakeId: series.id,
    label: series.label,
    lat: series.lat,
    lon: series.lon,
    time: times,
  }
}

function extractSeasonal(detrended: number[], period: number, windowLen: number): number[] {
  const n = detrended.length
  const seasonal = Array.from({ length: n }, () => 0)
  const subseriesMeans: number[][] = Array.from({ length: period }, () => [])

  for (let i = 0; i < n; i++) {
    const phase = i % period
    subseriesMeans[phase].push(detrended[i])
  }

  const seasonalPattern = Array.from({ length: period }, () => 0)
  for (let p = 0; p < period; p++) {
    if (subseriesMeans[p].length > 0) {
      seasonalPattern[p] = mean(subseriesMeans[p])
    }
  }

  for (let i = 0; i < n; i++) {
    const phase = i % period
    seasonal[i] = seasonalPattern[phase]
  }

  return lowessSmooth(seasonal, Math.min(windowLen, Math.floor(n / 4)))
}

function smoothTrend(deseasonalized: number[], windowLen: number): number[] {
  return lowessSmooth(deseasonalized, windowLen)
}

function lowessSmooth(y: number[], windowLen: number): number[] {
  const n = y.length
  const smoothed = Array.from({ length: n }, () => 0)
  const halfWindow = Math.max(1, Math.floor(windowLen / 2))

  for (let i = 0; i < n; i++) {
    let sumWeights = 0
    let sumWeightedY = 0

    const start = Math.max(0, i - halfWindow)
    const end = Math.min(n - 1, i + halfWindow)

    for (let j = start; j <= end; j++) {
      const distance = Math.abs(i - j) / (halfWindow + 1)
      const weight = (1 - distance ** 3) ** 3
      sumWeights += weight
      sumWeightedY += weight * y[j]
    }

    smoothed[i] = sumWeights > 0
      ? sumWeightedY / sumWeights
      : y[i]
  }

  return smoothed
}

function mean(arr: number[]): number {
  if (arr.length === 0)
    return 0
  return arr.reduce((sum, val) => sum + val, 0) / arr.length
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
