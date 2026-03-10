import type { TimeSeries } from '~/types/mutation'
import type { Break, Segment } from '~/types/segments'

function normalizeSeries(raw: TimeSeries | undefined): TimeSeries | null {
  if (!raw || typeof raw !== 'object')
    return null
  const id = typeof raw.id === 'string' && raw.id.length ? raw.id : (typeof raw.label === 'string' ? raw.label : '')
  const label = typeof raw.label === 'string' && raw.label.length ? raw.label : id
  if (!id && !label)
    return null
  const lat = Number(raw.lat)
  const lon = Number(raw.lon)
  const pointsSrc = Array.isArray(raw.points) ? raw.points : []
  const points = pointsSrc.map((p) => {
    const t = new Date(p?.t as any)
    const v = Number(p?.v)
    if (Number.isNaN(t.getTime()) || Number.isNaN(v))
      return null
    return { t, v }
  }).filter((p): p is { t: Date, v: number } => Boolean(p)).sort((a, b) => a.t.getTime() - b.t.getTime())
  if (!points.length)
    return null
  return {
    id: id || label,
    label: label || id || 'series',
    lat: Number.isFinite(lat) ? lat : Number.NaN,
    lon: Number.isFinite(lon) ? lon : Number.NaN,
    points,
  }
}

function mean(arr: number[]): number {
  if (!arr.length)
    return 0
  return arr.reduce((sum, v) => sum + v, 0) / arr.length
}

function variance(arr: number[]): number {
  if (arr.length < 2)
    return 0
  const m = mean(arr)
  return arr.reduce((sum, v) => sum + (v - m) * (v - m), 0) / (arr.length - 1)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function betacf(a: number, b: number, x: number): number {
  // Continued fraction for incomplete beta (Lentz's method)
  const maxIter = 200
  const eps = 3e-7
  const qab = a + b
  const qap = a + 1
  const qam = a - 1
  let c = 1
  let d = 1 - (qab * x / qap)
  if (Math.abs(d) < 1e-30)
    d = 1e-30
  d = 1 / d
  let h = d
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30)
      d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30)
      c = 1e-30
    d = 1 / d
    h *= d * c

    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2))
    d = 1 + aa * d
    if (Math.abs(d) < 1e-30)
      d = 1e-30
    c = 1 + aa / c
    if (Math.abs(c) < 1e-30)
      c = 1e-30
    d = 1 / d
    const del = d * c
    h *= del
    if (Math.abs(del - 1) < eps)
      break
  }
  return h
}

function betai(a: number, b: number, x: number): number {
  if (x < 0 || x > 1)
    return Number.NaN
  if (x === 0 || x === 1)
    return x
  // Lanczos log-gamma approximation
  const logGamma = (v: number) => {
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
    let ser = 1.000000000190015
    for (let j = 0; j < cof.length; j++) {
      x0 += 1
      ser += cof[j] / x0
    }
    return -tmp + Math.log(2.506628274631 * ser)
  }
  const lgA = logGamma(a)
  const lgB = logGamma(b)
  const lgAB = logGamma(a + b)
  const btVal = Math.exp((a * Math.log(x)) + (b * Math.log(1 - x)) - lgAB + lgA + lgB)

  const useDirect = x < (a + 1) / (a + b + 2)
  if (useDirect)
    return btVal * betacf(a, b, x) / a
  return 1 - (btVal * betacf(b, a, 1 - x)) / b
}

function studentTCdf(t: number, df: number): number {
  if (df <= 0 || Number.isNaN(df))
    return Number.NaN
  const x = df / (df + t * t)
  const a = df / 2
  const b = 0.5
  const ib = betai(a, b, x)
  if (Number.isNaN(ib))
    return Number.NaN
  if (t >= 0)
    return 1 - 0.5 * ib
  return 0.5 * ib
}

function twoTailedPFromT(t: number, df: number): number {
  const z = Math.abs(t)
  const cdf = studentTCdf(z, df)
  if (!Number.isFinite(cdf))
    return 1
  const p = 2 * (1 - cdf)
  return Math.max(0, Math.min(1, p))
}

