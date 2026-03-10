<script setup lang="ts">
import type { LakeFactors } from '~/types/factor'
import type { LakePoint } from '~/types/mutation'
import type { Break, Segment } from '~/types/segments'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  points?: LakePoint[]
  segments?: Segment[]
  breaks?: Break[]
  lakeFactors?: Map<string, LakeFactors>
}>()

const lakeLabelMap = computed(() => new Map(props.points?.map(p => [p.id, p.label ?? p.id]) ?? []))

interface SegmentEntry {
  kind: 'segment' | 'break'
  groupKey: string
  groupLabel: string
  lakeId: string
  markerLabel: string
  metrics: Record<string, number | undefined>
}

const entries = computed<SegmentEntry[]>(() => {
  const list: SegmentEntry[] = []

  props.segments?.forEach((seg) => {
    const groupKey = `seg-${seg.segmentIndex}`
    const groupLabel = `Segment ${seg.segmentIndex + 1}`
    const lakeLabel = lakeLabelMap.value.get(seg.lakeId) ?? seg.lakeId
    list.push({
      kind: 'segment',
      groupKey,
      groupLabel,
      lakeId: seg.lakeId,
      markerLabel: `${lakeLabel} · ${groupLabel}`,
      metrics: {
        segStartYear: seg.startYear,
        segEndYear: seg.endYear,
        segLength: seg.endYear - seg.startYear + 1,
        segAvg: seg.avg,
        segSlope: seg.slope,
        segVar: seg.var,
        segP: seg.p,
      },
    })
  })

  props.breaks?.forEach((bk) => {
    const groupKey = `break-${bk.breakIndex}`
    const groupLabel = `Break ${bk.breakIndex + 1}`
    const lakeLabel = lakeLabelMap.value.get(bk.lakeId) ?? bk.lakeId
    list.push({
      kind: 'break',
      groupKey,
      groupLabel,
      lakeId: bk.lakeId,
      markerLabel: `${lakeLabel} · ${groupLabel}`,
      metrics: {
        breakYear: bk.year,
        deltaAvg: bk.deltaAvg,
        deltaSlope: bk.deltaSlope,
        deltaVar: bk.deltaVar,
        breakP: bk.p,
        breakD: bk.cohenD,
      },
    })
  })

  return list
})

const groupItems = computed(() => {
  const seen = new Set<string>()
  const items: string[] = []
  for (const entry of entries.value) {
    if (!seen.has(entry.groupKey)) {
      seen.add(entry.groupKey)
      items.push(entry.groupKey)
    }
  }
  return items
})

const groupLabelMap = computed(() => {
  const map = new Map<string, string>()
  entries.value.forEach(entry => map.set(entry.groupKey, entry.groupLabel))
  return map
})

const selectedGroups = ref<string[]>([])

watch(entries, (next) => {
  if (!selectedGroups.value.length && next.length)
    selectedGroups.value = [...groupItems.value]
  if (!next.length)
    selectedGroups.value = []
}, { immediate: true })

const metricParams = [
  // { key: 'segStartYear', label: 'Seg Start Year' },
  // { key: 'segEndYear', label: 'Seg End Year' },
  // { key: 'segLength', label: 'Seg Length' },
  { key: 'segAvg', label: 'Seg Avg' },
  { key: 'segSlope', label: 'Seg Sen' },
  { key: 'segVar', label: 'Seg Var' },
  { key: 'segP', label: 'Seg p' },
  // { key: 'breakYear', label: 'Break Year' },
  { key: 'deltaAvg', label: 'Δ Avg' },
  { key: 'deltaSlope', label: 'Δ Sen' },
  { key: 'deltaVar', label: 'Δ Var' },
  { key: 'breakP', label: 'Break p' },
  { key: 'breakD', label: 'Break d' },
] as const

// 因子分组选择，默认 avg 组（dl + *_avg）
const factorGroup = ref<'avg' | 'slope' | 'r_square' | 'var' | 'all'>('avg')

type MetricKey = typeof metricParams[number]['key']

