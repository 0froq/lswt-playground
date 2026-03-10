<script setup lang="ts">
import type { LakeFactors } from '~/types/factor'
import type { MutationPoint } from '~/types/mutation'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  mutations?: MutationPoint[]
  lakeFactors?: Map<string, LakeFactors>
  timeFilter?: {
    start?: number | undefined
    end?: number | undefined
  }
}>()

function withinTimeFilter(year: number, filter?: { start?: number | undefined, end?: number | undefined }) {
  if (!filter)
    return true
  if (filter.start != null && year < filter.start)
    return false
  if (filter.end != null && year > filter.end)
    return false
  return true
}

const mutationParams = [
  'year',
  // 'preAvg',
  'deltaAvg',
  'preSen',
  'deltaSen',
  'preVar',
  'deltaVar',
] as const
// 手动可调整的关注因子列表；为空则使用全部可用因子
const paramsOfInterest = [
  'dl',
  'lmld_avg',
  'lshf_avg',
  'ltlt_avg',
  'u10_avg',
  'v10_avg',
  'sp_avg',
] as const

// Factor keys will be derived dynamically from the loaded factor map, then filtered by paramsOfInterest if provided.
const dynamicFactorParams = computed<string[]>(() => {
  if (!props.lakeFactors || props.lakeFactors.size === 0)
    return []
  const keys = new Set<string>()
  for (const [, factor] of props.lakeFactors.entries()) {
    if (!factor)
      continue
    Object.entries(factor).forEach(([key, val]) => {
      if (['lake', 'lat', 'lon'].includes(key))
        return
      if (typeof val === 'number' && Number.isFinite(val))
        keys.add(key)
    })
  }
  const allKeys = Array.from(keys).sort()
  const filtered = paramsOfInterest.length ? allKeys.filter(k => paramsOfInterest.includes(k as typeof paramsOfInterest[number])) : allKeys
  return filtered.length ? filtered : allKeys
})

type MutationParam = typeof mutationParams[number]
type FactorParam = string
type Axis = 'mutation' | 'factor'
type AxisParam = MutationParam | FactorParam

const selectedMutationParams = ref<MutationParam[]>([...mutationParams])
const selectedFactorParams = ref<FactorParam[]>([])

// Keep selected factors in sync with available keys; if none selected, default to all.
watch(dynamicFactorParams, (next) => {
  if (!selectedFactorParams.value.length)
    selectedFactorParams.value = [...next]
  else
    selectedFactorParams.value = selectedFactorParams.value.filter(p => next.includes(p))
}, { immediate: true })

const mutationParamsSelected = computed<MutationParam[]>(() => selectedMutationParams.value.length ? selectedMutationParams.value : [...mutationParams])
const factorParamsSelected = computed<FactorParam[]>(() => selectedFactorParams.value.length ? selectedFactorParams.value : [...dynamicFactorParams.value])

const columnsAreMutation = computed(() => mutationParamsSelected.value.length >= factorParamsSelected.value.length)
const columnParams = computed<AxisParam[]>(() => columnsAreMutation.value ? mutationParamsSelected.value : factorParamsSelected.value)
const rowParams = computed<AxisParam[]>(() => columnsAreMutation.value ? factorParamsSelected.value : mutationParamsSelected.value)
const columnAxisType = computed<Axis>(() => columnsAreMutation.value ? 'mutation' : 'factor')
const rowAxisType = computed<Axis>(() => columnsAreMutation.value ? 'factor' : 'mutation')
const columnCount = computed(() => columnParams.value.length)

const paramLabels: Partial<Record<MutationParam, string>> = {
  year: 'Year',
  // preAvg: 'Pre Avg',
  deltaAvg: 'Δ Avg',
  preSen: 'Pre Sen',
  deltaSen: 'Δ Sen',
  preVar: 'Pre Var',
  deltaVar: 'Δ Var',
}

const factorLabels: Partial<Record<FactorParam, string>> = {}

interface MatrixCell {
  xLabel: string
  yLabel: string
  data: Array<{ x: number, y: number, year: number, label: string }>
}

