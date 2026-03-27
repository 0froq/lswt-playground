<script setup lang="ts">
import type { SpatialClusterSummary } from '~/types/clustering'

const props = defineProps<{
  clusters: SpatialClusterSummary[]
  selectedClusterId?: number
}>()

const clusterColors = [
  '#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
]

// Build chart data for a cluster: background thin lines + thick mean line
function buildClusterChartData(cluster: SpatialClusterSummary): Plotly.Data[] {
  const color = clusterColors[cluster.clusterId % clusterColors.length]
  const traces: Plotly.Data[] = []

  // 1. Background thin lines for each member lake
  cluster.memberSeries.forEach((member) => {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: member.points.map(p => p.year),
      y: member.points.map(p => p.value),
      line: {
        color: `${color}20`,
        width: 0.5,
      },
      showlegend: false,
      hoverinfo: 'skip',
    } as Plotly.Data)
  })

  // 2. Upper bound (for fill)
  traces.push({
    type: 'scatter',
    mode: 'lines',
    x: cluster.meanSeries.map(p => p.year),
    y: cluster.meanSeries.map(p => p.upper),
    line: { width: 0 },
    fill: 'none',
    showlegend: false,
    hoverinfo: 'skip',
    marker: { color },
  } as Plotly.Data)

  // 3. Mean line (thick, prominent)
  traces.push({
    type: 'scatter',
    mode: 'lines',
    name: `Cluster ${cluster.clusterId + 1} Mean`,
    x: cluster.meanSeries.map(p => p.year),
    y: cluster.meanSeries.map(p => p.mean),
    line: { color, width: 3 },
    fill: 'tonexty',
    fillcolor: `${color}33`,
    hovertemplate: `Year: %{x}<br>Mean: %{y:.2f}°C<extra>Cluster ${cluster.clusterId + 1}</extra>`,
  } as Plotly.Data)

  // 4. Lower bound (for fill reference)
  traces.push({
    type: 'scatter',
    mode: 'lines',
    x: cluster.meanSeries.map(p => p.year),
    y: cluster.meanSeries.map(p => p.lower),
    line: { width: 0 },
    fill: 'tonexty',
    fillcolor: `${color}33`,
    showlegend: false,
    hoverinfo: 'skip',
    marker: { color },
  } as Plotly.Data)

  return traces
}

// Compute global mean from all clusters
const globalMeanSeries = computed(() => {
  if (!props.clusters.length) return []

  const yearMap = new Map<number, number[]>()

  props.clusters.forEach((cluster) => {
    cluster.meanSeries.forEach((p) => {
      if (!yearMap.has(p.year)) yearMap.set(p.year, [])
      yearMap.get(p.year)!.push(p.mean)
    })
  })

  const years = Array.from(yearMap.keys()).sort((a, b) => a - b)

  return years.map((year) => {
    const values = yearMap.get(year)!
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length
    const std = Math.sqrt(variance)
    return { year, mean, upper: mean + std, lower: mean - std }
  })
})

// Build global chart data
function buildGlobalChartData(): Plotly.Data[] {
  const traces: Plotly.Data[] = []
  const color = '#0ea5e9'

  // Background thin lines from all clusters' members
  props.clusters.forEach((cluster) => {
    cluster.memberSeries.forEach((member) => {
      traces.push({
        type: 'scatter',
        mode: 'lines',
        x: member.points.map(p => p.year),
        y: member.points.map(p => p.value),
        line: { color: `${color}15`, width: 0.3 },
        showlegend: false,
        hoverinfo: 'skip',
      } as Plotly.Data)
    })
  })

  // Global mean with std band
  const series = globalMeanSeries.value
  if (series.length) {
    traces.push({
      type: 'scatter',
      mode: 'lines',
      x: series.map(p => p.year),
      y: series.map(p => p.upper),
      line: { width: 0 },
      fill: 'none',
      showlegend: false,
      hoverinfo: 'skip',
      marker: { color },
    } as Plotly.Data)

    traces.push({
      type: 'scatter',
      mode: 'lines',
      name: 'Global Mean',
      x: series.map(p => p.year),
      y: series.map(p => p.mean),
      line: { color, width: 3 },
      fill: 'tonexty',
      fillcolor: `${color}33`,
      hovertemplate: 'Year: %{x}<br>Mean: %{y:.2f}°C<extra>Global</extra>',
    } as Plotly.Data)

    traces.push({
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
    } as Plotly.Data)
  }

  return traces
}

const globalChartData = computed(() => buildGlobalChartData())

const clusterChartDataMap = computed(() => {
  const map = new Map<number, Plotly.Data[]>()
  props.clusters.forEach((cluster) => {
    map.set(cluster.clusterId, buildClusterChartData(cluster))
  })
  return map
})

function getLayout(title: string): Partial<Plotly.Layout> {
  return {
    title: {
      text: title,
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
      title: { text: 'Temperature (°C)', font: { color: usePlotlyColor('label') } },
      tickfont: { color: usePlotlyColor('label'), size: 9 },
      gridcolor: usePlotlyColor('grid'),
    },
    showlegend: false,
    margin: { l: 45, r: 25, t: 45, b: 35 },
    autosize: true,
  }
}

const globalLayout = computed(() => getLayout(`Global (${props.clusters.reduce((sum, c) => sum + c.lakeCount, 0)} lakes)`))

function getClusterLayout(cluster: SpatialClusterSummary): Partial<Plotly.Layout> {
  return getLayout(`Cluster ${cluster.clusterId + 1} (${cluster.lakeCount} lakes)`)
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
      un-h-260px
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
      un-h-260px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
      :class="selectedClusterId !== undefined && selectedClusterId !== cluster.clusterId ? 'un-opacity-40' : ''"
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="clusterChartDataMap.get(cluster.clusterId)"
          :layout="getClusterLayout(cluster)"
        />
      </div>
    </div>
  </div>
</template>
