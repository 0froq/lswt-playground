export interface STLTrendSegment {
  lakeId: string
  label: string
  segmentIndex: number
  startYear: number
  endYear: number
  startMonthIndex: number
  endMonthIndex: number
  pointCount: number
  mean: number
  slope: number
  variance: number
  p: number
}

export interface STLTrendBreak {
  lakeId: string
  label: string
  breakIndex: number
  breakYear: number
  breakMonthIndex: number
  deltaMean: number
  deltaSlope: number
  deltaVariance: number
  p: number
  cohenD: number
}

export interface SeasonalAmplitudeTrend {
  lakeId: string
  label: string
  annualAmplitudes: { year: number, amplitude: number }[]
  amplitudeSlope: number
  firstAmplitude: number
  lastAmplitude: number
}

export type STLMapMode =
  | 'seasonal-strength'
  | 'biggest-slope-period'
  | 'smallest-slope-period'
  | 'biggest-avg-period'
  | 'smallest-avg-period'
  | 'biggest-var-period'
  | 'smallest-var-period'
  | 'seasonal-amplitude-trend'
  | 'biggest-d-slope-mutation'
  | 'smallest-d-slope-mutation'
  | 'biggest-d-avg-mutation'
  | 'smallest-d-avg-mutation'

export interface STLTrendAnalysisItem {
  lakeId: string
  label: string
  lat: number
  lon: number
  segments: STLTrendSegment[]
  breaks: STLTrendBreak[]
  seasonalAmplitude: SeasonalAmplitudeTrend
  mapMetrics: {
    fastestPeriodIndex: number
    fastestPeriodSlope: number
    slowestPeriodSlope: number
    maxDeltaSlopeBreakIndex: number
    maxDeltaSlope: number
    seasonalAmplitudeSlope: number
  }
}

export interface AnalyzeSTLTrendRequest {
  stlResults: Array<{
    lakeId: string
    label: string
    lat: number
    lon: number
    trend: number[]
    seasonal: number[]
    remainder: number[]
    time: Date[]
  }>
  breakYears: number[]
}

export interface AnalyzeSTLTrendResponse {
  analysis: STLTrendAnalysisItem[]
  error: string | null
}
