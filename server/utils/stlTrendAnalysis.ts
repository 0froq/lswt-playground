import type {
  SeasonalAmplitudeTrend,
  STLTrendBreak,
  STLTrendSegment,
} from '~/types/stl-trend'

type OLSResult = {
  slope: number
  intercept: number
  sse: number
  denominator: number
}

type BreakPoint = {
  year: number
  index: number
}

const BETA_EPS = 1e-30

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function logGamma(v: number): number {
  const cof = [
    76.1800917294715,
    -86.5053203294168,
    24.014098240831,
    -1.23173957245015,
    0.001208650973866,
    -0.000005395239384953,
  ]
  let x0 = v - 1
  let tmp = x0 + 5.5
  tmp -= (x0 + 0.5) * Math.log(tmp)
  let series = 1.000000000190015
  for (let i = 0; i < cof.length; i++) {
    x0 += 1
    series += cof[i]! / x0
  }
  return -tmp + Math.log(2.506628274631 * series)
}

function betacf(a: number, b: number, x: number): number {
  const maxIter = 200
  const eps = 3e-7
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x / qap)

  if (Math.abs(d) < BETA_EPS)
    d = BETA_EPS

  d = 1 / d
  let h = d

  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))

    d = 1 + aa * d
    if (Math.abs(d) < BETA_EPS)
      d = BETA_EPS
    c = 1 + aa / c
    if (Math.abs(c) < BETA_EPS)
      c = BETA_EPS
    d = 1 / d
    h *= d * c

    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < BETA_EPS)
      d = BETA_EPS
    c = 1 + aa / c
    if (Math.abs(c) < BETA_EPS)
      c = BETA_EPS
    d = 1 / d
    const delta = d * c
    h *= delta

    if (Math.abs(delta - 1) < eps)
      break
  }

  return h
}

function betai(a: number, b: number, x: number): number {
  if (x < 0 || x > 1)
    return Number.NaN
  if (x === 0 || x === 1)
    return x

  const bt = Math.exp(
    a * Math.log(x)
    + b * Math.log(1 - x)
    + logGamma(a + b)
    - logGamma(a)
    - logGamma(b),
  )

  if (x < (a + 1) / (a + b + 2))
    return bt * betacf(a, b, x) / a

  return 1 - (bt * betacf(b, a, 1 - x)) / b
}

function studentTCdf(t: number, df: number): number {
  if (df <= 0 || Number.isNaN(df))
    return Number.NaN

  const x = df / (df + t * t)
  const ib = betai(df / 2, 0.5, x)

  if (!Number.isFinite(ib))
    return Number.NaN

  if (t >= 0)
    return 1 - 0.5 * ib

  return 0.5 * ib
}

function twoTailedPFromT(t: number, df: number): number {
  const cdf = studentTCdf(Math.abs(t), df)
  if (!Number.isFinite(cdf))
    return 1
  return clamp01(2 * (1 - cdf))
}

function fCdf(x: number, d1: number, d2: number): number {
  if (x < 0 || d1 <= 0 || d2 <= 0)
    return Number.NaN

  const numerator = d1 * x
  const denominator = numerator + d2
  if (denominator === 0)
    return Number.NaN

  const z = numerator / denominator
  return betai(d1 / 2, d2 / 2, z)
}

function uniqueSortedYears(breakYears: number[]): number[] {
  return Array.from(new Set(breakYears
    .filter(y => Number.isFinite(y))
    .map(y => Math.floor(y)),
  )).sort((a, b) => a - b)
}

function findBreakPoints(time: Date[], breakYears: number[]): BreakPoint[] {
  const points: BreakPoint[] = []
  const years = uniqueSortedYears(breakYears)

  for (const year of years) {
    const index = time.findIndex(t => t.getFullYear() === year)
    if (index <= 0 || index >= time.length)
      continue
    points.push({ year, index })
  }

  return points
    .sort((a, b) => a.index - b.index)
    .filter((point, idx, arr) => idx === 0 || point.index !== arr[idx - 1]!.index)
}

