<script setup lang="ts">
import type { SlidingMetricKey, SlidingWindowSeriesResult } from '~/types/sliding'

const props = defineProps<{
  data: SlidingWindowSeriesResult[]
  title?: string
  metric: SlidingMetricKey
  showLegend?: boolean
}>()

// Sky color palette for window sizes
const windowSizeColors: Record<number, string> = {
  3: '#0ea5e9', // sky-500
  5: '#0284c7', // sky-600
  7: '#0369a1', // sky-700
  9: '#075985', // sky-800
  11: '#38bdf8', // sky-400
  13: '#7dd3fc', // sky-300
  15: '#bae6fd', // sky-200
}

// Filter data by metric and group by window size
const chartData = computed<Plotly.Data[]>(() => {
  const filtered = props.data.filter(d => d.metric === props.metric)

  return filtered.map((series) => {
    const color = windowSizeColors[series.windowSize] || '#0ea5e9'
    return {
      type: 'scatter',
      mode: 'lines',
      name: `${series.windowSize}y`,
      x: series.points.map(p => p.year),
      y: series.points.map(p => p.value),
      line: {
        color,
        width: 2,
      },
      hovertemplate: `Year: %{x}<br>${props.metric}: %{y:.3f}<extra></extra>`,
    } as Plotly.Data
  })
})

const chartLayout = computed<Partial<Plotly.Layout>>(() => {
  return {
    title: {
      text: props.title || `${props.metric.charAt(0).toUpperCase() + props.metric.slice(1)} by Window Size`,
      font: {
        family: 'YshiPen-ShutiTC',
        size: 16,
        color: usePlotlyColor('text'),
      },
    },
    paper_bgcolor: usePlotlyColor('background'),
    plot_bgcolor: usePlotlyColor('background'),
    xaxis: {
      title: { text: 'Year', font: { color: usePlotlyColor('label') } },
      tickfont: { color: usePlotlyColor('label') },
      gridcolor: usePlotlyColor('grid'),
    },
    yaxis: {
      title: { text: props.metric === 'mean' ? 'Temperature (°C)' : props.metric, font: { color: usePlotlyColor('label') } },
      tickfont: { color: usePlotlyColor('label') },
      gridcolor: usePlotlyColor('grid'),
    },
    showlegend: props.showLegend ?? true,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'right',
      x: 1,
      font: { color: usePlotlyColor('label') },
    },
    margin: { l: 60, r: 40, t: 80, b: 60 },
    autosize: true,
  }
})
</script>

<template>
  <div
    un-w-full
    un-h-300px
  >
    <PlotlyCompo
      :data="chartData"
      :layout="chartLayout"
    />
  </div>
</template>
