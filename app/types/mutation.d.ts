export interface MutationPoint {
  lakeId: string
  year: number
  index: number
  preAvg: number
  postAvg: number
  preOls: number
  postOls: number
  preSen: number
  postSen: number
  preVar: number
  postVar: number
}

export interface TimeSeriesPreprocessParams {
  smoothWindow: number
  diffOrder: number
}

export interface MutationDetectionParams {
  agg: string
  method: string
  smoothWindow: number
  diffOrder: number
  numMutations: number
  minSegmentLength: number
  startYear: number
  endYear: number
  windowStart: number
  windowEnd: number
}

export interface TimeSeries {
  id: string
  lat: number
  lon: number
  label: string
  points: { t: Date, v: number }[]
}

export interface LakePoint {
  id: string
  lat: number
  lon: number
  label: string
}

export interface MutationPoint {
  lakeId: string
  year: number
  index: number // index in original (raw) series
  preAvg: number
  postAvg: number
  preOls: number
  postOls: number
  preSen: number
  postSen: number
  preVar: number
  postVar: number
}
