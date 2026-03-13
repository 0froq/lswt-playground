// @env node
// STL (Seasonal-Trend decomposition using LOESS) - Complete Implementation
// Based on Cleveland et al. (1990) and statsmodels implementation

export interface STLConfig {
  period: number
  seasonal: number
  trend: number
  lowPass: number
  seasonalDeg: number
  trendDeg: number
  lowPassDeg: number
  innerIterations: number
  outerIterations: number
  robust: boolean
  skipLowPass: boolean
  skipFinishingLoop: boolean
}

export interface STLDecomposition {
  original: number[]
  trend: number[]
  seasonal: number[]
  remainder: number[]
  weights?: number[]
  diagnostics?: {
    innerIterations: number
    outerIterations: number
    robust: boolean
    finalMAD: number
    lowWeightCount: number
    weightRange: [number, number]
  }
}

const DEFAULT_CONFIG: Partial<STLConfig> = {
  seasonalDeg: 1,
  trendDeg: 1,
  lowPassDeg: 1,
  innerIterations: 2,
  outerIterations: 0,
  robust: false,
  skipLowPass: false,
  skipFinishingLoop: false,
}

/**
 * Compute next odd integer >= n
 */
function nextOdd(n: number): number {
  const ceil = Math.ceil(n)
  return ceil % 2 === 0 ? ceil + 1 : ceil
}

/**
 * Compute default trend window length based on period and seasonal window
 * Following Cleveland et al. (1990): trend = nextOdd(1.5 * period / (1 - 1.5/seasonal))
 */
function defaultTrendWindow(period: number, seasonal: number): number {
  return nextOdd((1.5 * period) / (1 - 1.5 / seasonal))
}

/**
 * Compute default low-pass window length
 * Following Cleveland et al. (1990): lowPass = nextOdd(period)
 */
function defaultLowPassWindow(period: number): number {
  return nextOdd(period)
}

/**
 * Compute default seasonal window length
 * Following statsmodels: default = 7 (must be odd and >= 7)
 */
function defaultSeasonalWindow(): number {
  return 7
}

/**
 * Compute bisquare weight for robust estimation
 * w(u) = (1 - u^2)^2 for |u| <= 1, else 0
 */
function bisquareWeight(u: number): number {
  if (Math.abs(u) >= 1)
    return 0
  const sq = 1 - u * u
  return sq * sq
}

/**
 * Compute MAD (Median Absolute Deviation) for robust scale estimation
 */
function computeMADScale(values: number[]): number {
  if (values.length === 0)
    return 0
  const sorted = [...values].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0
  const absDeviations = values.map(v => Math.abs(v - median))
  const sortedDeviations = absDeviations.sort((a, b) => a - b)
  const mad = sortedDeviations[Math.floor(sortedDeviations.length / 2)] ?? 0
  return mad * 1.4826
}

/**
 * LOESS (Locally Estimated Scatterplot Smoothing) with polynomial regression
 *
 * @param y - Input data array
 * @param window - Window length (must be odd)
 * @param degree - Polynomial degree (0 or 1)
 * @param weights - Optional weights for robust estimation
 * @returns Smoothed array
 */
function loess(
  y: number[],
  window: number,
  degree: number,
  weights?: number[],
): number[] {
  const n = y.length
  const smoothed: number[] = new Array(n)
  const halfWindow = Math.floor(window / 2)

  for (let i = 0; i < n; i++) {
    // Determine window bounds
    const start = Math.max(0, i - halfWindow)
    const end = Math.min(n - 1, i + halfWindow)
    const windowSize = end - start + 1

    // Extract window data
    const xWindow: number[] = []
    const yWindow: number[] = []
    const wWindow: number[] = []

    for (let j = start; j <= end; j++) {
      xWindow.push(j - i)
      yWindow.push(y[j] ?? 0)
      const distance = Math.abs(j - i) / (halfWindow + 1)
      const tricube = Math.pow(1 - Math.pow(distance, 3), 3)
      wWindow.push((weights?.[j] ?? 1) * tricube)
    }

    if (degree === 0) {
      let sumW = 0
      let sumWY = 0
      for (let k = 0; k < windowSize; k++) {
        const wk = wWindow[k] ?? 0
        const yk = yWindow[k] ?? 0
        sumW += wk
        sumWY += wk * yk
      }
      smoothed[i] = sumW > 0 ? sumWY / sumW : (y[i] ?? 0)
    }
    else {
      // Weighted linear regression
      const result = weightedLinearRegression(xWindow, yWindow, wWindow)
      // Evaluate at x=0 (center of window)
      smoothed[i] = result.intercept
    }
  }

  return smoothed
}

