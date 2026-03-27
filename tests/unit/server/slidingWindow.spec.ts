import { describe, expect, it } from 'vitest'
import type { TimeSeries } from '../../../app/types/mutation'
import {
  computeGlobalMeanSeries,
  computeMean,
  computeOlsSlope,
  computeSlidingWindowSeries,
  computeStd,
} from '../../../server/utils/slidingWindow'

function buildSeries(id: string, values: number[], startYear = 2000): TimeSeries {
  return {
    id,
    lat: 0,
    lon: 0,
    label: id,
    points: values.map((v, i) => ({
      t: new Date(startYear + i, 0, 1),
      v,
    })),
  }
}

describe('slidingWindow utils', () => {
  describe('computeMean', () => {
    it('returns average for normal numeric array', () => {
      expect(computeMean([1, 2, 3, 4])).toBe(2.5)
    })

    it('returns NaN for empty array', () => {
      expect(Number.isNaN(computeMean([]))).toBe(true)
    })

    it('returns the value itself for single element', () => {
      expect(computeMean([42])).toBe(42)
    })
  })

  describe('computeStd', () => {
    it('computes sample standard deviation (n - 1)', () => {
      expect(computeStd([1, 2, 3])).toBe(1)
    })

    it('returns NaN when fewer than 2 values', () => {
      expect(Number.isNaN(computeStd([1]))).toBe(true)
      expect(Number.isNaN(computeStd([]))).toBe(true)
    })
  })

  describe('computeOlsSlope', () => {
    it('computes known slope for linear data', () => {
      const x = [2000, 2001, 2002, 2003, 2004]
      const y = [1, 3, 5, 7, 9]
      expect(computeOlsSlope(x, y)).toBeCloseTo(2, 10)
    })

    it('returns zero slope for horizontal line', () => {
      const x = [2000, 2001, 2002, 2003]
      const y = [5, 5, 5, 5]
      expect(computeOlsSlope(x, y)).toBeCloseTo(0, 10)
    })
  })

  describe('computeSlidingWindowSeries', () => {
    it('computes mean with windowSize=3 on 10-year series', () => {
      const series = buildSeries('lake-a', [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      const result = computeSlidingWindowSeries(series, 3, 'mean')

      expect(result.lakeId).toBe('lake-a')
      expect(result.windowSize).toBe(3)
      expect(result.metric).toBe('mean')
      expect(result.points.length).toBe(8)
      expect(result.points[0]).toEqual({ year: 2001, value: 2 })
      expect(result.points[result.points.length - 1]).toEqual({ year: 2008, value: 9 })
    })

    it('computes slope with windowSize=5 for linear growth data', () => {
      const series = buildSeries('lake-b', [10, 12, 14, 16, 18, 20, 22, 24, 26, 28])
      const result = computeSlidingWindowSeries(series, 5, 'slope')

      expect(result.points.length).toBe(6)
      for (const point of result.points)
        expect(point.value).toBeCloseTo(2, 10)
    })

    it('returns empty points when sequence is too short for full window', () => {
      const series = buildSeries('lake-c', [1, 2])
      const result = computeSlidingWindowSeries(series, 5, 'mean')
      expect(result.points).toEqual([])
    })
  })

  describe('computeGlobalMeanSeries', () => {
    it('computes sliding metrics from global yearly mean across lakes', () => {
      const allSeries: TimeSeries[] = [
        buildSeries('lake-1', [1, 2, 3, 4]),
        buildSeries('lake-2', [2, 3, 4, 5]),
        buildSeries('lake-3', [3, 4, 5, 6]),
      ]

      const result = computeGlobalMeanSeries(allSeries, [3], ['mean'])

      expect(result.length).toBe(1)
      expect(result[0]?.windowSize).toBe(3)
      expect(result[0]?.metric).toBe('mean')
      expect(result[0]?.points).toEqual([
        { year: 2001, value: 3 },
        { year: 2002, value: 4 },
      ])
    })

    it('returns objects matching SlidingWindowSeriesResult shape', () => {
      const allSeries: TimeSeries[] = [
        buildSeries('lake-1', [1, 2, 3, 4]),
        buildSeries('lake-2', [2, 3, 4, 5]),
        buildSeries('lake-3', [3, 4, 5, 6]),
      ]

      const result = computeGlobalMeanSeries(allSeries, [3, 5], ['mean', 'std'])

      expect(result.length).toBe(4)
      for (const item of result) {
        expect(typeof item.lakeId).toBe('string')
        expect(typeof item.windowSize).toBe('number')
        expect(['mean', 'std', 'slope']).toContain(item.metric)
        expect(Array.isArray(item.points)).toBe(true)
        for (const point of item.points) {
          expect(typeof point.year).toBe('number')
          expect(typeof point.value).toBe('number')
        }
      }
    })
  })
})
