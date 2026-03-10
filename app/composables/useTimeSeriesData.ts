import type { TimeSeries } from '~/types/mutation'

export interface UseTimeSeriesDataOptions {
  dataset?: Ref<string | undefined>
}

export interface UseTimeSeriesDataReturn {
  rawSeries: Ref<TimeSeries[] | undefined>
  processedSeries: Ref<TimeSeries[] | undefined>
  tCandidates: Ref<number[]>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  loadData: (params: { agg: string, clipRange?: [number, number] }) => Promise<void>
  preprocessData: (params: { smoothWindow: number, diffOrder: number }) => Promise<void>
}

export function useTimeSeriesData(options: UseTimeSeriesDataOptions = {}): UseTimeSeriesDataReturn {
  const rawSeries = ref<TimeSeries[] | undefined>(undefined)
  const processedSeries = ref<TimeSeries[] | undefined>(undefined)
  const tCandidates = ref<number[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  async function loadData(params: { agg: string, clipRange?: [number, number] }) {
    isLoading.value = true
    error.value = null

    try {
      const searchParams = new URLSearchParams({ agg: params.agg })

      if (params.clipRange) {
        searchParams.append('clipRange', `${params.clipRange[0]},${params.clipRange[1]}`)
      }

      const ds = options.dataset?.value
      if (ds) {
        searchParams.append('dataset', ds)
      }

      const response = await $fetch(`/api/loadTimeSeries?${searchParams.toString()}`)
      rawSeries.value = response.series as TimeSeries[]

      if (rawSeries.value?.[0]?.points) {
        tCandidates.value = rawSeries.value[0].points.map(
          (p: { t: Date, v: number }) => new Date(p.t).getFullYear(),
        )
      }
    }
    catch (e) {
      error.value = e as Error
      console.error('Failed to load time series data:', e)
      rawSeries.value = []
    }
    finally {
      isLoading.value = false
    }
  }

  async function preprocessData(params: { smoothWindow: number, diffOrder: number }) {
    if (!rawSeries.value) {
      console.warn('Cannot preprocess: no raw data loaded')
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const searchParams = new URLSearchParams({
        smoothWindow: params.smoothWindow.toString(),
        diffOrder: params.diffOrder.toString(),
      })

      const response = await $fetch(`/api/preprocessTimeSeries?${searchParams.toString()}`, {
        method: 'POST',
        body: rawSeries.value,
      })

      processedSeries.value = response.processedSeries as TimeSeries[]
    }
    catch (e) {
      error.value = e as Error
      console.error('Failed to preprocess time series data:', e)
      processedSeries.value = []
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    rawSeries,
    processedSeries,
    tCandidates,
    isLoading,
    error,
    loadData,
    preprocessData,
  }
}
