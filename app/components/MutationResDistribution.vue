<script setup lang="ts">
import type { Config as PlotlyConfig, Data as PlotlyData, Layout as PlotlyLayout } from 'plotly.js-dist-min'
import type { MutationPoint } from '~/types/mutation'
import { computed, ref } from 'vue'

const props = defineProps<{
  lakes: Array<{
    id: string
    label: string
    lat: number
    lon: number
  }> | undefined
  mutations?: MutationPoint[]
  timeFilterRange: {
    start?: number | undefined
    end?: number | undefined
  }
}>()

const emit = defineEmits<{
  (e: 'selectPoi', id: string): void
}>()

const poi = defineModel<string | undefined>('poi')

function withinTimeFilter(year: number | undefined, filter?: { start?: number | undefined, end?: number | undefined }) {
  if (!filter)
    return true
  if (typeof year !== 'number' || !Number.isFinite(year))
    return false
  if (filter.start != null && year < filter.start)
    return false
  if (filter.end != null && year > filter.end)
    return false
  return true
}

const filteredMutations = computed(() => {
  if (!props.mutations?.length)
    return [] as MutationPoint[]
  return props.mutations.filter(mutation => withinTimeFilter(mutation.year, props.timeFilterRange))
})

const combinedMutationChart = computed<{ data: PlotlyData[], layout: Partial<PlotlyLayout> } | null>(() => {
  if (!filteredMutations.value.length)
    return null

  const countMap = new Map<number, number>()
  for (const mutation of filteredMutations.value)
    countMap.set(mutation.year, (countMap.get(mutation.year) ?? 0) + 1)

  const violinEntries = filteredMutations.value
    .map(mutation => ({
      year: mutation.year,
      delta: mutation.postSen - mutation.preSen,
    }))
    .filter(entry => Number.isFinite(entry.delta))

  if (!countMap.size && !violinEntries.length)
    return null

  const allYears = new Set<number>()
  countMap.forEach((_, year) => allYears.add(year))
  violinEntries.forEach(entry => allYears.add(entry.year))
  const sortedYears = Array.from(allYears).sort((a, b) => a - b)
  if (!sortedYears.length)
    return null
  const yearLabels = sortedYears.map(year => String(year))
  const barCounts = sortedYears.map(year => countMap.get(year) ?? 0)

  const deltaValues = violinEntries.map(entry => entry.delta as number)
  const minDelta = deltaValues.length ? Math.min(...deltaValues) : 0
  const maxDelta = deltaValues.length ? Math.max(...deltaValues) : 0
  const maxAbs = deltaValues.length ? Math.max(Math.abs(minDelta), Math.abs(maxDelta), 1) : 1
  const padding = Math.max(maxAbs * 0.05, 0.1)
  const deltaRange: [number, number] = [-(maxAbs + padding), maxAbs + padding]

  const data: PlotlyData[] = []
  data.push({
    type: 'bar',
    x: yearLabels,
    y: barCounts,
    marker: {
      color: usePlotlyColor('marker'),
      line: { color: usePlotlyColor('markerBorder'), width: 1 },
    },
    hovertemplate: 'Year %{x}: %{y} mutations<extra></extra>',
    name: 'Mutations',
    yaxis: 'y',
  })

  if (violinEntries.length) {
    // Calculate statistics per year for hover info
    const yearStatsMap = new Map<string, { positive: number, negative: number }>()
    for (const entry of violinEntries) {
      const yearStr = String(entry.year)
      if (!yearStatsMap.has(yearStr))
        yearStatsMap.set(yearStr, { positive: 0, negative: 0 })
      const stats = yearStatsMap.get(yearStr)!
      if (entry.delta > 0)
        stats.positive += 1
      else if (entry.delta < 0)
        stats.negative += 1
    }

    data.push({
      type: 'violin',
      x: violinEntries.map(entry => String(entry.year)),
      y: violinEntries.map(entry => entry.delta),
      points: 'all',
      pointpos: 0,
      jitter: 0.25,
      scalemode: 'width',
      spanmode: 'soft',
      fillcolor: usePlotlyColor('floatBg'),
      line: { color: usePlotlyColor('text') },
      marker: {
        color: usePlotlyColor('marker'),
        opacity: 0.85,
        size: 4,
      },
      customdata: violinEntries.map((entry) => {
        const stats = yearStatsMap.get(String(entry.year))!
        return [stats.positive, stats.negative]
      }),
      hovertemplate: 'Year %{x}<br>Delta Sen: %{y:.3f}<br>Positive: %{customdata[0]}, Negative: %{customdata[1]}<extra></extra>',
      name: 'Delta Sen',
      showlegend: false,
      yaxis: 'y2',
    })
  }

  const layout: Partial<PlotlyLayout> = {
    title: { text: 'Mutations & Delta Sen by Year' },
    xaxis: {
      title: { text: 'Year' },
      type: 'category',
      automargin: true,
    },
    yaxis: {
      title: { text: 'Mutation count' },
      rangemode: 'tozero',
      domain: [0.55, 1],
      anchor: 'x',
    },
    yaxis2: {
      title: { text: 'Delta Sen (post - pre)' },
      zeroline: true,
      zerolinecolor: usePlotlyColor('axis'),
      range: deltaRange,
      domain: [0, 0.45],
      anchor: 'x',
    },
    bargap: 0.2,
    margin: { t: 60, r: 30, b: 60, l: 60 },
  }

  if (!violinEntries.length && layout.yaxis)
    layout.yaxis.domain = [0, 1]

  return { data, layout }
})

