import type { SlidingMetricKey } from './sliding';

export interface ParamsData {
  agg: string
  clipRange?: [number, number]
  dataset?: string
}

export interface ParamsPreprocess {
  smoothWindow: number
  diffOrder: number
}

export interface ParamsMutation {
  mutationMethod: string
  minSegLen: number
}

/**
 * Sliding window related UI parameters for visualization on maps/charts
 */
export interface ParamsSlidingWindow {
  /** Selected window lengths to compute features with (e.g. [5,9,13]) */
  windowSizes: number[]
  /** Current metric used for display on map (mean/std/slope) */
  selectedMetric: SlidingMetricKey
  /** Currently selected window length used for map display */
  selectedWindowSize: number
  /** Currently selected center year used for map display */
  selectedCenterYear: number
}

/**
 * Clustering related UI parameters
 */
export interface ParamsClustering {
  algorithm: 'kmeans'
  clusterCount: number
  coordinateWeight: number
  bandMode: 'std' | 'minmax'
  selectedClusterId: number | undefined
}

export interface ParamsSegment {
  presetKey: string
  breakYears: number[]
}
