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

export interface ParamsSegment {
  presetKey: string
  breakYears: number[]
}
