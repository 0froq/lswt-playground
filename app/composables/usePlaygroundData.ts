import type { LakePoint, TimeSeries } from '~/types/mutation'
import type { ParamsData, ParamsPreprocess } from '~/types/param'

export interface UsePlaygroundDataOptions {
  paramsData: Ref<ParamsData>
  paramsPreprocess: Ref<ParamsPreprocess>
  dataset?: Ref<string | undefined>
}

export interface UsePlaygroundDataReturn {
  rawSeries: Ref<TimeSeries[] | undefined>
  processedSeries: Ref<TimeSeries[] | undefined>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  points: ComputedRef<LakePoint[] | undefined>
  reload: () => Promise<void>
}

export function usePlaygroundData(options: UsePlaygroundDataOptions): UsePlaygroundDataReturn {
  const { paramsData, paramsPreprocess, dataset } = options

  const rawSeries = ref<TimeSeries[] | undefined>(undefined)
  const processedSeries = ref<TimeSeries[] | undefined>(undefined)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  // 从 rawSeries 提取 LakePoint 列表
  const points = computed<LakePoint[] | undefined>(() => {
    if (!rawSeries.value?.length)
      return undefined
    return rawSeries.value.map(ts => ({
      id: ts.id,
      label: ts.label,
      lat: ts.lat,
      lon: ts.lon,
    }))
  })

  // 加载原始数据
  async function loadRawData() {
    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams({
        agg: paramsData.value.agg,
      })

      if (paramsData.value.clipRange) {
        const [clipStartYear, clipEndYear] = paramsData.value.clipRange
        params.append('clipRange', `${clipStartYear},${clipEndYear}`)
      }

      const ds = paramsData.value.dataset ?? dataset?.value
      if (ds) {
        params.append('dataset', String(ds))
      }

      const response = await $fetch(`/api/loadTimeSeries?${params.toString()}`)
      rawSeries.value = (response as { series: TimeSeries[] }).series
    }
    catch (e) {
      console.error('Failed to load time series data:', e)
      error.value = e as Error
      rawSeries.value = []
    }
    finally {
      isLoading.value = false
    }
  }

  // 预处理数据
  async function preprocessData() {
    if (!rawSeries.value?.length)
      return

    try {
      const params = new URLSearchParams({
        smoothWindow: paramsPreprocess.value.smoothWindow.toString(),
        diffOrder: paramsPreprocess.value.diffOrder.toString(),
      })

      const response = await $fetch(`/api/preprocessTimeSeries?${params.toString()}`, {
        method: 'POST',
        body: rawSeries.value,
      })
      processedSeries.value = (response as { processedSeries: TimeSeries[] }).processedSeries
    }
    catch (e) {
      console.error('Failed to preprocess time series data:', e)
      error.value = e as Error
      processedSeries.value = []
    }
  }

  // 监听参数变化，自动加载数据
  watch(
    () => [paramsData.value, dataset?.value],
    async () => {
      await loadRawData()
    },
    { immediate: true, deep: true },
  )

  // 监听原始数据变化，自动预处理
  watch(
    () => [rawSeries.value, paramsPreprocess.value],
    async () => {
      if (rawSeries.value) {
        await preprocessData()
      }
    },
    { deep: true },
  )

  // 手动重新加载
  async function reload() {
    await loadRawData()
  }

  return {
    rawSeries,
    processedSeries,
    isLoading,
    error,
    points,
    reload,
  }
}
