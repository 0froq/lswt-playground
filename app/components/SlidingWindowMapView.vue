<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { SlidingWindowSeriesResult, SlidingMetricKey } from '~/types/sliding'

const props = defineProps<{
  points: LakePoint[]
  slidingData: SlidingWindowSeriesResult[]
  selectedMetric: SlidingMetricKey
  selectedWindowSize: number
  selectedCenterYear: number
  selectedLakeId?: string
}>()

const emit = defineEmits<{
  (e: 'selectLake', lakeId: string): void
}>()

// Color interpolation function (from SegmentMapView.vue)
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function hexToRgb(hex: string) {
  const h = hex.replace('#', '')
  const bigint = Number.parseInt(h, 16)
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255,
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function interpolateColor(val: number, maxAbs: number) {
  if (!Number.isFinite(val) || !Number.isFinite(maxAbs) || maxAbs <= 0)
    return '#94a3b8'
  const clamped = Math.max(-maxAbs, Math.min(maxAbs, val))
  const t = (clamped + maxAbs) / (2 * maxAbs)
  const end = hexToRgb('#ef4444')
  const mid = hexToRgb('#fbbf24')
  const start = hexToRgb('#22c55e')
  let color
  if (t <= 0.5) {
    const localT = t / 0.5
    color = rgbToHex(
      Math.round(lerp(start.r, mid.r, localT)),
      Math.round(lerp(start.g, mid.g, localT)),
      Math.round(lerp(start.b, mid.b, localT)),
    )
  }
  else {
    const localT = (t - 0.5) / 0.5
    color = rgbToHex(
      Math.round(lerp(mid.r, end.r, localT)),
      Math.round(lerp(mid.g, end.g, localT)),
      Math.round(lerp(mid.b, end.b, localT)),
    )
  }
  return color
}

// Get value for a lake at selected metric/windowSize/centerYear
function getLakeValue(lakeId: string): number | undefined {
  const series = props.slidingData.find(
    d => d.lakeId === lakeId && d.metric === props.selectedMetric && d.windowSize === props.selectedWindowSize
  )
  const point = series?.points.find(p => p.year === props.selectedCenterYear)
  return point?.value
}

const mapFigure = computed(() => {
  if (!props.points?.length) {
    return { data: [], layout: {} }
  }

  // Get values for all lakes
  const entries = props.points.map((lake) => {
    const value = getLakeValue(lake.id)
    return {
      id: lake.id,
      label: lake.label,
      lat: lake.lat,
      lon: lake.lon,
      value,
    }
  }).filter(e => Number.isFinite(e.value))

  if (!entries.length) {
    return { data: [], layout: {} }
  }

  // Calculate max absolute value for color scaling
  const maxAbs = entries.reduce((m, e) => Math.max(m, Math.abs(e.value || 0)), 0)

  const lat = entries.map(e => e.lat)
  const lon = entries.map(e => e.lon)
  const colors = entries.map(e => interpolateColor(e.value || 0, maxAbs || 1))
  const customdata: (string | number)[][] = entries.map(e => [e.id, e.value ?? 0])

  const hovertemplate = `%{text}<br>${props.selectedMetric}: %{customdata[1]:.3f}<br>Window: ${props.selectedWindowSize}y<br>Year: ${props.selectedCenterYear}<extra></extra>`

  const data: Plotly.Data[] = [
    {
      type: 'scattergeo',
      mode: 'markers',
      lat,
      lon,
      text: entries.map(e => e.label),
      customdata,
      marker: {
        size: entries.map(e => e.id === props.selectedLakeId ? 16 : 10),
        color: colors,
        opacity: entries.map(e => e.id === props.selectedLakeId ? 1 : 0.8),
        line: {
          color: entries.map(e => e.id === props.selectedLakeId ? '#000' : '#1e293b'),
          width: entries.map(e => e.id === props.selectedLakeId ? 3 : 1.5),
        },
      },
      hovertemplate,
      showlegend: false,
    },
  ]

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: `${props.selectedMetric.charAt(0).toUpperCase() + props.selectedMetric.slice(1)} · ${props.selectedWindowSize}y · ${props.selectedCenterYear}`,
    },
    autosize: true,
  }

  return { data, layout }
})

function handleClick(event: any) {
  const lakeId = event?.points?.[0]?.customdata?.[0]
  if (typeof lakeId === 'string')
    emit('selectLake', lakeId)
}
</script>

<template>
  <div
    un-w-full
    un-h-400px
    un-relative
    un-overflow-hidden
  >
    <div un-absolute un-inset-0>
      <PlotlyCompo
        type="map"
        :data="mapFigure.data"
        :layout="mapFigure.layout"
        @plotly-click="handleClick"
      />
    </div>
  </div>
</template>
