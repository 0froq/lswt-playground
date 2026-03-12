export interface STLResult {
  /** Original time series values */
  original: number[]
  /** Trend component */
  trend: number[]
  /** Seasonal component */
  seasonal: number[]
  /** Remainder (residual) component */
  remainder: number[]
  /** Lake identifier */
  lakeId: string
  /** Lake label */
  label: string
  /** Lake latitude */
  lat: number
  /** Lake longitude */
  lon: number
  /** Time points (dates) */
  time: Date[]
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
