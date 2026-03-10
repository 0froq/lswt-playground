<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { Break, Segment } from '~/types/segments'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  points?: LakePoint[]
  segments?: Segment[]
  breaks?: Break[]
}>()

const poi = defineModel<string | undefined>('poi')

const lakeLabelMap = computed(() => new Map(props.points?.map(p => [p.id, p.label ?? p.id]) ?? []))
const latMap = computed(() => new Map(props.points?.map(p => [p.id, p.lat]) ?? []))
const lonMap = computed(() => new Map(props.points?.map(p => [p.id, p.lon]) ?? []))

const segmentOptions = computed(() => {
  const set = new Set<number>()
  ;(props.segments ?? []).forEach(seg => set.add(seg.segmentIndex))
  return Array.from(set).sort((a, b) => a - b).map(idx => `Seg ${idx + 1}`)
})

const breakOptions = computed(() => {
  const set = new Set<number>()
  ;(props.breaks ?? []).forEach(bk => set.add(bk.breakIndex))
  return Array.from(set).sort((a, b) => a - b).map(idx => `Break ${idx + 1}`)
})

const selection = ref<string>('')

watch([segmentOptions, breakOptions], () => {
  if (selection.value && [...segmentOptions.value, ...breakOptions.value].includes(selection.value))
    return
  if (segmentOptions.value.length)
    selection.value = segmentOptions.value[0]!
  else if (breakOptions.value.length)
    selection.value = breakOptions.value[0]!
  else
    selection.value = ''
}, { immediate: true })

const segColorMode = ref<'slope' | 'var'>('slope')
const segSignFilter = ref<'all' | 'gt0' | 'lt0'>('all')
const breakSignFilter = ref<'all' | 'gt0' | 'lt0'>('all')

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
  const t = (clamped + maxAbs) / (2 * maxAbs) // -maxAbs -> 0, +maxAbs -> 1
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

function signPasses(value: number | undefined, filter: 'all' | 'gt0' | 'lt0') {
  if (!Number.isFinite(value))
    return false
  if (filter === 'all')
    return true
  if (filter === 'gt0')
    return value! > 0
  return value! < 0
}

