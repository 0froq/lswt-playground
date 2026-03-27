<script setup lang="ts">
import type { LakePoint, TimeSeries } from '~/types/mutation'
import type {
  ParamsData,
  ParamsPreprocess,
  ParamsSegment,
} from '~/types/param'
import type { Break, Segment } from '~/types/segments'

const emit = defineEmits<{
  (e: 'update:points', points: LakePoint[]): void
  (e: 'update:segments', segments: Segment[]): void
  (e: 'update:breaks', breaks: Break[]): void
}>()

const poiModel = defineModel<string | undefined>('poi')
const dataset = defineModel<string | undefined>('dataset')

// 参数状态
const paramsData = ref<ParamsData>({
  agg: 'avg',
})

const paramsPreprocess = ref<ParamsPreprocess>({
  smoothWindow: 1,
  diffOrder: 0,
})

// Segment 特定状态
const segments = ref<Segment[]>([])
const breaks = ref<Break[]>([])

const segmentPresets: { value: string, years: number[] }[] = [
  { value: '5 Segment', years: [2004, 2008, 2012, 2016] },
  { value: 'Custom', years: [] },
]
const segmentPresetSelected = ref<string>(segmentPresets[0]!.value)
const segmentBreakYears = ref<number[]>([...segmentPresets[0]!.years])

// 使用共享 composables
const { rawSeries, processedSeries, points } = usePlaygroundData({
  paramsData,
  paramsPreprocess,
  dataset,
})

const { poi, poiCandidates, tCandidates } = usePlaygroundPoi({
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

// 数据参数更新处理
function handleDataParamsUpdate(params: ParamsData) {
  paramsData.value = params
  dataset.value = params.dataset
}

// Break years 管理
const paramsSegment = computed<ParamsSegment>(() => ({
  presetKey: segmentPresetSelected.value,
  breakYears: [...segmentBreakYears.value],
}))

const tMin = computed(() => {
  if (!tCandidates.value?.length) return undefined
  return Math.min(...tCandidates.value)
})

const tMax = computed(() => {
  if (!tCandidates.value?.length) return undefined
  return Math.max(...tCandidates.value)
})

const segmentPresetItems = computed(() => segmentPresets.map(preset => preset.value))
const breakYearItems = computed(() => tCandidates.value?.map(year => year.toString()) || [])

const breakYearSelection = computed<string[]>({
  get: () => segmentBreakYears.value.map(year => year.toString()),
  set: (val: string[] | undefined) => {
    updateBreakYears((val || []).map(v => Number.parseInt(v, 10)))
  },
})

function isSameYears(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  return a.every((v, idx) => v === b[idx])
}

function normalizeYears(years: number[]) {
  const uniqueSorted = Array.from(new Set(years)).sort((a, b) => a - b)
  if (tMin.value === undefined || tMax.value === undefined)
    return uniqueSorted
  return uniqueSorted.filter(year => year >= tMin.value! && year <= tMax.value!)
}

function updateBreakYears(years: number[]) {
  const filteredYears = years.filter(year => Number.isFinite(year))
  const normalized = normalizeYears(filteredYears)
  segmentBreakYears.value = normalized
  const matchedPreset = segmentPresets.find(
    preset => preset.value !== '自定义'
      && isSameYears(normalizeYears(preset.years), normalized),
  )
  segmentPresetSelected.value = matchedPreset?.value ?? '自定义'
}

function shiftBreakYears(delta: number) {
  if (!segmentBreakYears.value?.length) return
  updateBreakYears(segmentBreakYears.value.map(year => year + delta))
}

watch(segmentPresetSelected, (value) => {
  const preset = segmentPresets.find(p => p.value === value)
  if (!preset || preset.value === '自定义') return
  updateBreakYears(preset.years)
})

watch(tCandidates, () => {
  if (segmentBreakYears.value.length === 0 && segmentPresets[0]!.years.length > 0)
    updateBreakYears(segmentPresets[0]!.years)
  else
    updateBreakYears(segmentBreakYears.value)
})

// Segment API 调用
watchEffect(
  async () => {
    if (!processedSeries.value?.length) return
    if (!paramsSegment.value.breakYears?.length) return

    try {
      const res = await $fetch(`/api/segmentTimeSeries`, {
        method: 'POST',
        body: {
          processedSeries: processedSeries.value,
          rawSeries: rawSeries.value,
          breakYears: paramsSegment.value.breakYears,
        },
      })
      segments.value = (res as { segments?: Segment[] }).segments || []
      breaks.value = (res as { breaks?: Break[] }).breaks || []
    }
    catch (e) {
      console.error('Failed to segment time series:', e)
      segments.value = []
      breaks.value = []
    }
    emit('update:segments', segments.value)
    emit('update:breaks', breaks.value)
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
      un-text="teal-500"
    />
    <ParamsData
      :t-candidates="tCandidates"
      @update:data-params="handleDataParamsUpdate"
    />
    <QSeperator
      title="Preprocessing"
      un-text="teal-500"
    />
    <ParamsPreprocess
      :default-overrides="{
        smoothWindow: paramsPreprocess.smoothWindow,
        diffOrder: paramsPreprocess.diffOrder,
      }"
      @update:preprocess-params="(p: ParamsPreprocess) => paramsPreprocess = p"
    />
    <QSeperator
      title="Segmentation"
      un-text="teal-500"
    />
    <QLabelValuePair
      label-id="segment-preset"
      label-text="Segment Preset"
    >
      <template #value>
        <QSelect
          v-model="segmentPresetSelected"
          :items="segmentPresetItems"
        />
      </template>
    </QLabelValuePair>
    <QLabelValuePair
      label-id="segment-break-years"
      label-text="Break Years"
    >
      <template #value>
        <QSelect
          v-model="breakYearSelection"
          :items="breakYearItems"
          multiple
        />
      </template>
    </QLabelValuePair>
    <div
      un-flex="~ row"
      un-gap-2
      un-justify-center-safe
      un-items-center
    >
      <button
        un-w-10
        un-h-10
        un-flex="~"
        un-items-center
        un-justify-center
        un-text="neutral-700 dark:neutral-300 hover:teal-500"
        un-transition
        un-cursor-pointer
        @click="shiftBreakYears(-1)"
      >
        <span class="sr-only">Backward</span>
        <un-i-ph-minus-duotone />
      </button>
      <QSeperator type="dashed" />
      <div
        un-shrink-0
        un-text="neutral-700 dark:neutral-300"
      >
        Shift Break Years
      </div>
      <QSeperator type="dashed" />
      <button
        un-w-10
        un-h-10
        un-flex="~"
        un-items-center
        un-justify-center
        un-text="neutral-700 dark:neutral-300 hover:teal-500"
        un-transition
        un-cursor-pointer
        @click="shiftBreakYears(1)"
      >
        <span class="sr-only">Forward</span>
        <un-i-ph-plus-duotone />
      </button>
    </div>
    <QSeperator
      title="Points of Interest"
      un-text="teal-500"
    />
    <ParamsPoi
      v-model:poi="poi"
      :poi-candidates
    />
    <ChartTimeSeries
      :time-series="{
        raw: rawSeries?.find(ts => ts.id === poi),
        processed: processedSeries?.find(ts => ts.id === poi),
      }"
      :breaks="breaks?.filter((bk: Break) => bk.lakeId === poi)"
    />
    <QSeperator
      title="Segment Stats"
      un-text="teal-500"
    />
    <SegmentStatsTable
      :segments="segments?.filter((seg: Segment) => seg.lakeId === poi)"
      :breaks="breaks?.filter((bk: Break) => bk.lakeId === poi)"
    />
  </div>
</template>