/**
 * Weighted linear regression: y = a + b*x
 * Returns {intercept: a, slope: b}
 */
function weightedLinearRegression(
  x: number[],
  y: number[],
  w: number[],
): { intercept: number, slope: number } {
  const n = x.length

  // Compute weighted means
  let sumW = 0
  let sumWX = 0
  let sumWY = 0
  let sumWXY = 0
  let sumWX2 = 0

  for (let i = 0; i < n; i++) {
    const wi = w[i] ?? 0
    const xi = x[i] ?? 0
    const yi = y[i] ?? 0
    sumW += wi
    sumWX += wi * xi
    sumWY += wi * yi
    sumWXY += wi * xi * yi
    sumWX2 += wi * xi * xi
  }

  if (sumW === 0) {
    return { intercept: y[0] ?? 0, slope: 0 }
  }

  const meanX = sumWX / sumW
  const meanY = sumWY / sumW

  // Compute slope and intercept
  const numerator = sumWXY - sumW * meanX * meanY
  const denominator = sumWX2 - sumW * meanX * meanX

  const slope = denominator !== 0 ? numerator / denominator : 0
  const intercept = meanY - slope * meanX

  return { intercept, slope }
}

/**
 * Extract seasonal component using seasonal subseries LOESS
 *
 * This implements the proper STL seasonal extraction:
 * 1. For each phase (0 to period-1), extract the subseries at that phase
 * 2. Apply LOESS smoothing to each subseries
 * 3. Apply low-pass filter to remove trend contamination
 */
function extractSeasonalSTL(
  detrended: number[],
  period: number,
  seasonalWindow: number,
  lowPassWindow: number,
  seasonalDeg: number,
  lowPassDeg: number,
  skipLowPass: boolean,
  weights?: number[],
): number[] {
  const n = detrended.length
  const seasonal: number[] = new Array(n).fill(0)

  for (let phase = 0; phase < period; phase++) {
    const subseriesIndices: number[] = []
    const subseriesValues: number[] = []
    const subseriesWeights: number[] = []

    for (let i = phase; i < n; i += period) {
      subseriesIndices.push(i)
      subseriesValues.push(detrended[i] ?? 0)
      subseriesWeights.push(weights?.[i] ?? 1)
    }

    if (subseriesValues.length === 0)
      continue

    const localY = subseriesValues
    const localWeights = subseriesWeights
    const subseriesWindow = Math.min(seasonalWindow, localY.length)
    const smoothedSubseries = loess(localY, subseriesWindow, seasonalDeg, localWeights)

    for (let j = 0; j < subseriesIndices.length; j++) {
      const idx = subseriesIndices[j] ?? 0
      seasonal[idx] = smoothedSubseries[j] ?? 0
    }
  }

  if (!skipLowPass) {
    const lowPassResult = applyLowPass(seasonal, lowPassWindow, lowPassDeg, weights)
    for (let i = 0; i < n; i++) {
      const s = seasonal[i]!
      const lp = lowPassResult[i] ?? 0
      seasonal[i] = s - lp
    }
  }

  return seasonal
}

/**
 * Apply low-pass filter using LOESS
 */
