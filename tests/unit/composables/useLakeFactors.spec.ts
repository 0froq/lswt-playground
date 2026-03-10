import { describe, expect, it } from 'vitest'
import { useLakeFactors } from '../app/composables/useLakeFactors'

describe('useLakeFactors', () => {
  it('should return loading state initially', () => {
    const { isLoading } = useLakeFactors()
    expect(isLoading.value).toBe(false)
  })

  it('should return empty map initially', () => {
    const { lakeFactorsMap } = useLakeFactors()
    expect(lakeFactorsMap.value.size).toBe(0)
  })
})
