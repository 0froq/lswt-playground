<script setup lang="ts">
import type { SpatialClusterSummary } from '~/types/clustering'

const props = defineProps<{
  globalSeries?: { year: number, mean: number, upper: number, lower: number }[]
  clusters: SpatialClusterSummary[]
}>()

// Cluster colors (same as ClusterMapView)
const clusterColors = [
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
]

// Build data for a single chart (mean with shaded std band)
function buildChartData(
  series: { year: number, mean: number, upper: number, lower: number }[],
  color: string,
  name: string,
): Plotly.Data[] {
  return [
    // Upper bound (for fill)
    {
      type: 'scatter',
      mode: 'lines',
      x: series.map(p => p.year),
      y: series.map(p => p.upper),
      line: { width: 0 },
      fill: 'none',
      showlegend: false,
      hoverinfo: 'skip',
      marker: { color },
    },
    // Mean line
    {
      type: 'scatter',
      mode: 'lines',
      name: `${name} Mean`,
      x: series.map(p => p.year),
      y: series.map(p => p.mean),
      line: { color, width: 2 },
      fill: 'tonexty',
      fillcolor: `${color}33`,
      hovertemplate: `Year: %{x}<br>Mean: %{y:.2f}°C<extra>${name}</extra>`,
    },
    // Lower bound (for fill reference)
    {
      type: 'scatter',
      mode: 'lines',
      x: series.map(p => p.year),
      y: series.map(p => p.lower),
      line: { width: 0 },
      fill: 'tonexty',
      fillcolor: `${color}33`,
      showlegend: false,
      hoverinfo: 'skip',
      marker: { color },
    },
  ]
}

// Global series data
const globalChartData = computed<Plotly.Data[]>(() => {
  if (!props.globalSeries?.length) return []
  return buildChartData(props.globalSeries, '#0ea5e9', 'Global')
})

// Per-cluster series data
const clusterChartData = computed<Map<number, Plotly.Data[]>>(() => {
  const map = new Map<number, Plotly.Data[]>()
  props.clusters.forEach((cluster) => {
    const color = clusterColors[cluster.clusterId % clusterColors.length] ?? '#0ea5e9'
    map.set(cluster.clusterId, buildChartData(cluster.meanSeries, color, `Cluster ${cluster.clusterId + 1}`))
  })
  return map
})

// Common layout for all charts
function getLayout(title: string): Partial<Plotly.Layout> {
  return {
    title: {
      text: title,
      font: { family: 'YshiPen-ShutiTC', size: 14 },
    },
    xaxis: {
      title: { text: 'Year' },
      tickfont: { color: usePlotlyColor('label'), size: 10 },
      gridcolor: usePlotlyColor('grid'),
    },
    yaxis: {
      title: { text: 'Temperature (°C)' },
      tickfont: { color: usePlotlyColor('label'), size: 10 },
      gridcolor: usePlotlyColor('grid'),
    },
    showlegend: false,
    margin: { l: 50, r: 30, t: 50, b: 40 },
    autosize: true,
  }
}

const globalLayout = computed(() => getLayout('Global Mean'))

function getClusterLayout(clusterId: number, lakeCount: number): Partial<Plotly.Layout> {
  return getLayout(`Cluster ${clusterId + 1} (${lakeCount} lakes)`)
}
</script>

<template>
  <div
    un-grid
    un-grid-cols="1 md:2 lg:3 xl:4"
    un-gap-4
  >
    <!-- Global chart -->
    <div
      v-if="globalSeries?.length"
      un-h-250px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="globalChartData"
          :layout="globalLayout"
        />
      </div>
    </div>

    <!-- Cluster charts -->
    <div
      v-for="cluster in clusters"
      :key="cluster.clusterId"
      un-h-250px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="clusterChartData.get(cluster.clusterId)"
          :layout="getClusterLayout(cluster.clusterId, cluster.lakeCount)"
        />
      </div>
    </div>
  </div>
</template>
