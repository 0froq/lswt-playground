import type { TimeSeries } from '~/types/mutation'
import type { SlidingMetricKey, SlidingWindowPoint, SlidingWindowSeriesResult } from '~/types/sliding'

/**
 * Safely get year from a date value (handles both Date objects and ISO strings)
 */
function getYear(t: Date | string): number {
  if (typeof t === 'string') {
    return new Date(t).getFullYear()
  }
  return t.getFullYear()
}

/**
 * Compute mean of an array of numbers
 */
export function computeMean(values: number[]): number {
  if (!values.length)
    return Number.NaN
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/**
 * Compute standard deviation (sample std, divide by n-1)
 */
export function computeStd(values: number[]): number {
  if (values.length < 2)
    return Number.NaN
  const mean = computeMean(values)
  const squaredDiffs = values.map(v => (v - mean) ** 2)
  const variance = squaredDiffs.reduce((sum, v) => sum + v, 0) / (values.length - 1)
  return Math.sqrt(variance)
}

/**
 * Compute OLS (Ordinary Least Squares) linear regression slope
 * x: array of years, y: array of values
 * Returns slope in units of y per year
 */
export function computeOlsSlope(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length < 2)
    return Number.NaN

  const n = x.length
  const meanX = computeMean(x)
  const meanY = computeMean(y)

  let numerator = 0
  let denominator = 0

  for (let i = 0; i < n; i++) {
    const xi = x[i]!
    const yi = y[i]!
    const diffX = xi - meanX
    const diffY = yi - meanY
    numerator += diffX * diffY
    denominator += diffX * diffX
  }

  if (denominator === 0)
    return 0
  return numerator / denominator
}

/**
 * Compute sliding window series for a single time series
 * Window includes current year and previous (windowSize-1) years
 * For example, for 2017 with windowSize=3: includes 2015, 2016, 2017
 */
export function computeSlidingWindowSeries(
  series: TimeSeries,
  windowSize: number,
  metric: SlidingMetricKey,
): SlidingWindowSeriesResult {
  const points: SlidingWindowPoint[] = []

  // Iterate from windowSize-1 to end (need enough previous points)
  for (let i = windowSize - 1; i < series.points.length; i++) {
    const centerPoint = series.points[i]!
    const centerYear = getYear(centerPoint.t)

    // Extract window values: current year and (windowSize-1) previous years
    const windowValues: number[] = []
    const windowYears: number[] = []

    for (let j = i - windowSize + 1; j <= i; j++) {
      const point = series.points[j]!
      windowValues.push(point.v)
      windowYears.push(getYear(point.t))
    }

    // Compute metric
    let value: number
    switch (metric) {
      case 'mean':
        value = computeMean(windowValues)
        break
      case 'std':
        value = computeStd(windowValues)
        break
      case 'slope':
        value = computeOlsSlope(windowYears, windowValues)
        break
      default:
        value = Number.NaN
    }

    if (Number.isFinite(value)) {
      points.push({ year: centerYear, value })
    }
  }

  return {
    lakeId: series.id,
    windowSize: windowSize as 3 | 5 | 7 | 9 | 11 | 13 | 15,
    metric,
    points,
  }
}

/**
 * Compute global mean series from all lakes
 * First computes per-year average across all lakes, then applies sliding windows
 */
export function computeGlobalMeanSeries(
  allSeries: TimeSeries[],
  windowSizes: number[],
  metrics: SlidingMetricKey[],
): SlidingWindowSeriesResult[] {
  if (!allSeries.length)
    return []

  // Collect all years
  const yearSet = new Set<number>()
  allSeries.forEach((series) => {
    series.points.forEach((p) => {
      yearSet.add(getYear(p.t))
    })
  })
  const years = Array.from(yearSet).sort((a, b) => a - b)

  // Compute per-year global mean
  const globalMeanPoints = years.map((year) => {
    const values: number[] = []
    allSeries.forEach((series) => {
      const point = series.points.find(p => getYear(p.t) === year)
      if (point && Number.isFinite(point.v)) {
        values.push(point.v)
      }
    })
    return {
      t: new Date(year, 0, 1),
      v: computeMean(values),
    }
  }).filter(p => Number.isFinite(p.v))

  // Create a synthetic TimeSeries for global mean
  const globalSeries: TimeSeries = {
    id: '__global__',
    lat: 0,
    lon: 0,
    label: 'Global Mean',
    points: globalMeanPoints,
  }

  // Compute sliding windows for global series
  const results: SlidingWindowSeriesResult[] = []
  for (const windowSize of windowSizes) {
    for (const metric of metrics) {
      results.push(computeSlidingWindowSeries(globalSeries, windowSize, metric))
    }
  }

  return results
}

/**
 * Compute sliding window analysis for multiple lakes
 */
export function computeSlidingWindowAnalysis(
  allSeries: TimeSeries[],
  windowSizes: number[],
  metrics: SlidingMetricKey[],
): { perLakeFeatures: SlidingWindowSeriesResult[], globalMeanFeatures: SlidingWindowSeriesResult[], yearCandidates: number[] } {
  // Compute per-lake features
  const perLakeFeatures: SlidingWindowSeriesResult[] = []
  for (const series of allSeries) {
    for (const windowSize of windowSizes) {
      for (const metric of metrics) {
        perLakeFeatures.push(computeSlidingWindowSeries(series, windowSize, metric))
      }
    }
  }

  // Compute global mean features
  const globalMeanFeatures = computeGlobalMeanSeries(allSeries, windowSizes, metrics)

  // Collect year candidates from all results
  const yearSet = new Set<number>()
  perLakeFeatures.forEach((result) => {
    result.points.forEach((p) => {
      yearSet.add(p.year)
    })
  })
  const yearCandidates = Array.from(yearSet).sort((a, b) => a - b)

  return {
    perLakeFeatures,
    globalMeanFeatures,
    yearCandidates,
  }
}