function sequentialXs(length: number): number[] {
  return Array.from({ length }, (_v, i) => i)
}

function olsWithXs(values: number[], xs: number[]): OLSResult {
  const n = values.length
  if (!n || n !== xs.length)
    return { slope: 0, intercept: 0, sse: 0, denominator: 0 }

  const xMean = mean(xs)
  const yMean = mean(values)

  let numerator = 0
  let denominator = 0
  for (let i = 0; i < n; i++) {
    const dx = (xs[i] ?? 0) - xMean
    numerator += dx * ((values[i] ?? 0) - yMean)
    denominator += dx * dx
  }

  const slope = denominator === 0 ? 0 : numerator / denominator
  const intercept = yMean - slope * xMean

  let sse = 0
  for (let i = 0; i < n; i++) {
    const x = xs[i] ?? 0
    const residual = (values[i] ?? 0) - (intercept + slope * x)
    sse += residual * residual
  }

  return { slope, intercept, sse, denominator }
}

export function mean(arr: number[]): number {
  if (!arr.length)
    return 0
  return arr.reduce((sum, value) => sum + value, 0) / arr.length
}

export function variance(arr: number[]): number {
  if (arr.length < 2)
    return 0

  const avg = mean(arr)
  const sumSquares = arr.reduce((sum, value) => {
    const delta = value - avg
    return sum + delta * delta
  }, 0)

  return sumSquares / (arr.length - 1)
}

export function olsSlope(values: number[]): { slope: number, intercept: number, p: number } {
  const n = values.length
  if (n < 2)
    return { slope: 0, intercept: mean(values), p: 1 }

  const xs = sequentialXs(n)
  const { slope, intercept, sse, denominator } = olsWithXs(values, xs)

  const df = n - 2
  if (df <= 0 || denominator === 0)
    return { slope, intercept, p: 1 }

  const sigma2 = sse / df
  const slopeSe = sigma2 > 0 ? Math.sqrt(sigma2 / denominator) : 0

  if (slopeSe === 0)
    return { slope, intercept, p: slope === 0 ? 1 : 0 }

  const tValue = slope / slopeSe
  const p = twoTailedPFromT(tValue, df)

  return { slope, intercept, p }
}

export function cohenD(sampleA: number[], sampleB: number[]): number {
  const n1 = sampleA.length
  const n2 = sampleB.length
  if (n1 < 2 || n2 < 2)
    return Number.NaN

  const m1 = mean(sampleA)
  const m2 = mean(sampleB)
  const v1 = variance(sampleA)
  const v2 = variance(sampleB)

  const pooled = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2)
  if (!Number.isFinite(pooled) || pooled <= 0)
    return Number.NaN

  return (m2 - m1) / Math.sqrt(pooled)
}

export function chowTest(sampleA: number[], sampleB: number[]): { p: number, cohenD: number } {
  const n1 = sampleA.length
  const n2 = sampleB.length
  const k = 2

  if (n1 <= k || n2 <= k)
    return { p: 1, cohenD: cohenD(sampleA, sampleB) }

  const combined = [...sampleA, ...sampleB]
  const { sse: sseCombined } = olsWithXs(combined, sequentialXs(combined.length))
  const { sse: sse1 } = olsWithXs(sampleA, sequentialXs(n1))
  const { sse: sse2 } = olsWithXs(sampleB, sequentialXs(n2))

  const df1 = k
  const df2 = n1 + n2 - 2 * k
  const sseSplit = sse1 + sse2

  if (df2 <= 0 || !Number.isFinite(sseSplit) || sseSplit <= 0)
    return { p: 1, cohenD: cohenD(sampleA, sampleB) }

  const numerator = (sseCombined - sseSplit) / df1
  const denominator = sseSplit / df2
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator <= 0)
    return { p: 1, cohenD: cohenD(sampleA, sampleB) }

  const fValue = numerator / denominator
  const p = Number.isFinite(fValue) && fValue > 0
    ? 1 - fCdf(fValue, df1, df2)
    : 1

  return {
    p: clamp01(p),
    cohenD: cohenD(sampleA, sampleB),
  }
}