function computeColorScale(val: number, minV: number, maxV: number) {
  if (minV === maxV)
    return 'hsl(60, 100%, 50%)'
  const t = (val - minV) / (maxV - minV)
  const hue = Math.round((1 - t) * 60)
  return `hsl(${hue}, 100%, 50%)`
}

// function divergingColorScale(v: number, minV: number, maxV: number) {
//   if (minV === maxV)
//     return 'hsl(0, 60%, 50%)'
//   const t = (v - minV) / (maxV - minV)
//   const hue = Math.round((1 - t) * 240) // blue->red
//   return `hsl(${hue}, 70%, 50%)`
// }

const plotData = computed<PlotlyData[]>(() => {
  const pts = props.lakes ?? []
  const mutMap = new Map<string, MutationPoint>()
  ;(filteredMutations.value ?? []).forEach(m => mutMap.set(m.lakeId, m))

  const lat = pts.map(p => p.lat)
  const lon = pts.map(p => p.lon)
  const texts = pts.map(p => p.label + (mutMap.has(p.id) ? `\nMutation: ${mutMap.get(p.id)!.year}` : ''))

  let colors: (string | number)[] = []
  let sizes: number[] = []

  const years = Array.from(mutMap.values()).map(m => m.year)
  const minY = years.length ? Math.min(...years) : 0
  const maxY = years.length ? Math.max(...years) : 0

  // const deltas = pts.map((p) => {
  //   const m = mutMap.get(p.id)
  //   return m ? (m.postAvg - m.preAvg) : Number.NaN
  // })
  // const valid = deltas.filter(v => Number.isFinite(v)) as number[]
  // const minV = valid.length ? Math.min(...valid) : 0
  // const maxV = valid.length ? Math.max(...valid) : 0

  colors = pts.map((p) => {
    const m = mutMap.get(p.id)
    return m?.year ?? usePlotlyColor('background')
  })
  // colors = years
  sizes = pts.map(p => mutMap.has(p.id) ? 12 : 8)

  const traces: PlotlyData[] = [{
    mode: 'markers',
    type: 'scattergeo',
    lat,
    lon,
    text: texts,
    hoverinfo: 'text',
    marker: {
      size: sizes,
      color: colors,
      colorscale: 'YlOrRd',
      reversescale: true,
      line: { width: 1, color: usePlotlyColor('markerBorder') },
    },
    name: 'Lakes',
  }]

  if (poi.value) {
    const selected = pts.find(p => p.id === poi.value)
    if (selected) {
      traces.push({
        mode: 'markers',
        type: 'scattergeo',
        lat: [selected.lat],
        lon: [selected.lon],
        text: [selected.label],
        hoverinfo: 'text',
        marker: {
          size: 18,
          symbol: 'star',
          colorscale: 'YlOrRd',
          color: mutMap.get(selected.id)
            ? computeColorScale(mutMap.get(selected.id)!.year, minY, maxY)
            : usePlotlyColor('background'),
          line: { width: 2, color: usePlotlyColor('title') },
        },
        name: 'Selected',
      })
    }
  }

  return traces
})

const plotLayout = computed<Partial<PlotlyLayout>>(() => ({
  title: { text: 'Lakes Distribution' },
}))

const plotConfig = computed<Partial<PlotlyConfig>>(() => ({
  displayModeBar: false,
  responsive: true,
}))

function handlePointClick(event: any) {
  const point = event?.points?.[0]
  if (!point)
    return
  const idx = typeof point.pointIndex === 'number' ? point.pointIndex : point.pointNumber
  if (typeof idx !== 'number')
    return
  const lake = props.lakes?.[idx]
  if (lake) {
    poi.value = lake.id
    emit('selectPoi', lake.id)
  }
}
</script>

<template>
  <div
    un-flex="~ row items-center"
    un-gap-4
    un-justify-center
  >
    <div
      un-w="50%"
      un-border="~ neutral-300 dark:neutral-700"
    >
      <PlotlyCompo
        :data="plotData"
        :layout="plotLayout"
        :config="plotConfig"
        type="map"
        un-h-40vh
        @plotly-click="handlePointClick"
      />
    </div>
    <div
      un-flex="~ col"
      un-gap-4
      un-w="50%"
      un-grow-1
    >
      <div
        un-flex="~ col"
        un-gap-2
        un-border="~ neutral-300 dark:neutral-700"
      >
        <PlotlyCompo
          v-if="combinedMutationChart"
          :data="combinedMutationChart.data"
          :layout="combinedMutationChart.layout"
          type="chart"
          un-h-40vh
        />
        <p
          v-else
          un-text="neutral-500 dark:neutral-400"
        >
          Not enough data within the selected window.
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped>
</style>
