<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { STLResult } from '~/types/stl'
import type { STLTrendAnalysisItem, STLMapMode } from '~/types/stl-trend'

const props = defineProps<{
  points?: LakePoint[]
  stlResults?: STLResult[]
  trendAnalysis?: STLTrendAnalysisItem[]
}>()

const poi = defineModel<string | undefined>('poi')

const mapMode = ref<STLMapMode>('seasonal-strength')

const modeOptions = [
  { label: 'Seasonal Strength', value: 'seasonal-strength' },
  { label: 'Biggest Slope Period', value: 'biggest-slope-period' },
  { label: 'Smallest Slope Period', value: 'smallest-slope-period' },
  { label: 'Biggest Avg Period', value: 'biggest-avg-period' },
  { label: 'Smallest Avg Period', value: 'smallest-avg-period' },
  { label: 'Biggest Var Period', value: 'biggest-var-period' },
  { label: 'Smallest Var Period', value: 'smallest-var-period' },
  { label: 'Seasonal Amplitude Trend', value: 'seasonal-amplitude-trend' },
  { label: 'Biggest dSlope Mutation', value: 'biggest-d-slope-mutation' },
  { label: 'Smallest dSlope Mutation', value: 'smallest-d-slope-mutation' },
  { label: 'Biggest dAvg Mutation', value: 'biggest-d-avg-mutation' },
  { label: 'Smallest dAvg Mutation', value: 'smallest-d-avg-mutation' },
]

// Period labels for display
const periodLabels = ['2001-04', '2005-08', '2009-12', '2013-16', '2017-20']
const periodColors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const mutationColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6']

// Determine if current mode uses period colors or mutation colors
const usesPeriodColors = computed(() => {
  return mapMode.value.includes('period') && !mapMode.value.includes('mutation')
})

const usesMutationColors = computed(() => {
  return mapMode.value.includes('mutation')
})

// Get number of breaks from data
const breakCount = computed(() => {
  return props.trendAnalysis?.[0]?.breaks?.length || 4
})

