/**
 * Sliding window feature key names used for computing time-series features
 * within a moving window over lake temperature data.
 */
export type SlidingMetricKey = 'mean' | 'std' | 'slope'

/**
 * A single sliding window feature value at a given window center year.
 */
export interface SlidingWindowPoint {
  /** Center year of the sliding window */
  year: number
  /** Computed feature value for this window */
  value: number
}

/**
 * Result for a lake's sliding window analysis.
 * Each lake can have multiple windows, each with a metric value.
 */
export interface SlidingWindowSeriesResult {
  lakeId: string
  /** Window size (must be one of 3,5,7,9,11,13,15) */
  windowSize: 3 | 5 | 7 | 9 | 11 | 13 | 15
  /** The feature metric used for this series */
  metric: SlidingMetricKey
  /** Array of per-window feature values across the lake set */
  points: SlidingWindowPoint[]
}

/**
 * Response wrapper for sliding window analysis across multiple lakes.
 */
export interface SlidingWindowAnalysisResponse {
  /** Per-lake sliding window features */
  perLakeFeatures: SlidingWindowSeriesResult[]
  /** Global mean of sliding window features across lakes */
  globalMeanFeatures: SlidingWindowSeriesResult[]
  /** Candidate center years available for the analysis */
  yearCandidates: number[]
}
