<script setup lang="ts">
import type { TimeSeries } from '~/types/mutation'

const props = defineProps<{
  rawSeries?: TimeSeries[]
}>()

// 计算全球平均温度时间序列
const globalAverageSeries = computed<TimeSeries | undefined>(() => {
  console.log('[SegmentGlobalAverageChart] rawSeries:', props.rawSeries?.length)
  
  if (!props.rawSeries?.length) {
    return undefined
  }

  // 获取所有时间点（假设所有湖泊的时间点相同）
  const firstSeries = props.rawSeries[0]
  if (!firstSeries?.points?.length) {
    console.log('[SegmentGlobalAverageChart] firstSeries has no points')
    return undefined
  }

  const timePoints = firstSeries.points
  console.log('[SegmentGlobalAverageChart] timePoints length:', timePoints.length)

  // 计算每个时间点的平均值
  const avgPoints: { t: Date, v: number }[] = []
  
  for (let timeIndex = 0; timeIndex < timePoints.length; timeIndex++) {
    let sum = 0
    let count = 0

    for (const series of props.rawSeries) {
      const point = series.points[timeIndex]
      // 过滤掉无效值（CSV中的 no-data 值通常是 -0.00033569336）
      if (point && Number.isFinite(point.v) && point.v > -5) {
        sum += point.v
        count++
      }
    }

    if (count > 0) {
      avgPoints.push({
        t: timePoints[timeIndex]!.t,
        v: sum / count,
      })
    }
  }

  console.log('[SegmentGlobalAverageChart] avgPoints length:', avgPoints.length)

  if (avgPoints.length === 0) {
    return undefined
  }

  return {
    id: 'global-average',
    label: 'Global Average Temperature',
    lat: 0,
    lon: 0,
    points: avgPoints,
  }
})

// 包装成 ChartTimeSeries 需要的格式
const timeSeriesData = computed<Record<string, TimeSeries | undefined>>(() => {
  const result = {
    raw: globalAverageSeries.value,
  }
  console.log('[SegmentGlobalAverageChart] timeSeriesData:', result)
  return result
})
</script>

<template>
  <div
    un-w-full
    un-h-80
  >
    <ChartTimeSeries
      :time-series="timeSeriesData"
    />
  </div>
</template>