type Axis = 'metric' | 'factor'

type AxisParam = MetricKey | string

const selectedMetricParams = ref<MetricKey[]>(metricParams.map(p => p.key))
const selectedFactorParams = ref<string[]>([])

const dynamicFactorParams = computed<string[]>(() => {
  if (!props.lakeFactors || props.lakeFactors.size === 0)
    return []
  const keys = new Set<string>()
  for (const [, factor] of props.lakeFactors.entries()) {
    if (!factor)
      continue
    Object.entries(factor).forEach(([key, val]) => {
      if (['lake', 'lat', 'lon', 'id'].includes(key))
        return
      if (typeof val === 'number' && Number.isFinite(val))
        keys.add(key)
    })
  }
  const allKeys = Array.from(keys).sort()
  let filtered: string[] = []
  switch (factorGroup.value) {
    case 'avg':
      filtered = allKeys.filter(k => k === 'dl' || k.endsWith('_avg'))
      break
    case 'slope':
      filtered = allKeys.filter(k => k === 'dl' || k.endsWith('_slope'))
      break
    case 'r_square':
      filtered = allKeys.filter(k => k === 'dl' || k.endsWith('_r_square'))
      break
    case 'var':
      filtered = allKeys.filter(k => k === 'dl' || k.endsWith('_var'))
      break
    default:
      filtered = allKeys
      break
  }
  return filtered.length ? filtered : allKeys
})

watch(dynamicFactorParams, (next) => {
  if (!selectedFactorParams.value.length)
    selectedFactorParams.value = [...next]
  else
    selectedFactorParams.value = selectedFactorParams.value.filter(p => next.includes(p))
}, { immediate: true })

watch(factorGroup, () => {
  // 切换分组时，重置选中项为该组全部可用因子
  selectedFactorParams.value = [...dynamicFactorParams.value]
})

const metricParamsSelected = computed<MetricKey[]>(() => selectedMetricParams.value.length ? selectedMetricParams.value : metricParams.map(p => p.key))
const factorParamsSelected = computed<string[]>(() => selectedFactorParams.value.length ? selectedFactorParams.value : [...dynamicFactorParams.value])

const columnsAreMetric = computed(() => metricParamsSelected.value.length >= factorParamsSelected.value.length)
const columnParams = computed<AxisParam[]>(() => columnsAreMetric.value ? metricParamsSelected.value : factorParamsSelected.value)
const rowParams = computed<AxisParam[]>(() => columnsAreMetric.value ? factorParamsSelected.value : metricParamsSelected.value)
const columnAxisType = computed<Axis>(() => columnsAreMetric.value ? 'metric' : 'factor')
const rowAxisType = computed<Axis>(() => columnsAreMetric.value ? 'factor' : 'metric')
const columnCount = computed(() => columnParams.value.length)

const paramLabels: Record<MetricKey, string> = metricParams.reduce((acc, cur) => ({ ...acc, [cur.key]: cur.label }), {} as Record<MetricKey, string>)

interface MatrixCell {
  xLabel: string
  yLabel: string
  data: Array<{ x: number, y: number, label: string, groupKey: string, active: boolean }>
}

function getMetricValue(entry: SegmentEntry, key: MetricKey) {
  const val = entry.metrics[key]
  return typeof val === 'number' && Number.isFinite(val) ? val : undefined
}

function getAxisValue(entry: SegmentEntry, factors: LakeFactors | undefined, param: AxisParam, axis: Axis) {
  if (axis === 'metric')
    return getMetricValue(entry, param as MetricKey)
  if (!factors)
    return undefined
  const val = factors[param as string]
  return typeof val === 'number' && Number.isFinite(val) ? val : undefined
}

function getAxisLabel(param: AxisParam, axis: Axis) {
  if (axis === 'metric')
    return paramLabels[param as MetricKey] ?? param
  return param
}

const activeGroupSet = computed(() => new Set(selectedGroups.value))