function applyLowPass(
  data: number[],
  window: number,
  degree: number,
  weights?: number[],
): number[] {
  return loess(data, window, degree, weights)
}

/**
 * Complete STL decomposition
 *
 * @param data - Input time series data
 * @param config - STL configuration
 * @returns Decomposition result
 */
export function stl(
  data: number[],
  config: Partial<STLConfig> = {},
): STLDecomposition {
  const basePeriod = config.period ?? 12
  const baseSeasonal = config.seasonal ?? defaultSeasonalWindow()

  const cfg: STLConfig = {
    period: basePeriod,
    seasonal: baseSeasonal,
    trend: config.trend ?? defaultTrendWindow(basePeriod, baseSeasonal),
    lowPass: config.lowPass ?? defaultLowPassWindow(basePeriod),
    seasonalDeg: config.seasonalDeg ?? DEFAULT_CONFIG.seasonalDeg!,
    trendDeg: config.trendDeg ?? DEFAULT_CONFIG.trendDeg!,
    lowPassDeg: config.lowPassDeg ?? DEFAULT_CONFIG.lowPassDeg!,
    innerIterations: config.innerIterations ?? DEFAULT_CONFIG.innerIterations!,
    outerIterations: config.outerIterations ?? DEFAULT_CONFIG.outerIterations!,
    robust: config.robust ?? DEFAULT_CONFIG.robust!,
    skipLowPass: config.skipLowPass ?? DEFAULT_CONFIG.skipLowPass!,
    skipFinishingLoop: config.skipFinishingLoop ?? DEFAULT_CONFIG.skipFinishingLoop!,
  }

  // eslint-disable-next-line no-console
  console.warn(`[STL] Starting decomposition: n=${data.length}, period=${cfg.period}, seasonal=${cfg.seasonal}, trend=${cfg.trend}, inner=${cfg.innerIterations}, outer=${cfg.outerIterations}, robust=${cfg.robust}, skipLowPass=${cfg.skipLowPass}, skipFinishing=${cfg.skipFinishingLoop}`)

  const n = data.length

  // Validate inputs
  if (n < cfg.period * 2) {
    throw new Error(`Data length (${n}) must be at least 2 * period (${cfg.period * 2})`)
  }

  if (cfg.seasonal % 2 === 0 || cfg.seasonal < 7) {
    throw new Error(`Seasonal window must be odd and >= 7, got ${cfg.seasonal}`)
  }

  if (cfg.trend % 2 === 0) {
    throw new Error(`Trend window must be odd, got ${cfg.trend}`)
  }

  if (cfg.lowPass % 2 === 0 || cfg.lowPass < cfg.period) {
    throw new Error(`Low-pass window must be odd and >= period, got ${cfg.lowPass}`)
  }

  // Initialize components
  let trend = new Array(n).fill(0)
  let seasonal = new Array(n).fill(0)
  let weights = new Array(n).fill(1)

  // Outer loop for robust estimation
  for (let outerIter = 0; outerIter < cfg.outerIterations; outerIter++) {
    // Inner loop for backfitting
    for (let innerIter = 0; innerIter < cfg.innerIterations; innerIter++) {
      // Step 1: Detrend
      const detrended = data.map((v, i) => v - trend[i])

      seasonal = extractSeasonalSTL(
        detrended,
        cfg.period,
        cfg.seasonal,
        cfg.lowPass,
        cfg.seasonalDeg,
        cfg.lowPassDeg,
        cfg.skipLowPass,
        cfg.robust ? weights : undefined,
      )

      // Step 3: Deseasonalize
      const deseasonalized = data.map((v, i) => v - seasonal[i])

      // Step 4: Extract trend using LOESS
      trend = loess(
        deseasonalized,
        cfg.trend,
        cfg.trendDeg,
        cfg.robust ? weights : undefined,
      )
    }

    // Update robust weights if enabled
    if (cfg.robust && outerIter < cfg.outerIterations - 1) {
      const remainder = data.map((v, i) => v - trend[i] - seasonal[i])
      const mad = computeMADScale(remainder)

      if (mad > 0) {
        for (let i = 0; i < n; i++) {
          const u = (remainder[i] ?? 0) / (6 * mad)
          weights[i] = bisquareWeight(u)
        }
      }
    }
  }

  // Final decomposition without weight updates
  if (!cfg.skipFinishingLoop) {
    for (let innerIter = 0; innerIter < cfg.innerIterations; innerIter++) {
      const detrended = data.map((v, i) => v - trend[i])

      seasonal = extractSeasonalSTL(
        detrended,
        cfg.period,
        cfg.seasonal,
        cfg.lowPass,
        cfg.seasonalDeg,
        cfg.lowPassDeg,
        cfg.skipLowPass,
        cfg.robust ? weights : undefined,
      )

      const deseasonalized = data.map((v, i) => v - seasonal[i])

      trend = loess(
        deseasonalized,
        cfg.trend,
        cfg.trendDeg,
        cfg.robust ? weights : undefined,
      )
    }
  }

  const remainder = data.map((v, i) => v - trend[i] - seasonal[i])

  const finalMAD = computeMADScale(remainder)
  const lowWeightCount = weights.filter(w => w < 0.5).length
  const weightMin = Math.min(...weights)
  const weightMax = Math.max(...weights)

  const result: STLDecomposition = {
    original: [...data],
    trend,
    seasonal,
    remainder,
    diagnostics: {
      innerIterations: cfg.innerIterations,
      outerIterations: cfg.outerIterations,
      robust: cfg.robust,
      finalMAD,
      lowWeightCount,
      weightRange: [weightMin, weightMax],
    },
  }

  if (cfg.robust) {
    result.weights = [...weights]
  }

  // eslint-disable-next-line no-console
  console.warn(`[STL] Completed decomposition: finalMAD=${finalMAD.toFixed(4)}, lowWeightCount=${lowWeightCount}`)

  return result
}

