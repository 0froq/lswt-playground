<script setup lang="ts">
import type { SpatialClusterSummary } from '~/types/clustering'

const props = defineProps<{
  clusters: SpatialClusterSummary[]
  selectedClusterId?: number
  bandMode: 'std' | 'minmax'
}>()

// Cluster colors (same as ClusterMapView)
const clusterColors = [
  '#ef4444', // red-500
  '#3b82f6', // blue-500
  '#22c55e', // green-500
  '#f59e0b', // amber-500
  '#a855f7', // purple-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#84cc16', // lime-500
  '#6366f1', // indigo-500
]

const chartData = computed<Plotly.Data[]>(() => {
  const traces: Plotly.Data[] = []

  props.clusters.forEach((cluster) => {
    const color = clusterColors[cluster.clusterId % clusterColors.length]
    const isSelected = props.selectedClusterId === undefined || props.selectedClusterId === cluster.clusterId
    const opacity = isSelected ? 0.9 : 0.3
    const lineWidth = isSelected ? 3 : 1

    // Upper bound trace (for fill)
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: `Cluster ${cluster.clusterId + 1} Upper`,
      x: cluster.meanSeries.map(p => p.year),
      y: cluster.meanSeries.map(p => p.upper),
      line: { width: 0 },
      fill: 'none',
      showlegend: false,
      hoverinfo: 'skip',
      marker: { color },
    } as Plotly.Data)

    // Mean line trace
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: `Cluster ${cluster.clusterId + 1} (${cluster.lakeCount} lakes)`,
      x: cluster.meanSeries.map(p => p.year),
      y: cluster.meanSeries.map(p => p.mean),
      line: {
        color,
        width: lineWidth,
      },
      fill: 'tonexty',
      fillcolor: `${color}33`, // 20% opacity in hex
      opacity,
      hovertemplate: `Year: %{x}<br>Mean: %{y:.2f}°C<extra>Cluster ${cluster.clusterId + 1}</extra>`,
    } as Plotly.Data)

    // Lower bound trace (for fill reference)
    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: `Cluster ${cluster.clusterId + 1} Lower`,
      x: cluster.meanSeries.map(p => p.year),
      y: cluster.meanSeries.map(p => p.lower),
      line: { width: 0 },
      fill: 'tonexty',
      fillcolor: `${color}33`,
      showlegend: false,
      hoverinfo: 'skip',
      marker: { color },
    } as Plotly.Data)
  })

  return traces
})

const chartLayout = computed<Partial<Plotly.Layout>>(() => {
  return {
    title: {
      text: 'Cluster Mean Time Series with Range Bands',
      font: {
        family: 'YshiPen-ShutiTC',
        size: 16,
      },
    },
    xaxis: {
      title: { text: 'Year' },
      tickfont: { color: usePlotlyColor('label') },
      gridcolor: usePlotlyColor('grid'),
    },
    yaxis: {
      title: { text: 'Temperature (°C)' },
      tickfont: { color: usePlotlyColor('label') },
      gridcolor: usePlotlyColor('grid'),
    },
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'right',
      x: 1,
    },
    margin: { l: 60, r: 40, t: 100, b: 60 },
  }
})
</script>

<template>
  <div
    un-w-full
    un-h-350px
  >
    <PlotlyCompo
      :data="chartData"
      :layout="chartLayout"
    />
  </div>
</template>