const matrixData = computed<MatrixCell[][]>(() => {
  if (!entries.value.length || (!props.lakeFactors || props.lakeFactors.size === 0))
    return []

  const matrix: MatrixCell[][] = []

  for (const rowParam of rowParams.value) {
    const row: MatrixCell[] = []
    for (const columnParam of columnParams.value) {
      const data: Array<{ x: number, y: number, label: string, groupKey: string, active: boolean }> = []
      const xLabel = getAxisLabel(columnParam, columnAxisType.value)
      const yLabel = getAxisLabel(rowParam, rowAxisType.value)

      for (const entry of entries.value) {
        const factors = props.lakeFactors?.get(entry.lakeId)
        const xValue = getAxisValue(entry, factors, columnParam, columnAxisType.value)
        const yValue = getAxisValue(entry, factors, rowParam, rowAxisType.value)
        if (typeof xValue === 'number' && typeof yValue === 'number') {
          const active = activeGroupSet.value.size === 0 ? true : activeGroupSet.value.has(entry.groupKey)
          data.push({
            x: xValue,
            y: yValue,
            label: entry.markerLabel,
            groupKey: entry.groupKey,
            active,
          })
        }
      }

      row.push({ xLabel, yLabel, data })
    }
    matrix.push(row)
  }

  return matrix
})

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
  return usePlotlyColor('marker')
}

function createScatterChart(cell: MatrixCell) {
  if (!cell.data.length)
    return null

  const colors = cell.data.map(d => (d.active ? colorForGroup(d.groupKey) : '#c0c0c0'))
  const opacities = cell.data.map(d => (d.active ? 0.8 : 0.1))
  const sizes = cell.data.map(d => (d.active ? 6 : 2))

  const data: Plotly.Data[] = [{
    type: 'scatter',
    mode: 'markers',
    x: cell.data.map(d => d.x),
    y: cell.data.map(d => d.y),
    text: cell.data.map(d => d.label),
    marker: {
      size: sizes,
      color: colors,
      opacity: opacities,
      line: { color: usePlotlyColor('markerBorder'), width: 0.5 },
    },
    hovertemplate: '%{text}<br>%{xaxis.title.text}: %{x:.2f}<br>%{yaxis.title.text}: %{y:.2f}<extra></extra>',
    showlegend: false,
  }]

  const layout: Partial<Plotly.Layout> = {
    xaxis: {
      title: { text: cell.xLabel, font: { size: 10 } },
      showticklabels: false,
      showgrid: true,
      gridcolor: usePlotlyColor('grid'),
    },
    yaxis: {
      title: { text: cell.yLabel, font: { size: 10 } },
      showticklabels: false,
      showgrid: true,
      gridcolor: usePlotlyColor('grid'),
    },
    margin: { t: 10, r: 10, b: 20, l: 20 },
    hovermode: 'closest',
  }

  return { data, layout }
}

const hasData = computed(() => matrixData.value.some(row => row.some(cell => cell.data.length > 0)))

const cellWidthPercent = computed(() => (columnCount.value ? `${100 / columnCount.value}%` : '100%'))

function handleSegmentClick(groupKey: string) {
  const idx = selectedGroups.value.indexOf(groupKey)
  if (idx >= 0) {
    selectedGroups.value.splice(idx, 1)
  }
  else {
    selectedGroups.value.push(groupKey)
  }
}

