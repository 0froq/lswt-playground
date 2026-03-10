export interface Segment {
  lakeId: string
  segmentIndex: number
  startYear: number
  endYear: number
  startYearIndex: number
  endYearIndex: number
  avg: number
  slope: number
  var: number
  p: number
}

export interface Break {
  lakeId: string
  breakIndex: number
  year: number
  yearIndex: number
  deltaAvg: number
  deltaSlope: number
  deltaVar: number
  p: number
  cohenD: number
}
