<script setup lang="ts">
import type { Data, Layout } from 'plotly.js-dist-min'
import type { Break, Segment } from '~/types/segments'
import { computed } from 'vue'
import { usePlotlyColor } from '~/composables/usePlotlyColor'

interface ChartSpec {
  key: string
  title: string
  data: Data[]
  layout: Partial<Layout>
}

const props = defineProps<{
  segments?: Segment[]
  breaks?: Break[]
}>()

const axisColor = usePlotlyColor('axis')
const textColor = usePlotlyColor('text')
const gridColor = usePlotlyColor('grid')

const segmentColors = ['#14b8a6', '#eab308', '#6366f1', '#f43f5e', '#84cc16']
const breakColors = ['#f97316', '#10b981', '#ec4899', '#06b6d4']

function colorForGroup(groupKey: string): string {
  if (groupKey.startsWith('seg-')) {
    const idx = Number(groupKey.split('-')[1] ?? 0)
    return segmentColors[idx % segmentColors.length] || segmentColors[0]
  }
  if (groupKey.startsWith('break-')) {
    const idx = Number(groupKey.split('-')[1] ?? 0)
    return breakColors[idx % breakColors.length] || breakColors[0]
  }
  return textColor
}

function buildViolinChart<T>(opts: {
  key: string
  title: string
  items: T[]
  groupLabel: string
  groupKeyPrefix: string
  groupValue: (item: T) => number | undefined
  value: (item: T) => number | undefined
}): ChartSpec | null {
  const { key, title, items, groupLabel, groupKeyPrefix, groupValue, value } = opts
  if (!items.length)
    return null

  const buckets = new Map<string, number[]>()
  const bucketColors = new Map<string, string>()
  for (const item of items) {
    const gRaw = groupValue(item)
    const v = value(item)
    if (gRaw === undefined || Number.isNaN(gRaw) || v === undefined || Number.isNaN(v))
      continue
    const groupKey = `${groupKeyPrefix}${Math.trunc(gRaw)}`
    const g = `${groupLabel} ${Math.trunc(gRaw) + 1}`
    const list = buckets.get(g) ?? []
    list.push(v)
    buckets.set(g, list)
    if (!bucketColors.has(g))
      bucketColors.set(g, colorForGroup(groupKey))
  }

  if (!buckets.size)
    return null

  const data: Data[] = []
  for (const [bucket, ys] of buckets.entries()) {
    const color = bucketColors.get(bucket) ?? textColor
    data.push({
      type: 'violin',
      name: bucket,
      x: Array.from({ length: ys.length }, () => bucket),
      y: ys,
      box: { visible: true },
      meanline: { visible: true },
      points: 'outliers',
      marker: { color },
      line: { color },
      fillcolor: `${color}33`,
    })
  }

  const layout: Partial<Plotly.Layout> = {
    title: { text: title, font: { color: textColor } },
    violinmode: 'group',
    margin: { l: 50, r: 20, t: 50, b: 50 },
    xaxis: {
      title: { text: groupLabel, font: { color: textColor } },
      tickfont: { color: textColor },
      gridcolor: gridColor,
      zerolinecolor: axisColor,
    },
    yaxis: {
      title: { text: title, font: { color: textColor } },
      tickfont: { color: textColor },
      gridcolor: gridColor,
      zerolinecolor: axisColor,
    },
    showlegend: true,
    legend: { font: { color: textColor } },
  }

  return { key, title, data, layout }
}

const segCharts = computed(() => {
  const segs = props.segments ?? []
  return [
    buildViolinChart<Segment>({
      key: 'seg-avg',
      title: 'Seg Avg',
      items: segs,
      groupLabel: 'Seg',
      groupKeyPrefix: 'seg-',
      groupValue: s => s.segmentIndex,
      value: s => s.avg,
    }),
    buildViolinChart<Segment>({
      key: 'seg-slope',
      title: 'Seg Sen',
      items: segs,
      groupLabel: 'Seg',
      groupKeyPrefix: 'seg-',
      groupValue: s => s.segmentIndex,
      value: s => s.slope,
    }),
    buildViolinChart<Segment>({
      key: 'seg-var',
      title: 'Seg Var',
      items: segs,
      groupLabel: 'Seg',
      groupKeyPrefix: 'seg-',
      groupValue: s => s.segmentIndex,
      value: s => s.var,
    }),
  ].filter(Boolean) as ChartSpec[]
})

const breakCharts = computed(() => {
  const brks = props.breaks ?? []
  return [
    buildViolinChart<Break>({
      key: 'brk-delta-avg',
      title: 'Break Δ Avg',
      items: brks,
      groupLabel: 'Break',
      groupKeyPrefix: 'break-',
      groupValue: b => b.breakIndex,
      value: b => b.deltaAvg,
    }),
    buildViolinChart<Break>({
      key: 'brk-delta-sen',
      title: 'Break Δ Sen',
      items: brks,
      groupLabel: 'Break',
      groupKeyPrefix: 'break-',
      groupValue: b => b.breakIndex,
      value: b => b.deltaSlope,
    }),
    buildViolinChart<Break>({
      key: 'brk-delta-var',
      title: 'Break Δ Var',
      items: brks,
      groupLabel: 'Break',
      groupKeyPrefix: 'break-',
      groupValue: b => b.breakIndex,
      value: b => b.deltaVar,
    }),
  ].filter(Boolean) as ChartSpec[]
})
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-4
  >
    <div>
      <div
        v-if="!segCharts.length"
        un-text="sm neutral-500 dark:neutral-400"
      >
        No segment data to plot.
      </div>
      <div
        v-else
        un-grid="~ cols-1 md:cols-3"
        un-gap-4
      >
        <PlotlyCompo
          v-for="chart in segCharts"
          :key="chart.key"
          :data="chart.data"
          :layout="chart.layout"
        />
      </div>
    </div>

    <div>
      <div
        v-if="!breakCharts.length"
        un-text="sm neutral-500 dark:neutral-400"
      >
        No break data to plot.
      </div>
      <div
        v-else
        un-grid="~ cols-1 md:cols-3"
        un-gap-4
      >
        <PlotlyCompo
          v-for="chart in breakCharts"
          :key="chart.key"
          :data="chart.data"
          :layout="chart.layout"
        />
      </div>
    </div>
  </div>
</template>