const mapFigure = computed(() => {
  if (!selection.value || !props.points?.length)
    return { data: [], layout: {} }

  let kind: 'seg' | 'break' | null = null
  let targetIdx = 0
  if (selection.value.startsWith('Seg')) {
    kind = 'seg'
    targetIdx = Number.parseInt(selection.value.replace(/\D/g, ''), 10) - 1
  }
  else if (selection.value.startsWith('Break')) {
    kind = 'break'
    targetIdx = Number.parseInt(selection.value.replace(/\D/g, ''), 10) - 1
  }

  if (kind === null || Number.isNaN(targetIdx))
    return { data: [], layout: {} }
  const entries: Array<{
    id: string
    label: string
    lat: number
    lon: number
    value: number
    displayValue: number
  }> = []

  if (kind === 'seg') {
    const filtered = (props.segments ?? []).filter(seg => seg.segmentIndex === targetIdx)
    filtered.forEach((seg) => {
      const lat = latMap.value.get(seg.lakeId)
      const lon = lonMap.value.get(seg.lakeId)
      if (!Number.isFinite(lat) || !Number.isFinite(lon))
        return
      const label = lakeLabelMap.value.get(seg.lakeId) ?? seg.lakeId
      const value = segColorMode.value === 'slope' ? seg.slope : seg.var
      entries.push({
        id: seg.lakeId,
        label,
        lat: lat!,
        lon: lon!,
        value,
        displayValue: segColorMode.value === 'slope' ? seg.slope : seg.var,
      })
    })
  }
  else if (kind === 'break') {
    const filtered = (props.breaks ?? []).filter(bk => bk.breakIndex === targetIdx)
    filtered.forEach((bk) => {
      const lat = latMap.value.get(bk.lakeId)
      const lon = lonMap.value.get(bk.lakeId)
      if (!Number.isFinite(lat) || !Number.isFinite(lon))
        return
      const label = lakeLabelMap.value.get(bk.lakeId) ?? bk.lakeId
      entries.push({
        id: bk.lakeId,
        label,
        lat: lat!,
        lon: lon!,
        value: bk.deltaSlope,
        displayValue: bk.deltaSlope,
      })
    })
  }

  if (!entries.length)
    return { data: [], layout: {} }

  const activeFilter = kind === 'seg' ? segSignFilter.value : breakSignFilter.value
  const maxAbs = entries.reduce((m, e) => Math.max(m, Math.abs(e.value)), 0)

  const lat = entries.map(e => e.lat)
  const lon = entries.map(e => e.lon)
  const colors = entries.map((e) => {
    const pass = signPasses(e.value, activeFilter)
    return pass ? interpolateColor(e.value, maxAbs || 1) : '#cbd5e1'
  })
  const opacities = entries.map(e => (signPasses(e.value, activeFilter) ? 0.9 : 0.35))
  const sizes = entries.map((e) => {
    const isSelected = poi.value === e.id
    const pass = signPasses(e.value, activeFilter)
    if (isSelected)
      return pass ? 14 : 12
    return pass ? 10 : 8
  })
  const outlines = entries.map(e => (poi.value === e.id ? '#0f172a' : '#1e293b'))
  const lineWidths = entries.map(e => (poi.value === e.id ? 2.5 : 1.5))

  const metricLabel = kind === 'seg'
    ? (segColorMode.value === 'slope' ? 'Slope' : 'Var')
    : 'Δ Sen'

  const hovertemplate = `%{text}<br>${metricLabel}: %{customdata[1]:.3f}<extra></extra>`

  const customdata = entries.map(e => [e.id, e.displayValue])

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
        opacity: opacities,
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
      text: kind === 'seg'
        ? `${metricLabel} · Seg ${targetIdx + 1}`
        : `${metricLabel} · Break ${targetIdx + 1}`,
    },
  }

  return { data, layout }
})

function handleClick(event: any) {
  const id = event?.points?.[0]?.customdata?.[0]
  if (typeof id === 'string')
    poi.value = id
}
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-3
  >
    <QLabelValuePair
      label-id="map-target"
      label-text="Source"
      un-shrink-0
    >
      <template #value>
        <QSelect
          v-model="selection"
          :items="[...segmentOptions, ...breakOptions]"
          placeholder="Select Segment/Break"
        />
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      v-if="selection.startsWith('Seg')"
      label-id="seg-color-mode"
      label-text="Color Mode"
      un-shrink-0
    >
      <template #value>
        <QSelect
          v-model="segColorMode"
          :items="['slope', 'var']"
        />
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      v-if="selection.startsWith('Seg')"
      label-id="seg-filter"
      label-text="Slope Filter"
      un-shrink-0
    >
      <template #value>
        <QSelect
          v-model="segSignFilter"
          :items="[
            'all',
            'gt0',
            'lt0',
            // { value: 'all', label: '全部' },
            // { value: 'gt0', label: '> 0' },
            // { value: 'lt0', label: '< 0' },
          ]"
        />
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      v-else-if="selection.startsWith('Break')"
      label-id="break-filter"
      label-text="Δ Sen Filter"
      un-shrink-0
    >
      <template #value>
        <QSelect
          v-model="breakSignFilter"
          :items="[
            'all',
            'gt0',
            'lt0',
            // { value: 'all', label: '全部' },
            // { value: 'gt0', label: '> 0' },
            // { value: 'lt0', label: '< 0' },
          ]"
        />
      </template>
    </QLabelValuePair>
  </div>

  <div>
    <div
      v-if="!props.points?.length"
      un-text="neutral-700 dark:neutral-300"
    >
      <!-- No coordinate data available to render the map. -->
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
