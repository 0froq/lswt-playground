export type LakeFactorValue = number | string | undefined

export interface LakeFactors {
  lake: string
  lat?: number
  lon?: number
  [key: string]: LakeFactorValue
}
