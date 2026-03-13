<script setup lang="ts">
import type { LakePoint, MutationPoint, TimeSeries } from '~/types/mutation'
import type { Break } from '~/types/segments'
import type {
  ParamsData,
  ParamsMutation,
  ParamsPreprocess,
} from '~/types/param'

const emit = defineEmits<{
  (e: 'update:points', points: LakePoint[]): void
  (e: 'update:mutationPoints', mutationPoints: MutationPoint[]): void
}>()

const poi = defineModel('poi')
const dataset = defineModel('dataset')
const tCandidates = ref<number[] | undefined>(undefined)
const mutationPoints = ref<MutationPoint[] | undefined>(undefined)
const rawSeries = ref<TimeSeries[] | undefined>(undefined)
const processedSeries = ref<TimeSeries[] | undefined>(undefined)

onMounted(async () => {
  const params = new URLSearchParams()
  if (dataset?.value)
    params.append('dataset', String(dataset.value))
  const _rawSeries = await $fetch(`/api/loadTimeSeries?${params.toString()}`)
    .then(res => res.series as TimeSeries[])
    .catch((e) => {
      console.error('Failed to load time series data:', e)
      return new Array<TimeSeries>()
    })

  if (_rawSeries && _rawSeries.length !== 0) {
    tCandidates.value = _rawSeries[0]?.points.map(
      (p: { t: Date, v: number }) => new Date(p.t).getFullYear(),
    ) || []
  }
})
const poiCandidates = computed<string[] | undefined>(() => {
  if (!rawSeries.value || rawSeries.value.length === 0)
    return undefined
  return rawSeries.value.map((series: TimeSeries) => series.label) || []
})

const paramsData = ref<{
  agg: string
  clipRange?: [number, number]
  dataset?: string
}>({
  agg: 'avg',
})

const paramsPreprocess = ref<{
  smoothWindow: number
  diffOrder: number
}>({
  smoothWindow: 1,
  diffOrder: 1,
})

const paramsMutation = ref<{
  mutationMethod: string
  minSegLen: number
}>({
  mutationMethod: 'pettitt',
  minSegLen: 5,
})

const mutationThisId = computed<MutationPoint | undefined>(() => {
  if (!mutationPoints.value || mutationPoints.value.length === 0 || !poi.value)
    return undefined
  const mp = mutationPoints.value.find(
    mp => mp.lakeId === poi.value,
  )
  return mp
})
const breaksForPoi = computed<Break[] | undefined>(() => {
  if (!mutationPoints.value || !poi.value)
    return undefined
  return (mutationPoints.value.filter(mp => mp.lakeId === poi.value) as unknown) as Break[]
})
function handleDataParamsUpdate(params: ParamsData) {
  console.warn('Data params updated:', params)
  paramsData.value = params
  dataset.value = params.dataset
}

watchEffect(
  async () => {
    const params = new URLSearchParams({
      agg: paramsData.value.agg,
    })
    if (paramsData.value.clipRange) {
      const clipStartYear = paramsData.value.clipRange[0]
      const clipEndYear = paramsData.value.clipRange[1]
      params.append('clipRange', `${clipStartYear},${clipEndYear}`)
    }
    const ds = paramsData.value.dataset ?? dataset?.value
    if (ds)
      params.append('dataset', String(ds))

    rawSeries.value = await $fetch(`/api/loadTimeSeries?${params.toString()}`)
      .then(res => res.series as TimeSeries[])
      .catch((e) => {
        console.error('Failed to load time series data:', e)
        return new Array<TimeSeries>()
      })
    emit('update:points', rawSeries.value?.map(
      ts => ({
        id: ts.id,
        label: ts.label,
        lat: ts.lat,
        lon: ts.lon,
      }),
    ) || [])
  },
)

watchEffect(
  async () => {
    if (!rawSeries.value)
      return
    const params = new URLSearchParams({
      smoothWindow: paramsPreprocess.value.smoothWindow.toString(),
      diffOrder: paramsPreprocess.value.diffOrder.toString(),
    })
    processedSeries.value = await $fetch(`/api/preprocessTimeSeries?${params.toString()}`, {
      method: 'POST',
      body: rawSeries.value,
    })
      .then(res => res.processedSeries as TimeSeries[])
      .catch((e) => {
        console.error('Failed to preprocess time series data:', e)
        return new Array<TimeSeries>()
      })
  },
)

// Detect mutations
watchEffect(
  async () => {
    if (!processedSeries.value)
      return
    const params = new URLSearchParams({
      mutationMethod: paramsMutation.value.mutationMethod,
      minSegLen: paramsMutation.value.minSegLen.toString(),
    })
    mutationPoints.value = await $fetch(`/api/detectMutation?${params.toString()}`, {
      method: 'POST',
      body: {
        processedSeries: processedSeries.value,
        rawSeries: rawSeries.value,
      },
    })
      .then(res => res.mutationPoints as MutationPoint[])
      .catch((e) => {
        console.error('Failed to detect mutations, ', e)
        return new Array<MutationPoint>()
      })
    emit('update:mutationPoints', mutationPoints.value || [])
  },
)
</script>