function handleBreakClick(groupKey: string) {
  const idx = selectedGroups.value.indexOf(groupKey)
  if (idx >= 0) {
    selectedGroups.value.splice(idx, 1)
  }
  else {
    selectedGroups.value.push(groupKey)
  }
}
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-3
    un-w-full
    un-px-4
  >
    <div
      un-flex="~ col wrap"
      un-gap-3
    >
      <QLabelValuePair
        label-text="Metrics"
        label-id="segment-metrics"
        un-shrink-0
      >
        <template #value>
          <QSelect
            v-model="selectedMetricParams"
            :items="metricParams.map(p => p.key)"
            multiple
            placeholder="Metric Parameters"
          />
        </template>
      </QLabelValuePair>

      <QLabelValuePair
        label-text="Factors"
        label-id="segment-factors"
        un-shrink-0
      >
        <template #value>
          <div
            un-flex="~ col gap-2"
          >
            <QSelect
              v-model="selectedFactorParams"
              :items="[...dynamicFactorParams]"
              multiple
              placeholder="Factor Parameters"
            />
          </div>
        </template>
      </QLabelValuePair>
      <QLabelValuePair
        label-text="Preset Factor Group"
        label-id="segment-factors-group"
        un-shrink-0
      >
        <template #value>
          <div
            un-flex="~ col gap-2"
          >
            <QSelect
              v-model="factorGroup"
              :items="['avg', 'slope', 'r_square', 'var', 'all']"
              placeholder="Factor Group"
            />
          </div>
        </template>
      </QLabelValuePair>
      <QLabelValuePair
        label-text="Segments"
        label-id="segment-filter"
      >
        <template #value>
          <div
            un-flex="~ row"
            un-gap-2
            un-shrink-0
          >
            <div
              v-for="groupKey in groupItems.filter(gk => gk.startsWith('seg-'))"
              :key="groupKey"
              un-flex="~ row items-center"
              un-gap-2
              un-text="neutral-800 dark:neutral-200"
              un-underline="~ px neutral-400 dark:neutral-600 hover:neutral-700 dark:hover:neutral-300"
              un-cursor-pointer
              @click="handleSegmentClick(groupKey)"
            >
              <span
                un-w-3
                un-h-3
                un-rounded-full
                :style="{ backgroundColor: colorForGroup(groupKey), opacity: selectedGroups.includes(groupKey) || !selectedGroups.length ? 1 : 0.4 }"
              />
              <span>{{ groupLabelMap.get(groupKey) ?? groupKey }}</span>
            </div>
          </div>
        </template>
      </QLabelValuePair>
      <QLabelValuePair
        label-text="Breaks"
        label-id="break-filter"
      >
        <template #value>
          <div
            un-flex="~ row"
            un-gap-2
            un-shrink-0
          >
            <div
              v-for="groupKey in groupItems.filter(gk => gk.startsWith('break-'))"
              :key="groupKey"
              un-flex="~ row items-center"
              un-gap-2
              un-text="neutral-800 dark:neutral-200"
              un-underline="~ px neutral-400 dark:neutral-600 hover:neutral-700 dark:hover:neutral-300"
              un-cursor-pointer
              @click="handleBreakClick(groupKey)"
            >
              <span
                un-w-3
                un-h-3
                un-rounded-full
                :style="{ backgroundColor: colorForGroup(groupKey), opacity: selectedGroups.includes(groupKey) || !selectedGroups.length ? 1 : 0.4 }"
              />
              <span>{{ groupLabelMap.get(groupKey) ?? groupKey }}</span>
            </div>
          </div>
        </template>
      </QLabelValuePair>
    </div>
    <div
      v-if="!hasData"
      un-text="neutral-500 dark:neutral-400 center"
      un-p-8
    >
      No data available for the matrix scatter plot.
    </div>
    <div
      v-else
      un-flex="~ col"
      un-gap-2
      un-w-full
    >
      <div
        v-for="(row, rowIdx) in matrixData"
        :key="rowIdx"
        un-flex="~ row"
        un-gap-2
        un-w-full
      >
        <div
          v-for="(cell, colIdx) in row"
          :key="colIdx"
          un-border="~ neutral-300 dark:neutral-700"
          :style="{ width: cellWidthPercent, aspectRatio: '1 / 1' }"
        >
          <PlotlyCompo
            v-if="createScatterChart(cell)"
            :data="createScatterChart(cell)!.data"
            :layout="createScatterChart(cell)!.layout"
            type="chart"
            un-h-full
          />
          <div
            v-else
            un-flex="~ col items-center justify-center"
            un-h-full
            un-text="xs neutral-400 dark:neutral-600"
          >
            No data
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