/**
 * Create STL configuration from simplified parameters
 * This provides backward compatibility with the existing UI
 */
export function createConfigFromParams(params: {
  period: number
  seasonalWindow?: number
  trendWindow?: number
  lowPassWindow?: number
  innerIterations?: number
  outerIterations?: number
  robust?: boolean
  seasonalDeg?: number
  trendDeg?: number
  lowPassDeg?: number
  skipLowPass?: boolean
  skipFinishingLoop?: boolean
}): STLConfig {
  const seasonal = params.seasonalWindow ?? defaultSeasonalWindow()
  const trend = params.trendWindow ?? defaultTrendWindow(params.period, seasonal)
  const lowPass = params.lowPassWindow ?? defaultLowPassWindow(params.period)

  return {
    period: params.period,
    seasonal,
    trend,
    lowPass,
    seasonalDeg: params.seasonalDeg ?? 1,
    trendDeg: params.trendDeg ?? 1,
    lowPassDeg: params.lowPassDeg ?? 1,
    innerIterations: params.innerIterations ?? 2,
    outerIterations: params.outerIterations ?? 0,
    robust: params.robust ?? false,
    skipLowPass: params.skipLowPass ?? false,
    skipFinishingLoop: params.skipFinishingLoop ?? false,
  }
}

/**
 * Convert span (0-1 proportion) to window length
 * Used for backward compatibility
 */
export function spanToWindow(span: number, n: number): number {
  const windowLen = Math.round(span * n)
  // Ensure odd and at least 7
  return Math.max(7, windowLen % 2 === 0 ? windowLen + 1 : windowLen)
}

/**
 * Compute default parameters based on data characteristics
 */
export function computeDefaultParams(n: number, period: number): {
  seasonal: number
  trend: number
  lowPass: number
} {
  const seasonal = defaultSeasonalWindow()
  const trend = defaultTrendWindow(period, seasonal)
  const lowPass = defaultLowPassWindow(period)

  return { seasonal, trend, lowPass }
}