<template>
  <div
    class="side-view"
    un-min-w-200px
    un-px-4
    un-flex="~ col"
    un-gap-4
    un-overflow-y-auto
  >
    <QSeperator
      title="Data Loading"
      un-text="amber-500"
    />
    <ParamsData
      :t-candidates="tCandidates"
      @update:data-params="handleDataParamsUpdate"
    />
    <QSeperator
      title="Preprocessing"
      un-text="amber-500"
    />
    <ParamsPreprocess
      :default-overrides="{
        smoothWindow: paramsPreprocess.smoothWindow,
        diffOrder: paramsPreprocess.diffOrder,
      }"
      @update:preprocess-params="(params: ParamsPreprocess) => {
        paramsPreprocess = params
      }"
    />
    <QSeperator
      title="Mutation Detection"
      un-text="amber-500"
    />
    <ParamsMutation
      @update:mutation-params="(params: ParamsMutation) => {
        paramsMutation = params
      }"
    />
    <QSeperator
      title="Points of Interest"
      un-text="amber-500"
    />
    <ParamsPoi
      v-model:poi="poi"
      :poi-candidates
    />
    <ChartTimeSeries
      :time-series="
        {
          raw: rawSeries?.filter(
            ts => ts.id === poi,
          )[0],
          processed:
            processedSeries?.filter(
              ts => ts.id === poi,
            )[0],
        }"
      :breaks="breaksForPoi"
    />
    <QSeperator
      title="Mutation This POI"
      un-text="amber-500"
    />
    <QLabelValuePair
      label-id="avg"
      label-text="Avg"
    >
      <template #value>
        <div
          v-if="mutationThisId"
          un-text="nowrap"
          un-font="mono"
        >
          {{ mutationThisId.preAvg.toFixed(2) }}
          <span
            :un-text="mutationThisId.postAvg > mutationThisId.preAvg
              ? mutationThisId.postAvg === mutationThisId.preAvg ? 'neutral-500' : 'red-500'
              : mutationThisId.postAvg < mutationThisId.preAvg ? 'green-500' : 'neutral-500'"
            un-mx-1
          >
            ->
          </span>
          {{ mutationThisId.postAvg.toFixed(2) }}
        </div>
      </template>
    </QLabelValuePair>
    <QLabelValuePair
      label-id="sen"
      label-text="Sen's"
    >
      <template #value>
        <div
          v-if="mutationThisId"
          un-text="nowrap"
          un-font="mono"
        >
          {{ mutationThisId.preSen.toFixed(2) }}
          <span
            :un-text="mutationThisId.postSen > mutationThisId.preSen
              ? mutationThisId.postSen === mutationThisId.preSen ? 'neutral-500' : 'red-500'
              : mutationThisId.postSen < mutationThisId.preSen ? 'green-500' : 'neutral-500'"
            un-mx-1
          >
            ->
          </span>
          {{ mutationThisId.postSen.toFixed(2) }}
        </div>
      </template>
    </QLabelValuePair>
    <QLabelValuePair
      label-id="ols"
      label-text="OLS"
    >
      <template #value>
        <div
          v-if="mutationThisId"
          un-text="nowrap"
          un-font="mono"
        >
          {{ mutationThisId.preOls.toFixed(2) }}
          <span
            :un-text="mutationThisId.postOls > mutationThisId.preOls
              ? mutationThisId.postOls === mutationThisId.preOls ? 'neutral-500' : 'red-500'
              : mutationThisId.postOls < mutationThisId.preOls ? 'green-500' : 'neutral-500'"
            un-mx-1
          >
            ->
          </span>
          {{ mutationThisId.postOls.toFixed(2) }}
        </div>
      </template>
    </QLabelValuePair>
    <QLabelValuePair
      label-id="var"
      label-text="Var"
    >
      <template #value>
        <div
          v-if="mutationThisId"
          un-text="nowrap"
          un-font="mono"
        >
          {{ mutationThisId.preVar.toFixed(2) }}
          <span
            :un-text="mutationThisId.postVar > mutationThisId.preVar
              ? mutationThisId.postVar === mutationThisId.preVar ? 'neutral-500' : 'red-500'
              : mutationThisId.postVar < mutationThisId.preVar ? 'green-500' : 'neutral-500'"
            un-mx-1
          >
            ->
          </span>
          {{ mutationThisId.postVar.toFixed(2) }}
        </div>
      </template>
    </QLabelValuePair>
  </div>
</template>
