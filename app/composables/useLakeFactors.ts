import type { LakeFactors } from '~/types/factor'

export interface LoadFactorsConstantResponse {
  factors: LakeFactors[]
  error: string | null
  detail?: unknown
}

export interface UseLakeFactorsReturn {
  lakeFactorsMap: Ref<Map<string, LakeFactors>>
  isLoading: Ref<boolean>
  error: Ref<Error | null>
  loadFactors: (dataset?: string) => Promise<void>
}

export function useLakeFactors(): UseLakeFactorsReturn {
  const lakeFactorsMap = ref<Map<string, LakeFactors>>(new Map())
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  async function loadFactors(dataset?: string) {
    isLoading.value = true
    error.value = null

    try {
      const params = new URLSearchParams()
      if (dataset) {
        params.append('dataset', dataset)
      }

      const res = await $fetch<LoadFactorsConstantResponse>(
        `/api/loadFactorsConstant?${params.toString()}`,
      )

      if (res?.error) {
        throw new Error(res.error)
      }

      const factors = res?.factors ?? []
      lakeFactorsMap.value = new Map(
        factors.map(factor => [String(factor.id), factor] as const),
      )
    }
    catch (e) {
      error.value = e as Error
      console.error('Failed to load lake factors:', e)
    }
    finally {
      isLoading.value = false
    }
  }

  return {
    lakeFactorsMap,
    isLoading,
    error,
    loadFactors,
  }
}
