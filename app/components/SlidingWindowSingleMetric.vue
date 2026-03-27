<script setup lang="ts">
import type { SlidingWindowSeriesResult } from '~/types/sliding'

const props = defineProps<{
  data: SlidingWindowSeriesResult[]
  title: string
  metric: 'mean' | 'slope' | 'std'
  yAxisTitle: string
  color?: string // Main color for this cluster/global
}>()

// Cluster colors for reference
const clusterColors = [
  '#0ea5e9', // sky-500 (global default)
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
]

// Get base color
const baseColor = computed(() => props.color || '#0ea5e9')

// Window size opacities (darker/lighter variations of base color)
// Larger window = darker/more prominent
const windowSizeOpacities: Record<number, number> = {
  3: 0.5,
  5: 0.6,
  7: 0.7,
  9: 0.85,
  11: 0.9,
  13: 0.95,
  15: 1.0,
}

// Filter to only the specified metric
const filteredFeatures = computed(() => props.data.filter(f => f.metric === props.metric))

// Convert hex to rgba with opacity
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const bigint = Number.parseInt(h, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// Build chart data - multi-line, one per window size
// Different window sizes = different opacities of the same base color
const chartData = computed<Plotly.Data[]>(() => {
  return filteredFeatures.value.map((feature) => {
    const opacity = windowSizeOpacities[feature.windowSize] || 0.8
    const color = hexToRgba(baseColor.value, opacity)
    // Larger window = thicker line
    const width = 1 + (feature.windowSize / 15) * 2
    return {
      type: 'scatter',
      mode: 'lines',
      name: `${feature.windowSize}y`,
      x: feature.points.map(p => p.year),
      y: feature.points.map(p => p.value),
      line: { color, width },
      hovertemplate: `Year: %{x}<br>${feature.windowSize}y: %{y:.3f}<extra></extra>`,
    } as Plotly.Data
  })
})

const hasData = computed(() => filteredFeatures.value.length > 0)

const layout = computed<Partial<Plotly.Layout>>(() => ({
  title: {
    text: props.title,
    font: { family: 'YshiPen-ShutiTC', size: 13, color: usePlotlyColor('text') },
  },
  paper_bgcolor: usePlotlyColor('background'),
  plot_bgcolor: usePlotlyColor('background'),
  xaxis: {
    title: { text: 'Year', font: { color: usePlotlyColor('label') } },
    tickfont: { color: usePlotlyColor('label'), size: 9 },
    gridcolor: usePlotlyColor('grid'),
  },
  yaxis: {
    title: { text: props.yAxisTitle, font: { color: usePlotlyColor('label') } },
    tickfont: { color: usePlotlyColor('label'), size: 9 },
    gridcolor: usePlotlyColor('grid'),
  },
  showlegend: true,
  legend: {
    orientation: 'h',
    yanchor: 'bottom',
    y: 1.02,
    xanchor: 'right',
    x: 1,
    font: { size: 8, color: usePlotlyColor('label') },
  },
  margin: { l: 50, r: 25, t: 50, b: 35 },
  autosize: true,
}))
</script>

<template>
  <div
    v-if="hasData"
    un-h-240px
    un-border="~ neutral-300 dark:neutral-700"
    un-rounded
    un-p-2
    un-relative
    un-overflow-hidden
  >
    <div un-absolute un-inset-2>
      <PlotlyCompo
        :data="chartData"
        :layout="layout"
      />
    </div>
  </div>
</template>