function getMutationValue(mutation: MutationPoint, param: MutationParam) {
  if (param === 'deltaAvg')
    return mutation.postAvg - mutation.preAvg
  if (param === 'deltaSen')
    return mutation.postSen - mutation.preSen
  if (param === 'deltaVar')
    return mutation.postVar - mutation.preVar
  return mutation[param]
}

function getAxisValue(mutation: MutationPoint, factors: LakeFactors | undefined, param: AxisParam, axis: Axis) {
  if (axis === 'mutation')
    return getMutationValue(mutation, param as MutationParam)
  if (!factors)
    return undefined
  return factors[param as FactorParam]
}

function getAxisLabel(param: AxisParam, axis: Axis) {
  if (axis === 'mutation')
    return paramLabels[param as MutationParam] ?? param
  return factorLabels[param as FactorParam] ?? param
}

const matrixData = computed<MatrixCell[][]>(() => {
  if (!props.mutations?.length || !props.lakeFactors?.size)
    return []

  const filteredMutations = props.mutations.filter(m => withinTimeFilter(m.year, props.timeFilter))
  if (!filteredMutations.length)
    return []

  const matrix: MatrixCell[][] = []

  for (const rowParam of rowParams.value) {
    const row: MatrixCell[] = []
    for (const columnParam of columnParams.value) {
      const data: Array<{ x: number, y: number, year: number, label: string }> = []
      const xLabel = getAxisLabel(columnParam, columnAxisType.value)
      const yLabel = getAxisLabel(rowParam, rowAxisType.value)

      for (const mutation of filteredMutations) {
        const factors = props.lakeFactors?.get(mutation.lakeId)
        if (!factors)
          continue

        const xValue = getAxisValue(mutation, factors, columnParam, columnAxisType.value)
        const yValue = getAxisValue(mutation, factors, rowParam, rowAxisType.value)

        if (typeof xValue === 'number' && typeof yValue === 'number' && Number.isFinite(xValue) && Number.isFinite(yValue)) {
          data.push({
            x: xValue,
            y: yValue,
            year: mutation.year,
            label: mutation.lakeId,
          })
        }
      }

      row.push({
        xLabel,
        yLabel,
        data,
      })
    }
    matrix.push(row)
  }

  return matrix
})

function createScatterChart(cell: MatrixCell) {
  if (!cell.data.length)
    return null

  const data: Plotly.Data[] = [{
    type: 'scatter',
    mode: 'markers',
    x: cell.data.map(d => d.x),
    y: cell.data.map(d => d.y),
    text: cell.data.map(d => d.label),
    marker: {
      size: 4,
      color: cell.data.map(d => d.year),
      colorscale: 'YlOrRd',
      reversescale: true,
      opacity: 0.8,
      line: { color: usePlotlyColor('markerBorder'), width: 0.5 },
    },
    hovertemplate: '%{text} (Year: %{marker.color})<br>%{xaxis.title.text}: %{x:.2f}<br>%{yaxis.title.text}: %{y:.2f}<extra></extra>',
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
    margin: { t: 25, r: 10, b: 25, l: 40 },
    hovermode: 'closest',
  }

  return { data, layout }
}

const hasData = computed(() => {
  return matrixData.value.some(row => row.some(cell => cell.data.length > 0))
})

const cellWidthPercent = computed(() => (columnCount.value ? `${100 / columnCount.value}%` : '100%'))
</script>

<template>
  <section
    un-flex="~ col"
    un-gap-3
    un-w-full
  >
    <div
      un-flex="~ col wrap"
      un-gap-3
    >
      <QLabelValuePair
        label-text="Mutation Params"
        label-id="mutation-params"
        un-shrink-0
      >
        <template #value>
          <QSelect
            v-model="selectedMutationParams"
            :items="[...mutationParams]"
            multiple
            placeholder="Mutation Parameters"
          />
        </template>
      </QLabelValuePair>
      <QLabelValuePair
        label-text="Factor Params"
        label-id="factor-params"
        un-shrink-0
      >
        <template #value>
          <QSelect
            v-model="selectedFactorParams"
            :items="[...dynamicFactorParams]"
            multiple
            placeholder="Factor Parameters"
          />
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
  </section>
</template>
