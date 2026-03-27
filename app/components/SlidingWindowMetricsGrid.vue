<script setup lang="ts">
import type { SlidingWindowSeriesResult } from '~/types/sliding'

const props = defineProps<{
  data: SlidingWindowSeriesResult[]
  title: string
}>()

// Window size colors (sky palette)
const windowSizeColors: Record<number, string> = {
  3: '#0ea5e9',
  5: '#0284c7',
  7: '#0369a1',
  9: '#075985',
  11: '#38bdf8',
  13: '#7dd3fc',
  15: '#bae6fd',
}

// Group by metric
const meanFeatures = computed(() => props.data.filter(f => f.metric === 'mean'))
const slopeFeatures = computed(() => props.data.filter(f => f.metric === 'slope'))
const stdFeatures = computed(() => props.data.filter(f => f.metric === 'std'))

// Build chart data for a metric (multi-line, one per window size)
function buildChartData(features: SlidingWindowSeriesResult[]): Plotly.Data[] {
  return features.map((feature) => {
    const color = windowSizeColors[feature.windowSize] || '#0ea5e9'
    return {
      type: 'scatter',
      mode: 'lines',
      name: `${feature.windowSize}y`,
      x: feature.points.map(p => p.year),
      y: feature.points.map(p => p.value),
      line: { color, width: 2 },
      hovertemplate: `Year: %{x}<br>${feature.windowSize}y: %{y:.3f}<extra></extra>`,
    } as Plotly.Data
  })
}

const meanChartData = computed(() => buildChartData(meanFeatures.value))
const slopeChartData = computed(() => buildChartData(slopeFeatures.value))
const stdChartData = computed(() => buildChartData(stdFeatures.value))

// Layout factory
function getLayout(metric: string, yTitle: string): Partial<Plotly.Layout> {
  return {
    title: {
      text: `${props.title} - ${metric}`,
      font: { family: 'YshiPen-ShutiTC', size: 12, color: usePlotlyColor('text') },
    },
    paper_bgcolor: usePlotlyColor('background'),
    plot_bgcolor: usePlotlyColor('background'),
    xaxis: {
      title: { text: 'Year', font: { color: usePlotlyColor('text') } },
      tickfont: { color: usePlotlyColor('label'), size: 9 },
      gridcolor: usePlotlyColor('grid'),
    },
    yaxis: {
      title: { text: yTitle, font: { color: usePlotlyColor('text') } },
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
    margin: { l: 45, r: 25, t: 50, b: 35 },
    autosize: true,
  }
}

const meanLayout = computed(() => getLayout('Mean', '°C'))
const slopeLayout = computed(() => getLayout('Slope', '°C/year'))
const stdLayout = computed(() => getLayout('Std', '°C'))

const hasMean = computed(() => meanFeatures.value.length > 0)
const hasSlope = computed(() => slopeFeatures.value.length > 0)
const hasStd = computed(() => stdFeatures.value.length > 0)
</script>

<template>
  <div
    un-grid
    un-grid-cols="1 md:2 lg:3"
    un-gap-3
  >
    <!-- Mean chart -->
    <div
      v-if="hasMean"
      un-h-220px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="meanChartData"
          :layout="meanLayout"
        />
      </div>
    </div>

    <!-- Slope chart -->
    <div
      v-if="hasSlope"
      un-h-220px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="slopeChartData"
          :layout="slopeLayout"
        />
      </div>
    </div>

    <!-- Std chart -->
    <div
      v-if="hasStd"
      un-h-220px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="stdChartData"
          :layout="stdLayout"
        />
      </div>
    </div>
  </div>
</template>
