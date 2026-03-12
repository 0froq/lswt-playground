<script setup lang="ts">
import type { LakePoint, TimeSeries } from '~/types/mutation'
import type { STLResult } from '~/types/stl'

const emit = defineEmits<{
  (e: 'update:points', points: LakePoint[]): void
  (e: 'update:stl-results', results: STLResult[]): void
}>()

const poi = defineModel('poi')
const dataset = defineModel('dataset')
const rawSeries = ref<TimeSeries[] | undefined>(undefined)
const stlResults = ref<STLResult[]>([])
const tCandidates = ref<number[]>([])

const seasonalPeriodNum = ref<number>(12)
const seasonalSpanNum = ref<number>(0.15)
const trendSpanNum = ref<number>(0.25)

const seasonalPeriod = computed({
  get: () => String(seasonalPeriodNum.value),
  set: (val: string) => { seasonalPeriodNum.value = Number(val) },
})

const seasonalSpan = computed({
  get: () => String(seasonalSpanNum.value),
  set: (val: string) => { seasonalSpanNum.value = Number(val) },
})

const trendSpan = computed({
  get: () => String(trendSpanNum.value),
  set: (val: string) => { trendSpanNum.value = Number(val) },
})

const poiCandidates = computed<string[] | undefined>(() => {
  if (!rawSeries.value || rawSeries.value.length === 0) {
    return undefined
  }
  return rawSeries.value.map((series: TimeSeries) => series.label) || []
})

const selectedSTL = computed<STLResult | undefined>(() => {
  if (!poi.value || !stlResults.value.length) {
    return undefined
  }
  return stlResults.value.find(r => r.lakeId === poi.value || r.label === poi.value)
})

watchEffect(
  async () => {
    const params = new URLSearchParams({
      agg: 'none',
    })

    const ds = dataset?.value
    if (ds)
      params.append('dataset', String(ds))

    try {
      const response = await $fetch(`/api/loadTimeSeries?${params.toString()}`)
      rawSeries.value = response.series as TimeSeries[]
    }
    catch (e) {
      console.error('Failed to load time series data:', e)
      rawSeries.value = []
    }

    tCandidates.value = rawSeries.value?.[0]?.points.map(
      (p: { t: Date, v: number }) => new Date(p.t).getFullYear(),
    ) || []

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
    if (!rawSeries.value || rawSeries.value.length === 0)
      return

    try {
      const res = await $fetch('/api/decomposeSTL', {
        method: 'POST',
        body: {
          series: rawSeries.value,
          seasonalPeriod: seasonalPeriodNum.value,
          seasonalSpan: seasonalSpanNum.value,
          trendSpan: trendSpanNum.value,
        },
      })
      stlResults.value = (res as { results?: STLResult[] }).results || []
    }
    catch (e) {
      console.error('Failed to decompose STL:', e)
      stlResults.value = []
    }
    emit('update:stl-results', stlResults.value)
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
      title="STL Parameters"
      un-text="purple-500"
    />

    <QLabelValuePair
      label-id="seasonal-period"
      label-text="Seasonal Period"
    >
      <template #value>
        <QSelect
          v-model="seasonalPeriod"
          :items="['12', '6', '4', '3']"
        />
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      label-id="seasonal-span"
      label-text="Seasonal Span"
    >
      <template #value>
        <QSelect
          v-model="seasonalSpan"
          :items="['0.05', '0.1', '0.15', '0.2', '0.25', '0.3']"
        />
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      label-id="trend-span"
      label-text="Trend Span"
    >
      <template #value>
        <QSelect
          v-model="trendSpan"
          :items="['0.1', '0.15', '0.2', '0.25', '0.3', '0.4', '0.5']"
        />
      </template>
    </QLabelValuePair>

    <QSeperator
      title="Points of Interest"
      un-text="purple-500"
    />
    <ParamsPoi
      v-model:poi="poi"
      :poi-candidates="poiCandidates"
    />

    <template v-if="selectedSTL">
      <QSeperator
        title="STL Decomposition"
        un-text="purple-500"
      />

      <div
        un-flex="~ col"
        un-gap-2
      >
        <div
          un-text="sm neutral-700 dark:neutral-300"
          un-font-bold
        >
          {{ selectedSTL.label }}
        </div>

        <div un-h-150px>
          <PlotlyCompo
            type="chart"
            :data="[
              {
                x: selectedSTL.time,
                y: selectedSTL.original,
                type: 'scatter',
                mode: 'lines',
                name: 'Original',
                line: { color: usePlotlyColor('line'), width: 1.5 },
              },
            ]"
            :layout="{ title: { text: 'Original' }, showlegend: false, margin: { l: 40, r: 10, t: 30, b: 30 } }"
          />
        </div>

        <div un-h-150px>
          <PlotlyCompo
            type="chart"
            :data="[
              {
                x: selectedSTL.time,
                y: selectedSTL.trend,
                type: 'scatter',
                mode: 'lines',
                name: 'Trend',
                line: { color: '#10b981', width: 1.5 },
              },
            ]"
            :layout="{ title: { text: 'Trend' }, showlegend: false, margin: { l: 40, r: 10, t: 30, b: 30 } }"
          />
        </div>

        <div un-h-150px>
          <PlotlyCompo
            type="chart"
            :data="[
              {
                x: selectedSTL.time,
                y: selectedSTL.seasonal,
                type: 'scatter',
                mode: 'lines',
                name: 'Seasonal',
                line: { color: '#f59e0b', width: 1.5 },
              },
            ]"
            :layout="{ title: { text: 'Seasonal' }, showlegend: false, margin: { l: 40, r: 10, t: 30, b: 30 } }"
          />
        </div>

        <div un-h-150px>
          <PlotlyCompo
            type="chart"
            :data="[
              {
                x: selectedSTL.time,
                y: selectedSTL.remainder,
                type: 'scatter',
                mode: 'lines',
                name: 'Remainder',
                line: { color: '#8b5cf6', width: 1.5 },
              },
            ]"
            :layout="{ title: { text: 'Remainder' }, showlegend: false, margin: { l: 40, r: 10, t: 30, b: 30 } }"
          />
        </div>
      </div>
    </template>
  </div>
</template>
