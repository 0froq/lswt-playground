import type { TimeSeries } from '~/types/mutation'

export interface UsePlaygroundPoiOptions {
  rawSeries: Ref<TimeSeries[] | undefined>
}

export interface UsePlaygroundPoiReturn {
  poi: Ref<string | undefined>
  poiCandidates: ComputedRef<string[] | undefined>
  tCandidates: ComputedRef<number[]>
  selectedSeries: ComputedRef<TimeSeries | undefined>
  setPoi: (id: string | undefined) => void
}

export function usePlaygroundPoi(options: UsePlaygroundPoiOptions): UsePlaygroundPoiReturn {
  const { rawSeries } = options

  const poi = ref<string | undefined>(undefined)

  // 候选 POI 列表
  const poiCandidates = computed<string[] | undefined>(() => {
    if (!rawSeries.value?.length)
      return undefined
    return rawSeries.value.map(series => series.label)
  })

  // 时间年份候选列表
  const tCandidates = computed<number[]>(() => {
    if (!rawSeries.value?.[0]?.points?.length)
      return []
    const years = rawSeries.value[0].points.map(
      (p: { t: Date, v: number }) => new Date(p.t).getFullYear(),
    )
    // 去重并排序
    return Array.from(new Set(years)).sort((a, b) => a - b)
  })

  // 当前选中的时间序列
  const selectedSeries = computed<TimeSeries | undefined>(() => {
    if (!poi.value || !rawSeries.value?.length)
      return undefined
    return rawSeries.value.find(series => series.id === poi.value || series.label === poi.value)
  })

  // 设置 POI
  function setPoi(id: string | undefined) {
    poi.value = id
  }

  return {
    poi,
    poiCandidates,
    tCandidates,
    selectedSeries,
    setPoi,
  }
}
