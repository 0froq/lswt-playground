export interface STLResult {
  original: number[]
  trend: number[]
  seasonal: number[]
  remainder: number[]
  lakeId: string
  label: string
  lat: number
  lon: number
  time: Date[]
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

export interface STLParams {
  /** Seasonal period (e.g., 12 for monthly data with annual seasonality) */
  seasonalPeriod: number
  /** LOESS span for seasonal smoothing (0-1) */
  seasonalSpan: number
  /** LOESS span for trend smoothing (0-1) */
  trendSpan: number
  /** Number of inner iterations */
  innerIterations: number
  /** Number of outer iterations (for robustness) */
  outerIterations: number
}

export interface STLSeries {
  id: string
  label: string
  lat: number
  lon: number
  points: { t: Date, v: number }[]
}
