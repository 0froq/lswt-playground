<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { STLResult } from '~/types/stl'

const props = defineProps<{
  points?: LakePoint[]
  stlResults?: STLResult[]
}>()

const poi = defineModel<string | undefined>('poi')

const mapFigure = computed(() => {
  if (!props.points?.length)
    return { data: [], layout: {} }

  const entries = props.points.map((point) => {
    const stlResult = props.stlResults?.find(r => r.lakeId === point.id)
    const seasonalStrength = stlResult
      ? calculateSeasonalStrength(stlResult.seasonal, stlResult.remainder)
      : 0

    return {
      id: point.id,
      label: point.label ?? point.id,
      lat: point.lat,
      lon: point.lon,
      seasonalStrength,
    }
  }).filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lon))

  if (!entries.length)
    return { data: [], layout: {} }

  const maxStrength = entries.reduce((m, e) => Math.max(m, e.seasonalStrength), 0)

  const lat = entries.map(e => e.lat)
  const lon = entries.map(e => e.lon)
  const colors = entries.map(e => interpolateColor(e.seasonalStrength, maxStrength || 1))
  const sizes = entries.map(e => (poi.value === e.id ? 14 : 10))
  const outlines = entries.map(e => (poi.value === e.id ? '#0f172a' : '#1e293b'))
  const lineWidths = entries.map(e => (poi.value === e.id ? 2.5 : 1.5))

  const hovertemplate = '%{text}<br>Seasonal Strength: %{customdata[1]:.3f}<extra></extra>'
  const customdata = entries.map(e => [e.id, e.seasonalStrength])

  const data: Plotly.Data[] = [
    {
      type: 'scattergeo',
      mode: 'markers',
      lat,
      lon,
      text: entries.map(e => e.label),
      customdata,
      marker: {
        size: sizes,
        color: colors,
        opacity: 0.9,
        line: {
          color: outlines,
          width: lineWidths,
        },
      },
      hovertemplate,
      showlegend: false,
    },
  ]

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: 'Seasonal Strength Map',
    },
  }

  return { data, layout }
})

function calculateSeasonalStrength(seasonal: number[], remainder: number[]): number {
  const varSeasonal = variance(seasonal)
  const varRemainder = variance(remainder)
  return varSeasonal / (varSeasonal + varRemainder)
}

function variance(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = mean(arr)
  return arr.reduce((sum, val) => sum + (val - m) ** 2, 0) / (arr.length - 1)
}

function mean(arr: number[]): number {
  return arr.reduce((sum, val) => sum + val, 0) / arr.length
}

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

function interpolateColor(val: number, maxVal: number) {
  if (!Number.isFinite(val) || !Number.isFinite(maxVal) || maxVal <= 0)
    return '#94a3b8'
  const t = Math.min(1, Math.max(0, val / maxVal))
  const start = hexToRgb('#3b82f6')
  const end = hexToRgb('#ef4444')
  return rgbToHex(
    Math.round(lerp(start.r, end.r, t)),
    Math.round(lerp(start.g, end.g, t)),
    Math.round(lerp(start.b, end.b, t)),
  )
}

function handleClick(event: any) {
  const id = event?.points?.[0]?.customdata?.[0]
  if (typeof id === 'string') {
    poi.value = id
  }
}
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-3
  >
    <div
      un-text="neutral-700 dark:neutral-300"
      un-text-sm
    >
      Click on a point to view its STL decomposition
    </div>
  </div>

  <div>
    <div
      v-if="!props.points?.length"
      un-text="neutral-700 dark:neutral-300"
    >
      No data available to render the map.
    </div>
    <PlotlyCompo
      v-else
      type="map"
      :data="mapFigure.data"
      :layout="mapFigure.layout"
      @plotly-click="handleClick"
    />
  </div>
</template>
