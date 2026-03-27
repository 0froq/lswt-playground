<script setup lang="ts">
import type { TimeSeries } from '~/types/mutation'
import type { Break, Segment } from '~/types/segments'
import { usePlotlyColor } from '~/composables/usePlotlyColor'

const props = defineProps<{
  rawSeries?: TimeSeries[]
  breaks?: Break[]
}>()

const textColor = usePlotlyColor('text')
const axisColor = usePlotlyColor('axis')
const gridColor = usePlotlyColor('grid')
const lineColor = usePlotlyColor('line')

// 安全的 key，用于强制重新渲染
const chartKey = computed(() => {
  const breakCount = props.breaks?.length ?? 0
  const firstYear = props.breaks?.[0]?.year ?? 'none'
  return `global-avg-${breakCount}-${firstYear}`
})

// 计算全球平均温度时间序列
const globalAverageData = computed(() => {
  if (!props.rawSeries?.length) {
    return null
  }

  // 获取所有时间点（假设所有湖泊的时间点相同）
  const firstSeries = props.rawSeries[0]
  if (!firstSeries?.points?.length) {
    return null
  }

  const timePoints = firstSeries.points.map(p => p.t)

  // 计算每个时间点的平均值
  const avgValues = timePoints.map((_, timeIndex) => {
    let sum = 0
    let count = 0

    for (const series of props.rawSeries!) {
      const point = series.points[timeIndex]
      if (point && Number.isFinite(point.v)) {
        sum += point.v
        count++
      }
    }

    return count > 0 ? sum / count : null
  })

  return {
    times: timePoints,
    values: avgValues,
  }
})

const chartData = computed<Plotly.Data[]>(() => {
  if (!globalAverageData.value) {
    return []
  }

  const { times, values } = globalAverageData.value

  return [{
    x: times,
    y: values,
    type: 'scatter',
    mode: 'lines+markers',
    name: 'Global Average',
    marker: {
      size: 6,
      color: lineColor,
    },
    line: {
      color: lineColor,
      shape: 'spline',
      width: 2,
    },
    hovertemplate: '%{x|%Y-%m}<br>Avg: %{y:.3f}°C<extra></extra>',
  }]
})

const chartLayout = computed<Partial<Plotly.Layout>>(() => {
  // 计算 Y 轴范围用于确定 break 线的长度
  const values = globalAverageData.value?.values?.filter(v => v !== null) as number[] || []
  const yMin = values.length ? Math.min(...values) : 0
  const yMax = values.length ? Math.max(...values) : 1
  const yRange = yMax - yMin
  const breakHalfSpan = yRange * 0.15

  // 从 breaks 中提取唯一的年份（因为 breaks 是按湖泊的，同一 break 年份会出现多次）
  const uniqueBreakYears = new Set<number>()
  props.breaks?.forEach(b => uniqueBreakYears.add(b.year))
  const sortedBreakYears = Array.from(uniqueBreakYears).sort((a, b) => a - b)

  // 构建 shapes 数组来绘制 break 线
  const shapes: Partial<Plotly.Shape>[] = []

  sortedBreakYears.forEach((year) => {
    const avgData = globalAverageData.value
    if (!avgData)
      return

    const yearIndex = avgData.times.findIndex(t => t.getFullYear() === year)
    const yCenter = yearIndex >= 0 ? avgData.values[yearIndex] : null

    if (!Number.isFinite(yCenter) || yCenter === null || yCenter === undefined)
      return

    shapes.push({
      type: 'line',
      x0: new Date(year, 0, 1),
      x1: new Date(year, 0, 1),
      y0: (yCenter as number) - breakHalfSpan,
      y1: (yCenter as number) + breakHalfSpan,
      xref: 'x',
      yref: 'y',
      line: {
        color: '#f97316', // orange-500
        width: 2,
        dash: 'dot',
      },
    })
  })

  const layout = {
    title: {
      text: 'Global Average Lake Surface Water Temperature',
      font: {
        family: 'YshiPen-ShutiTC',
        color: textColor,
        size: 16,
      },
    },
    xaxis: {
      title: {
        text: 'Time',
        font: { color: textColor },
      },
      tickfont: { color: textColor },
      gridcolor: gridColor,
      zerolinecolor: axisColor,
      showgrid: true,
    },
    yaxis: {
      title: {
        text: 'Temperature (°C)',
        font: { color: textColor },
      },
      tickfont: { color: textColor },
      gridcolor: gridColor,
      zerolinecolor: axisColor,
      showgrid: true,
    },
    margin: { l: 60, r: 40, t: 60, b: 60 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    hovermode: 'x unified' as const,
    hoverlabel: {
      bgcolor: usePlotlyColor('floatBg'),
      bordercolor: usePlotlyColor('floatBorder'),
      font: {
        color: textColor,
      },
    },
    showlegend: false,
    shapes,
  }

  return layout
})
</script>

<template>
  <div
    un-w-full
    un-border="~ neutral-300 dark:neutral-700"
  >
    <PlotlyCompo
      v-if="chartData.length > 0"
      :key="chartKey"
      type="chart"
      :data="chartData"
      :layout="chartLayout"
    />
    <div
      v-else
      un-w-full
      un-h-full
      un-flex="~"
      un-items-center
      un-justify-center
      un-text="neutral-500 dark:neutral-400"
    >
      <span>Loading global average data...</span>
    </div>
  </div>
</template>