export function analyzeSTLTrendComponent(
  trend: number[],
  seasonal: number[],
  time: Date[],
  breakYears: number[],
): {
    segments: STLTrendSegment[]
    breaks: STLTrendBreak[]
    seasonalAmplitude: SeasonalAmplitudeTrend
  } {
  const n = Math.min(trend.length, seasonal.length, time.length)
  const normalizedTrend = trend.slice(0, n)
  const normalizedSeasonal = seasonal.slice(0, n)
  const normalizedTime = time.slice(0, n)

  const breakPoints = findBreakPoints(normalizedTime, breakYears)
  const boundaries = [0, ...breakPoints.map(bp => bp.index), n]

  const segments: STLTrendSegment[] = []

  for (let i = 0; i < boundaries.length - 1; i++) {
    const start = boundaries[i] ?? 0
    const endExclusive = boundaries[i + 1] ?? n
    if (endExclusive <= start)
      continue

    const end = endExclusive - 1
    const segmentValues = normalizedTrend.slice(start, endExclusive)
    const regression = olsSlope(segmentValues)
    const startDate = normalizedTime[start]
    const endDate = normalizedTime[end]

    if (!startDate || !endDate)
      continue

    segments.push({
      lakeId: '',
      label: '',
      segmentIndex: segments.length,
      startYear: startDate.getFullYear(),
      endYear: endDate.getFullYear(),
      startMonthIndex: start,
      endMonthIndex: end,
      pointCount: segmentValues.length,
      mean: mean(segmentValues),
      slope: regression.slope * 12,
      variance: variance(segmentValues),
      p: regression.p,
    })
  }

  const breaks: STLTrendBreak[] = []
  for (let i = 0; i < breakPoints.length; i++) {
    const prevSegment = segments[i]
    const nextSegment = segments[i + 1]
    const breakPoint = breakPoints[i]

    if (!prevSegment || !nextSegment || !breakPoint)
      continue

    const sampleA = normalizedTrend.slice(
      prevSegment.startMonthIndex,
      prevSegment.endMonthIndex + 1,
    )
    const sampleB = normalizedTrend.slice(
      nextSegment.startMonthIndex,
      nextSegment.endMonthIndex + 1,
    )
    const test = chowTest(sampleA, sampleB)

    breaks.push({
      lakeId: '',
      label: '',
      breakIndex: breaks.length,
      breakYear: breakPoint.year,
      breakMonthIndex: breakPoint.index,
      deltaMean: nextSegment.mean - prevSegment.mean,
      deltaSlope: nextSegment.slope - prevSegment.slope,
      deltaVariance: nextSegment.variance - prevSegment.variance,
      p: test.p,
      cohenD: test.cohenD,
    })
  }

  const amplitudeByYear = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const ts = normalizedTime[i]
    const value = normalizedSeasonal[i]
    if (!ts || value === undefined)
      continue

    const year = ts.getFullYear()
    const values = amplitudeByYear.get(year)
    if (values) {
      values.push(value)
    }
    else {
      amplitudeByYear.set(year, [value])
    }
  }

  const annualAmplitudes = Array.from(amplitudeByYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, values]) => {
      const min = Math.min(...values)
      const max = Math.max(...values)
      return {
        year,
        amplitude: max - min,
      }
    })

  const amplitudeSeries = annualAmplitudes.map(item => item.amplitude)
  const amplitudeRegression = olsSlope(amplitudeSeries)
  const firstAmplitude = annualAmplitudes[0]?.amplitude ?? 0
  const lastAmplitude = annualAmplitudes.length
    ? annualAmplitudes[annualAmplitudes.length - 1]!.amplitude
    : 0

  const seasonalAmplitude: SeasonalAmplitudeTrend = {
    lakeId: '',
    label: '',
    annualAmplitudes,
    amplitudeSlope: amplitudeRegression.slope,
    firstAmplitude,
    lastAmplitude,
  }

  return {
    segments,
    breaks,
    seasonalAmplitude,
  }
}