const mapFigure = computed(() => {
  if (!props.points?.length)
    return { data: [], layout: {} }

  const entries = props.points.map((point) => {
    const stlResult = props.stlResults?.find(r => r.lakeId === point.id)
    const trendItem = props.trendAnalysis?.find(a => a.lakeId === point.id)

    let metric = 0
    let color = '#94a3b8'
    let label = ''

    const hasTrendAnalysis = !!trendItem && !!trendItem.mapMetrics
    const hasSegments = hasTrendAnalysis && trendItem!.segments.length > 0
    const hasBreaks = hasTrendAnalysis && trendItem!.breaks.length > 0

    switch (mapMode.value) {
      case 'seasonal-strength': {
        metric = stlResult
          ? calculateSeasonalStrength(stlResult.seasonal, stlResult.remainder)
          : 0
        color = interpolateColor(metric, 1)
        label = `Seasonal Strength: ${metric.toFixed(3)}`
        break
      }
      case 'biggest-slope-period': {
        if (!hasSegments) {
          color = '#94a3b8'
          label = 'No trend data'
        } else {
          const biggestIndex = trendItem!.segments.reduce((maxIdx, seg, idx, arr) =>
            seg.slope > arr[maxIdx]!.slope ? idx : maxIdx, 0)
          metric = biggestIndex
          color = getPeriodColor(biggestIndex)
          const seg = trendItem!.segments[biggestIndex]
          label = `Biggest Slope: ${periodLabels[biggestIndex]} (${seg!.slope.toFixed(4)} °C/year)`
        }
        break
      }
      case 'smallest-slope-period': {
        if (!hasSegments) {
          color = '#94a3b8'
          label = 'No trend data'
        } else {
          const smallestIndex = trendItem!.segments.reduce((minIdx, seg, idx, arr) =>
            seg.slope < arr[minIdx]!.slope ? idx : minIdx, 0)
          metric = smallestIndex
          color = getPeriodColor(smallestIndex)
          const seg = trendItem!.segments[smallestIndex]
          label = `Smallest Slope: ${periodLabels[smallestIndex]} (${seg!.slope.toFixed(4)} °C/year)`
        }
        break
      }
      case 'biggest-avg-period': {
        if (!hasSegments) {
          color = '#94a3b8'
          label = 'No trend data'
        } else {
          const biggestIndex = trendItem!.segments.reduce((maxIdx, seg, idx, arr) =>
            seg.mean > arr[maxIdx]!.mean ? idx : maxIdx, 0)
          metric = biggestIndex
          color = getPeriodColor(biggestIndex)
          const seg = trendItem!.segments[biggestIndex]
          label = `Biggest Avg: ${periodLabels[biggestIndex]} (${seg!.mean.toFixed(2)}°C)`
        }
        break
      }
      case 'smallest-avg-period': {
        if (!hasSegments) {
          color = '#94a3b8'
          label = 'No trend data'
        } else {
          const smallestIndex = trendItem!.segments.reduce((minIdx, seg, idx, arr) =>
            seg.mean < arr[minIdx]!.mean ? idx : minIdx, 0)
          metric = smallestIndex
          color = getPeriodColor(smallestIndex)
          const seg = trendItem!.segments[smallestIndex]
          label = `Smallest Avg: ${periodLabels[smallestIndex]} (${seg!.mean.toFixed(2)}°C)`
        }
        break
      }
      case 'biggest-var-period': {
        if (!hasSegments) {
          color = '#94a3b8'
          label = 'No trend data'
        } else {
          const biggestIndex = trendItem!.segments.reduce((maxIdx, seg, idx, arr) =>
            seg.variance > arr[maxIdx]!.variance ? idx : maxIdx, 0)
          metric = biggestIndex
          color = getPeriodColor(biggestIndex)
          const seg = trendItem!.segments[biggestIndex]
          label = `Biggest Var: ${periodLabels[biggestIndex]} (${seg!.variance.toFixed(4)})`
        }
        break
      }
      case 'smallest-var-period': {
        if (!hasSegments) {
          color = '#94a3b8'
          label = 'No trend data'
        } else {
          const smallestIndex = trendItem!.segments.reduce((minIdx, seg, idx, arr) =>
            seg.variance < arr[minIdx]!.variance ? idx : minIdx, 0)
          metric = smallestIndex
          color = getPeriodColor(smallestIndex)
          const seg = trendItem!.segments[smallestIndex]
          label = `Smallest Var: ${periodLabels[smallestIndex]} (${seg!.variance.toFixed(4)})`
        }
        break
      }
      case 'seasonal-amplitude-trend': {
        if (!hasTrendAnalysis) {
          color = '#94a3b8'
          label = 'No trend data'
        } else {
          metric = trendItem!.mapMetrics.seasonalAmplitudeSlope ?? 0
          const maxAmp = Math.max(
            ...props.trendAnalysis?.map(a => Math.abs(a.mapMetrics.seasonalAmplitudeSlope)) || [1]
          )
          color = interpolateDivergingColor(metric, maxAmp)
          label = `Amplitude Trend: ${metric.toFixed(4)} °C/year`
        }
        break
      }
      case 'biggest-d-slope-mutation': {
        if (!hasBreaks) {
          color = '#94a3b8'
          label = 'No break data'
        } else {
          const biggestIndex = trendItem!.breaks.reduce((maxIdx, brk, idx, arr) =>
            brk.deltaSlope > arr[maxIdx]!.deltaSlope ? idx : maxIdx, 0)
          metric = biggestIndex
          color = getMutationColor(biggestIndex)
          const brk = trendItem!.breaks[biggestIndex]
          label = `Biggest dSlope: ${brk!.deltaSlope.toFixed(4)} at ${brk!.breakYear}`
        }
        break
      }
      case 'smallest-d-slope-mutation': {
        if (!hasBreaks) {
          color = '#94a3b8'
          label = 'No break data'
        } else {
          const smallestIndex = trendItem!.breaks.reduce((minIdx, brk, idx, arr) =>
            brk.deltaSlope < arr[minIdx]!.deltaSlope ? idx : minIdx, 0)
          metric = smallestIndex
          color = getMutationColor(smallestIndex)
          const brk = trendItem!.breaks[smallestIndex]
          label = `Smallest dSlope: ${brk!.deltaSlope.toFixed(4)} at ${brk!.breakYear}`
        }
        break
      }
      case 'biggest-d-avg-mutation': {
        if (!hasBreaks) {
          color = '#94a3b8'
          label = 'No break data'
        } else {
          const biggestIndex = trendItem!.breaks.reduce((maxIdx, brk, idx, arr) =>
            brk.deltaMean > arr[maxIdx]!.deltaMean ? idx : maxIdx, 0)
          metric = biggestIndex
          color = getMutationColor(biggestIndex)
          const brk = trendItem!.breaks[biggestIndex]
          label = `Biggest dAvg: ${brk!.deltaMean.toFixed(2)}°C at ${brk!.breakYear}`
        }
        break
      }
      case 'smallest-d-avg-mutation': {
        if (!hasBreaks) {
          color = '#94a3b8'
          label = 'No break data'
        } else {
          const smallestIndex = trendItem!.breaks.reduce((minIdx, brk, idx, arr) =>
            brk.deltaMean < arr[minIdx]!.deltaMean ? idx : minIdx, 0)
          metric = smallestIndex
          color = getMutationColor(smallestIndex)
          const brk = trendItem!.breaks[smallestIndex]
          label = `Smallest dAvg: ${brk!.deltaMean.toFixed(2)}°C at ${brk!.breakYear}`
        }
        break
      }
    }

    return {
      id: point.id,
      label: point.label ?? point.id,
      lat: point.lat,
      lon: point.lon,
      metric,
      color,
      labelText: label,
    }
  }).filter(e => Number.isFinite(e.lat) && Number.isFinite(e.lon))

  if (!entries.length)
    return { data: [], layout: {} }

  const sizes = entries.map(e => (poi.value === e.id ? 14 : 10))
  const outlines = entries.map(e => (poi.value === e.id ? '#0f172a' : '#1e293b'))
  const lineWidths = entries.map(e => (poi.value === e.id ? 2.5 : 1.5))

  const data: Plotly.Data[] = [
    {
      type: 'scattergeo',
      mode: 'markers',
      lat: entries.map(e => e.lat),
      lon: entries.map(e => e.lon),
      text: entries.map(e => e.label),
      customdata: entries.map(e => [e.id, e.labelText]),
      marker: {
        size: sizes,
        color: entries.map(e => e.color),
        opacity: 0.9,
        line: {
          color: outlines,
          width: lineWidths,
        },
      },
      hovertemplate: '%{text}<br>%{customdata[1]}<extra></extra>',
      showlegend: false,
    },
  ]

  const layout: Partial<Plotly.Layout> = {
    title: {
      text: modeOptions.find(m => m.value === mapMode.value)?.label ?? 'STL Map',
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

function interpolateColor(val: number, maxVal: number): string {
  if (!Number.isFinite(val) || !Number.isFinite(maxVal) || maxVal <= 0)
    return '#94a3b8'
  const t = Math.min(1, Math.max(0, val / maxVal))
  return rgbToHex(
    Math.round(lerp(59, 239, t)),
    Math.round(lerp(130, 68, t)),
    Math.round(lerp(246, 68, t)),
  )
}

function interpolateDivergingColor(val: number, maxVal: number): string {
  if (!Number.isFinite(val) || !Number.isFinite(maxVal) || maxVal <= 0)
    return '#94a3b8'
  const t = val / maxVal
  if (t < 0) {
    const intensity = Math.min(1, Math.abs(t))
    return rgbToHex(
      Math.round(lerp(148, 59, intensity)),
      Math.round(lerp(163, 130, intensity)),
      Math.round(lerp(184, 246, intensity)),
    )
  }
  else {
    const intensity = Math.min(1, t)
    return rgbToHex(
      Math.round(lerp(148, 239, intensity)),
      Math.round(lerp(163, 68, intensity)),
      Math.round(lerp(184, 68, intensity)),
    )
  }
}

function getPeriodColor(index: number): string {
  return periodColors[index] ?? '#94a3b8'
}

function getMutationColor(index: number): string {
  return mutationColors[index] ?? '#94a3b8'
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`
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
      un-flex="~ row"
      un-gap-4
      un-items-center
    >
      <QLabelValuePair
        label-id="map-mode"
        label-text="Map Mode"
        un-flex-1
      >
        <template #value>
          <QSelect
            v-model="mapMode"
            :items="modeOptions.map(o => o.value)"
          />
        </template>
      </QLabelValuePair>
    </div>

    <!-- Legend for Period Colors -->
    <div
      v-if="usesPeriodColors"
      un-flex="~ col"
      un-gap-2
      un-p-3
      un-rounded
      un-bg="neutral-100 dark:neutral-800"
    >
      <div un-text="xs font-semibold neutral-700 dark:neutral-300">
        Period Legend
      </div>
      <div un-flex="~ row wrap" un-gap-3>
        <div
          v-for="(label, idx) in periodLabels.slice(0, 5)"
          :key="idx"
          un-flex="~ row"
          un-gap-2
          un-items-center
        >
          <div
            un-w-3
            un-h-3
            un-rounded-full
            :style="{ backgroundColor: periodColors[idx] }"
          />
          <span un-text="xs neutral-600 dark:neutral-400">{{ label }}</span>
        </div>
      </div>
    </div>

    <!-- Legend for Mutation Colors -->
    <div
      v-if="usesMutationColors"
      un-flex="~ col"
      un-gap-2
      un-p-3
      un-rounded
      un-bg="neutral-100 dark:neutral-800"
    >
      <div un-text="xs font-semibold neutral-700 dark:neutral-300">
        Break Point Legend
      </div>
      <div un-flex="~ row wrap" un-gap-3>
        <div
          v-for="i in breakCount"
          :key="i"
          un-flex="~ row"
          un-gap-2
          un-items-center
        >
          <div
            un-w-3
            un-h-3
            un-rounded-full
            :style="{ backgroundColor: mutationColors[i - 1] }"
          />
          <span un-text="xs neutral-600 dark:neutral-400">Break {{ i }}</span>
        </div>
      </div>
    </div>

    <div
      un-text="neutral-700 dark:neutral-300"
      un-text-sm
    >
      Click on a point to view its STL decomposition and trend analysis
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
  </div>
</template>