// function erf(x: number): number {
//   // Abramowitz and Stegun approximation
//   const sign = x >= 0 ? 1 : -1
//   const a1 = 0.254829592
//   const a2 = -0.284496736
//   const a3 = 1.421413741
//   const a4 = -1.453152027
//   const a5 = 1.061405429
//   const p = 0.3275911
//   const absX = Math.abs(x)
//   const t = 1 / (1 + p * absX)
//   const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absX * absX)
//   return sign * y
// }

// function normalCdf(x: number): number {
//   return 0.5 * (1 + erf(x / Math.SQRT2))
// }

type Mat2 = [[number, number], [number, number]]

function matMul2(a: Mat2, b: Mat2): Mat2 {
  return [
    [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
    [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
  ]
}

function fCdf(x: number, d1: number, d2: number): number {
  if (x < 0 || d1 <= 0 || d2 <= 0)
    return Number.NaN
  const num = d1 * x
  const denom = num + d2
  if (denom === 0)
    return Number.NaN
  const z = num / denom
  return betai(d1 / 2, d2 / 2, z)
}

function sequentialXs(len: number): number[] {
  return Array.from({ length: len }, (_v, i) => i)
}

function olsStats(values: number[], xs: number[]): { slope: number, intercept: number, residuals: number[], sse: number, xSum: number, xxSum: number } {
  const n = values.length
  if (!n || n !== xs.length)
    return { slope: 0, intercept: 0, residuals: [], sse: 0, xSum: 0, xxSum: 0 }

  const xMean = mean(xs)
  const yMean = mean(values)
  let num = 0
  let den = 0
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - xMean
    num += dx * (values[i] - yMean)
    den += dx * dx
  }
  const slope = den === 0 ? 0 : num / den
  const intercept = yMean - slope * xMean

  const residuals: number[] = []
  let sse = 0
  let xSum = 0
  let xxSum = 0
  for (let i = 0; i < n; i++) {
    const x = xs[i]
    const res = values[i] - (intercept + slope * x)
    residuals.push(res)
    sse += res * res
    xSum += x
    xxSum += x * x
  }

  return { slope, intercept, residuals, sse, xSum, xxSum }
}

function slopeWithP(values: number[], xs: number[]): { slope: number, p: number, intercept: number, sse: number, residuals: number[] } {
  const n = values.length
  if (n < 2)
    return { slope: 0, p: 1, intercept: 0, sse: 0, residuals: [] }

  const { slope, intercept, residuals, sse, xSum, xxSum } = olsStats(values, xs)
  const xtx: Mat2 = [[n, xSum], [xSum, xxSum]]
  const det = xtx[0][0] * xtx[1][1] - xtx[0][1] * xtx[1][0]
  if (!Number.isFinite(det) || det === 0)
    return { slope, p: 1, intercept, sse, residuals }

  const inv: Mat2 = [
    [xtx[1][1] / det, -xtx[0][1] / det],
    [-xtx[1][0] / det, xtx[0][0] / det],
  ]

  const zList = residuals.map((res, idx) => [res, res * xs[idx]] as [number, number])
  let S: Mat2 = [[0, 0], [0, 0]]
  for (const [z0, z1] of zList) {
    S = [
      [S[0][0] + z0 * z0, S[0][1] + z0 * z1],
      [S[1][0] + z1 * z0, S[1][1] + z1 * z1],
    ]
  }

  const maxLag = Math.min(n - 1, Math.max(1, Math.floor(Math.sqrt(n))))
  for (let lag = 1; lag <= maxLag; lag++) {
    let g00 = 0
    let g01 = 0
    let g10 = 0
    let g11 = 0
    for (let t = lag; t < n; t++) {
      const [z0t, z1t] = zList[t]
      const [z0l, z1l] = zList[t - lag]
      g00 += z0t * z0l
      g01 += z0t * z1l
      g10 += z1t * z0l
      g11 += z1t * z1l
    }
    const weight = 1 - (lag / (maxLag + 1))
    S = [
      [S[0][0] + weight * (g00 + g00), S[0][1] + weight * (g01 + g10)],
      [S[1][0] + weight * (g10 + g01), S[1][1] + weight * (g11 + g11)],
    ]
  }

  const cov = matMul2(matMul2(inv, S), inv)
  const slopeVar = cov[1][1]
  const slopeSe = slopeVar > 0 ? Math.sqrt(slopeVar) : Number.NaN
  const tStat = slopeSe === 0 || Number.isNaN(slopeSe) ? Number.NaN : slope / slopeSe
  const df = n - 2
  const p = !Number.isFinite(tStat) || df <= 0 ? 1 : twoTailedPFromT(tStat, df)
  return { slope, p: clamp01(p), intercept, sse, residuals }
}

function cohenD(sampleA: number[], sampleB: number[]): number {
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

function chowTest(sampleA: number[], sampleB: number[]): { p: number, cohenD: number } {
  const n1 = sampleA.length
  const n2 = sampleB.length
  const k = 2 // intercept + slope
  if (n1 < k || n2 < k)
    return { p: 1, cohenD: Number.NaN }

  const xs1 = sequentialXs(n1)
  const xs2 = sequentialXs(n2)
  const xsCombined = sequentialXs(n1 + n2)
  const { sse: sse1 } = olsStats(sampleA, xs1)
  const { sse: sse2 } = olsStats(sampleB, xs2)
  const { sse: sseCombined } = olsStats([...sampleA, ...sampleB], xsCombined)

  const num = sseCombined - (sse1 + sse2)
  const den = sse1 + sse2
  const df1 = k
  const df2 = n1 + n2 - (2 * k)
  if (df2 <= 0 || !Number.isFinite(num) || !Number.isFinite(den) || den <= 0)
    return { p: 1, cohenD: cohenD(sampleA, sampleB) }

  const fStat = num / df1 / (den / df2)
  const p = Number.isFinite(fStat) && fStat > 0 ? 1 - fCdf(fStat, df1, df2) : 1
  return { p: clamp01(p), cohenD: cohenD(sampleA, sampleB) }
}

function uniqueSortedYears(breakYears: number[]): number[] {
  return Array.from(new Set(breakYears.filter(y => Number.isFinite(y))))
    .map(y => Math.floor(y))
    .sort((a, b) => a - b)
}

function findBreakIndices(points: { t: Date, v: number }[], breakYears: number[]): number[] {
  const years = breakYears
  const indices: number[] = []
  let lastIdx = -1
  for (const by of years) {
    const idx = points.findIndex((p, i) => i > lastIdx && p.t.getFullYear() >= by)
    if (idx >= 0) {
      indices.push(idx)
      lastIdx = idx
    }
  }
  return indices
}

function buildSegmentsForSeries(series: TimeSeries, breakYears: number[]): { segments: Segment[], breaks: Break[] } {
  const points = series.points.slice().sort((a, b) => a.t.getTime() - b.t.getTime())
  if (!points.length)
    return { segments: [], breaks: [] }

  const sortedBreakYears = uniqueSortedYears(breakYears)
  const breakIndices = findBreakIndices(points, sortedBreakYears)

  const segments: Segment[] = []
  const breaks: Break[] = []

  let startIdx = 0
  let segmentIndex = 0
  for (const brIdx of breakIndices) {
    if (brIdx < startIdx)
      continue
    const segPoints = points.slice(startIdx, brIdx + 1)
    if (!segPoints.length)
      continue
    const values = segPoints.map(p => p.v)
    const xs = segPoints.map((_p, idx) => idx)
    const { slope, p } = slopeWithP(values, xs)
    const startYear = segPoints[0]!.t.getFullYear()
    const endYear = segPoints[segPoints.length - 1]!.t.getFullYear()
    segments.push({
      lakeId: series.id,
      segmentIndex,
      startYear,
      endYear,
      startYearIndex: startIdx,
      endYearIndex: startIdx + segPoints.length - 1,
      avg: mean(values),
      slope,
      var: variance(values),
      p,
    })
    segmentIndex += 1
    // include the break point in the next segment as well
    startIdx = brIdx
  }

  // tail segment
  if (startIdx < points.length) {
    const segPoints = points.slice(startIdx)
    const values = segPoints.map(p => p.v)
    const xs = segPoints.map((_p, idx) => idx)
    const { slope, p } = slopeWithP(values, xs)
    const startYear = segPoints[0]!.t.getFullYear()
    const endYear = segPoints[segPoints.length - 1]!.t.getFullYear()
    segments.push({
      lakeId: series.id,
      segmentIndex,
      startYear,
      endYear,
      startYearIndex: startIdx,
      endYearIndex: startIdx + segPoints.length - 1,
      avg: mean(values),
      slope,
      var: variance(values),
      p,
    })
  }

  for (let i = 0; i < breakIndices.length; i++) {
    const prevSeg = segments[i]
    const nextSeg = segments[i + 1]
    if (!prevSeg || !nextSeg)
      continue
    const idx = breakIndices[i]
    const bkYear = points[idx]?.t.getFullYear()
    const prevValues = points.slice(prevSeg.startYearIndex, prevSeg.endYearIndex + 1).map(p => p.v)
    const nextValues = points.slice(nextSeg.startYearIndex, nextSeg.endYearIndex + 1).map(p => p.v)
    const { p, cohenD } = chowTest(prevValues, nextValues)

    breaks.push({
      lakeId: series.id,
      breakIndex: i,
      year: bkYear ?? nextSeg.startYear,
      yearIndex: idx,
      deltaAvg: nextSeg.avg - prevSeg.avg,
      deltaSlope: nextSeg.slope - prevSeg.slope,
      deltaVar: nextSeg.var - prevSeg.var,
      p,
      cohenD,
    })
  }

  return { segments, breaks }
}

export default defineEventHandler(async (event) => {
  let body: {
    processedSeries?: TimeSeries[]
    rawSeries?: TimeSeries[]
    breakYears?: number[]
  }
  try {
    body = await readBody(event)
  }
  catch (err) {
    setResponseStatus(event, 400)
    return {
      segments: [],
      breaks: [],
      error: 'Failed to parse request body',
      detail: String(err),
    }
  }

  if (!body || typeof body !== 'object') {
    setResponseStatus(event, 400)
    return {
      segments: [],
      breaks: [],
      error: 'Request body must be an object',
    }
  }

  const processedInput = Array.isArray(body.processedSeries) ? body.processedSeries : []
  const rawInput = Array.isArray(body.rawSeries) ? body.rawSeries : []
  const breakYearsRaw = Array.isArray(body.breakYears) ? body.breakYears : []
  const breakYears = uniqueSortedYears(breakYearsRaw.map(y => Number(y)))

  if (!processedInput.length && !rawInput.length) {
    setResponseStatus(event, 400)
    return {
      segments: [],
      breaks: [],
      error: 'processedSeries or rawSeries is required',
    }
  }
  if (!breakYears.length) {
    setResponseStatus(event, 400)
    return {
      segments: [],
      breaks: [],
      error: 'breakYears is required and must be a non-empty array of numbers',
    }
  }

  const normalizedRawById = new Map<string, TimeSeries>()
  for (const raw of rawInput) {
    const normalized = normalizeSeries(raw)
    if (normalized)
      normalizedRawById.set(normalized.id, normalized)
  }

  const normalizedProcessed: TimeSeries[] = []
  for (const raw of processedInput) {
    const normalized = normalizeSeries(raw)
    if (normalized)
      normalizedProcessed.push(normalized)
  }

  const segmentsOut: Segment[] = []
  const breaksOut: Break[] = []

  const seriesToUse = normalizedProcessed.length ? normalizedProcessed : Array.from(normalizedRawById.values())

  for (const series of seriesToUse) {
    const baseSeries = normalizedRawById.get(series.id) ?? series
    const { segments, breaks } = buildSegmentsForSeries(baseSeries, breakYears)
    segmentsOut.push(...segments)
    breaksOut.push(...breaks)
  }

  return {
    segments: segmentsOut,
    breaks: breaksOut,
    error: null,
  }
})
