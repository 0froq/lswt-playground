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

const poiModel = defineModel<string | undefined>('poi')
const dataset = defineModel<string | undefined>('dataset')

// 参数状态
const paramsData = ref<ParamsData>({
  agg: 'avg',
})

const paramsPreprocess = ref<ParamsPreprocess>({
  smoothWindow: 1,
  diffOrder: 1,
})

const paramsMutation = ref<ParamsMutation>({
  mutationMethod: 'pettitt',
  minSegLen: 5,
})

// 使用共享 composables
const { rawSeries, processedSeries, points } = usePlaygroundData({
  paramsData,
  paramsPreprocess,
  dataset,
})

const { poi, poiCandidates, tCandidates, selectedSeries } = usePlaygroundPoi({
  rawSeries,
})

// 同步 poi v-model
watch(poi, (newVal) => {
  poiModel.value = newVal
}, { immediate: true })

watch(poiModel, (newVal) => {
  if (newVal !== poi.value) {
    poi.value = newVal
  }
})

// 监听 points 变化，emit 给父组件
watch(points, (newPoints) => {
  if (newPoints) {
    emit('update:points', newPoints)
  }
}, { immediate: true })

// Mutation 检测状态
const mutationPoints = ref<MutationPoint[] | undefined>(undefined)

const mutationThisId = computed<MutationPoint | undefined>(() => {
  if (!mutationPoints.value?.length || !poi.value)
    return undefined
  return mutationPoints.value.find(mp => mp.lakeId === poi.value)
})

const breaksForPoi = computed<Break[] | undefined>(() => {
  if (!mutationPoints.value || !poi.value)
    return undefined
  return mutationPoints.value.filter(mp => mp.lakeId === poi.value) as unknown as Break[]
})

// 数据参数更新处理
function handleDataParamsUpdate(params: ParamsData) {
  paramsData.value = params
  dataset.value = params.dataset
}

// 检测 mutations
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
      .then(res => (res as { mutationPoints: MutationPoint[] }).mutationPoints)
      .catch((e) => {
        console.error('Failed to detect mutations, ', e)
        return [] as MutationPoint[]
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
      @update:preprocess-params="(p: ParamsPreprocess) => paramsPreprocess = p"
    />
    <QSeperator
      title="Mutation Detection"
      un-text="amber-500"
    />
    <ParamsMutation
      @update:mutation-params="(p: ParamsMutation) => paramsMutation = p"
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
      :time-series="{
        raw: selectedSeries,
        processed: processedSeries?.find(ts => ts.id === poi),
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
