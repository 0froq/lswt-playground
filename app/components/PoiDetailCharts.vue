<script setup lang="ts">
import type { TimeSeries } from '~/types/mutation'
import type { SlidingWindowSeriesResult } from '~/types/sliding'

const props = defineProps<{
  rawSeries?: TimeSeries[]
  slidingFeatures?: SlidingWindowSeriesResult[]
  lakeId?: string
}>()

// Get raw series for selected lake
const lakeRawSeries = computed(() => {
  return props.rawSeries?.find(s => s.id === props.lakeId)
})

// Build raw time series data (using theme-aware colors)
const rawChartData = computed<Plotly.Data[]>(() => {
  if (!lakeRawSeries.value) return []

  const points = lakeRawSeries.value.points.map(p => ({
    year: typeof p.t === 'string' ? new Date(p.t).getFullYear() : p.t.getFullYear(),
    value: p.v,
  }))

  return [{
    type: 'scatter',
    mode: 'lines',
    x: points.map(p => p.year),
    y: points.map(p => p.value),
    line: { color: usePlotlyColor('line'), width: 1.5 },
    name: lakeRawSeries.value.label,
    hovertemplate: 'Year: %{x}<br>Temp: %{y:.2f}°C<extra></extra>',
  } as Plotly.Data]
})

// Filter features by metric
const meanFeatures = computed(() => props.slidingFeatures?.filter(f => f.metric === 'mean') ?? [])
const slopeFeatures = computed(() => props.slidingFeatures?.filter(f => f.metric === 'slope') ?? [])
const stdFeatures = computed(() => props.slidingFeatures?.filter(f => f.metric === 'std') ?? [])

// Build sliding window chart data using theme-aware grayscale
function buildSlidingChartData(features: SlidingWindowSeriesResult[]): Plotly.Data[] {
  const baseColor = usePlotlyColor('line')
  
  return features.map((feature) => {
    // Larger window = more prominent (higher opacity)
    const opacity = 0.4 + (feature.windowSize / 15) * 0.6
    const width = 1 + (feature.windowSize / 15) * 2

    // Create rgba color from the theme's line color
    let color: string
    if (baseColor.startsWith('#')) {
      const r = Number.parseInt(baseColor.slice(1, 3), 16)
      const g = Number.parseInt(baseColor.slice(3, 5), 16)
      const b = Number.parseInt(baseColor.slice(5, 7), 16)
      color = `rgba(${r}, ${g}, ${b}, ${opacity})`
    }
    else {
      color = baseColor
    }

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
}

const meanChartData = computed(() => buildSlidingChartData(meanFeatures.value))
const slopeChartData = computed(() => buildSlidingChartData(slopeFeatures.value))
const stdChartData = computed(() => buildSlidingChartData(stdFeatures.value))

// Common layout using theme-aware colors
function getLayout(title: string, yTitle: string): Partial<Plotly.Layout> {
  return {
    title: {
      text: title,
      font: { family: 'YshiPen-ShutiTC', size: 11, color: usePlotlyColor('text') },
    },
    paper_bgcolor: usePlotlyColor('background'),
    plot_bgcolor: usePlotlyColor('background'),
    xaxis: {
      title: { text: 'Year', font: { size: 9, color: usePlotlyColor('label') } },
      tickfont: { size: 8, color: usePlotlyColor('label') },
      gridcolor: usePlotlyColor('grid'),
    },
    yaxis: {
      title: { text: yTitle, font: { size: 9, color: usePlotlyColor('label') } },
      tickfont: { size: 8, color: usePlotlyColor('label') },
      gridcolor: usePlotlyColor('grid'),
    },
    showlegend: true,
    legend: {
      orientation: 'h',
      yanchor: 'bottom',
      y: 1.02,
      xanchor: 'right',
      x: 1,
      font: { size: 7, color: usePlotlyColor('label') },
    },
    margin: { l: 40, r: 20, t: 40, b: 30 },
    autosize: true,
  }
}

const hasData = computed(() => props.lakeId && lakeRawSeries.value)
</script>

<template>
  <div v-if="hasData" un-flex="~ col" un-gap-3>
    <!-- 1. Raw Time Series -->
    <div
      un-h-180px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="rawChartData"
          :layout="getLayout('Raw Series', '°C')"
        />
      </div>
    </div>

    <!-- 2. Mean -->
    <div
      v-if="meanFeatures.length"
      un-h-180px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="meanChartData"
          :layout="getLayout('Sliding Mean', '°C')"
        />
      </div>
    </div>

    <!-- 3. Slope -->
    <div
      v-if="slopeFeatures.length"
      un-h-180px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="slopeChartData"
          :layout="getLayout('Sliding Slope', '°C/year')"
        />
      </div>
    </div>

    <!-- 4. Std -->
    <div
      v-if="stdFeatures.length"
      un-h-180px
      un-border="~ neutral-300 dark:neutral-700"
      un-rounded
      un-p-2
      un-relative
      un-overflow-hidden
    >
      <div un-absolute un-inset-2>
        <PlotlyCompo
          :data="stdChartData"
          :layout="getLayout('Sliding Std', '°C')"
        />
      </div>
    </div>
  </div>
  <div v-else un-text="neutral-500" un-text-sm un-p-4>
    Select a lake to view details
  </div>
</template>
