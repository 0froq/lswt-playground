import type { MutationPoint, TimeSeries } from '~/types/mutation'

export interface UseMutationDetectionOptions {
  mutationMethod: Ref<string>
  minSegLen: Ref<number>
}

export interface UseMutationDetectionReturn {
  mutationPoints: Ref<MutationPoint[] | undefined>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  detectMutations: (params: {
    processedSeries: TimeSeries[]
    rawSeries: TimeSeries[]
  }) => Promise<void>
}

export function useMutationDetection(
  options: UseMutationDetectionOptions,
): UseMutationDetectionReturn {
  const mutationPoints = ref<MutationPoint[] | undefined>(undefined)
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  async function detectMutations(params: {
    processedSeries: TimeSeries[]
    rawSeries: TimeSeries[]
  }) {
    isLoading.value = true
    error.value = null

    try {
      const searchParams = new URLSearchParams({
        mutationMethod: options.mutationMethod.value,
        minSegLen: options.minSegLen.value.toString(),
      })

      const response = await $fetch(`/api/detectMutation?${searchParams.toString()}`, {
        method: 'POST',
        body: {
          processedSeries: params.processedSeries,
          rawSeries: params.rawSeries,
        },
      })

      mutationPoints.value = response.mutationPoints as MutationPoint[]
    }
    catch (e) {
      error.value = e as Error
      console.error('Failed to detect mutations:', e)
      mutationPoints.value = []
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    mutationPoints,
    isLoading,
    error,
    detectMutations,
  }
}
