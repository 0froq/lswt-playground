<script setup lang="ts">
import type { LakePoint, TimeSeries } from '~/types/mutation'
import type { Break, Segment } from '~/types/segments'
import type { STLResult } from '~/types/stl'
import type { STLTrendAnalysisItem, STLTrendBreak, STLTrendSegment } from '~/types/stl-trend'

const emit = defineEmits<{
  (e: 'update:points', points: LakePoint[]): void
  (e: 'update:stl-results', results: STLResult[]): void
  (e: 'update:trend-analysis', analysis: STLTrendAnalysisItem[]): void
}>()

const poi = defineModel('poi')
const dataset = defineModel('dataset')
const rawSeries = ref<TimeSeries[] | undefined>(undefined)
const stlResults = ref<STLResult[]>([])
const tCandidates = ref<number[]>([])

const seasonalPeriodNum = ref<number>(12)
const innerIterationsNum = ref<number>(3)
const outerIterationsNum = ref<number>(0)
const robustMode = ref<boolean>(false)

// Window mode: 'fixed' for fixed length, 'span' for proportion
const windowMode = ref<'fixed' | 'span'>('fixed')

// Span mode values
const seasonalSpanNum = ref<number>(0.15)
const trendSpanNum = ref<number>(0.25)

// Fixed length mode values (odd integers)
const seasonalWindowNum = ref<number>(13)
const trendWindowNum = ref<number>(23)

// Advanced options
const skipLowPass = ref<boolean>(true)
const skipFinishingLoop = ref<boolean>(false)

// Dataset selection
const datasetSelected = ref<string>('yang')
const datasetCandidates = ['era5', 'yang']

// Trend segmentation
const trendAnalysis = ref<STLTrendAnalysisItem[]>([])
const breakPresets = [
  { label: '5 Periods', years: [2004, 2008, 2012, 2016] },
  { label: 'Custom', years: [] },
]
const selectedBreakPreset = ref<string>(breakPresets[0]!.label)
const customBreakYears = ref<number[]>([...breakPresets[0]!.years])
const availableYears = computed(() => {
  if (!stlResults.value?.[0]?.time?.length)
    return []
  const years = stlResults.value[0].time.map(t => new Date(t).getFullYear())
  return Array.from(new Set(years)).sort((a, b) => a - b)
})

// Sync with v-model:dataset
watchEffect(() => {
  const ds = dataset?.value
  if (ds !== undefined && typeof ds === 'string' && ds !== datasetSelected.value) {
    datasetSelected.value = ds
  }
})

watch(datasetSelected, (newVal) => {
  const ds = dataset
  if (ds.value !== undefined) {
    ds.value = newVal
  }
})

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

const innerIterations = computed({
  get: () => String(innerIterationsNum.value),
  set: (val: string) => { innerIterationsNum.value = Number(val) },
})

const outerIterations = computed({
  get: () => String(outerIterationsNum.value),
  set: (val: string) => { outerIterationsNum.value = Number(val) },
})

// Utility function for calculating mean
function mean(arr: number[]): number {
  if (!arr.length)
    return 0
  return arr.reduce((sum, v) => sum + v, 0) / arr.length
}

const customBreakYearStrings = computed<string[]>({
  get: () => customBreakYears.value.map(y => String(y)),
  set: (val: string[]) => { customBreakYears.value = val.map(v => Number(v)) },
})

// Fixed window length inputs
const seasonalWindow = computed({
  get: () => String(seasonalWindowNum.value),
  set: (val: string) => { seasonalWindowNum.value = Number(val) },
})

const trendWindow = computed({
  get: () => String(trendWindowNum.value),
  set: (val: string) => { trendWindowNum.value = Number(val) },
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

const selectedTrendAnalysis = computed<STLTrendAnalysisItem | undefined>(() => {
  if (!poi.value || !trendAnalysis.value.length) {
    return undefined
  }
  return trendAnalysis.value.find(a => a.lakeId === poi.value || a.label === poi.value)
})

const trendBreakShapes = computed<any[]>(() => {
  if (!selectedTrendAnalysis.value?.breaks?.length || !selectedSTL.value?.time?.length)
    return []

  return selectedTrendAnalysis.value.breaks
    .map((b) => {
      const x = selectedSTL.value?.time?.[b.breakMonthIndex]
      if (!x)
        return null
      return {
        type: 'line',
        x0: x,
        x1: x,
        y0: 0,
        y1: 1,
        yref: 'paper',
        line: {
          color: '#f97316',
          width: 1.2,
          dash: 'dash',
        },
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
})

const trendBreakAnnotations = computed<any[]>(() => {
  if (!selectedTrendAnalysis.value?.breaks?.length || !selectedSTL.value?.time?.length)
    return []

  return selectedTrendAnalysis.value.breaks
    .map((b) => {
      const x = selectedSTL.value?.time?.[b.breakMonthIndex]
      if (!x)
        return null
      return {
        x,
        y: 1,
        yref: 'paper',
        text: String(b.breakYear),
        showarrow: false,
        yanchor: 'bottom',
        font: {
          size: 10,
          color: '#f97316',
        },
        bgcolor: 'rgba(255,255,255,0.75)',
      }
    })
    .filter((v): v is NonNullable<typeof v> => v !== null)
})

const adaptedSegments = computed<Segment[]>(() => {
  if (!selectedTrendAnalysis.value?.segments)
    return []
  return selectedTrendAnalysis.value.segments.map(s => ({
    lakeId: s.lakeId,
    segmentIndex: s.segmentIndex,
    startYear: s.startYear,
    endYear: s.endYear,
    startYearIndex: s.startMonthIndex,
    endYearIndex: s.endMonthIndex,
    avg: s.mean,
    slope: s.slope,
    var: s.variance,
    p: s.p,
  }))
})

const adaptedBreaks = computed<Break[]>(() => {
  if (!selectedTrendAnalysis.value?.breaks)
    return []
  return selectedTrendAnalysis.value.breaks.map(b => ({
    lakeId: b.lakeId,
    breakIndex: b.breakIndex,
    year: b.breakYear,
    yearIndex: b.breakMonthIndex,
    deltaAvg: b.deltaMean,
    deltaSlope: b.deltaSlope,
    deltaVar: b.deltaVariance,
    p: b.p,
    cohenD: b.cohenD,
  }))
})

// Watch both external and internal dataset selections
watch([() => dataset?.value, datasetSelected], async ([externalDs, internalDs]) => {
  const currentDataset = externalDs ?? internalDs
  
  const params = new URLSearchParams({
    agg: 'none',
  })

  if (currentDataset) {
    params.append('dataset', String(currentDataset))
    console.log('[STL] Loading dataset:', currentDataset)
  }

  try {
    const response = await $fetch(`/api/loadTimeSeries?${params.toString()}`)
    rawSeries.value = response.series as TimeSeries[]
    console.log('[STL] Loaded', rawSeries.value.length, 'series from', currentDataset)
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
}, { immediate: true })

watchEffect(
  async () => {
    if (!rawSeries.value || rawSeries.value.length === 0)
      return

    try {
      const requestBody: Record<string, unknown> = {
        series: rawSeries.value,
        seasonalPeriod: seasonalPeriodNum.value,
        innerIterations: innerIterationsNum.value,
        outerIterations: outerIterationsNum.value,
        robust: robustMode.value,
      }

      if (windowMode.value === 'span') {
        requestBody.seasonalSpan = seasonalSpanNum.value
        requestBody.trendSpan = trendSpanNum.value
      }
      else {
        requestBody.seasonalWindow = seasonalWindowNum.value
        requestBody.trendWindow = trendWindowNum.value
      }

      requestBody.skipLowPass = skipLowPass.value
      requestBody.skipFinishingLoop = skipFinishingLoop.value

      // eslint-disable-next-line no-console
      console.log('[STL Client] Sending request:', requestBody)

      const res = await $fetch('/api/decomposeSTL', {
        method: 'POST',
        body: requestBody,
      })
      stlResults.value = (res as { results?: STLResult[] }).results || []

      // eslint-disable-next-line no-console
      console.log('[STL Client] Received results:', stlResults.value.length, 'series')
    }
    catch (e) {
      console.error('Failed to decompose STL:', e)
      stlResults.value = []
    }
    emit('update:stl-results', stlResults.value)
  },
)

// Computed break years based on preset selection
const effectiveBreakYears = computed<number[]>(() => {
  if (selectedBreakPreset.value === 'Custom') {
    return customBreakYears.value
  }
  const preset = breakPresets.find(p => p.label === selectedBreakPreset.value)
  return preset?.years || []
})

// Summary statistics for all lakes
const summaryStats = computed(() => {
  if (!trendAnalysis.value?.length)
    return null

  const allSegments = trendAnalysis.value.flatMap(a => a.segments)
  const allBreaks = trendAnalysis.value.flatMap(a => a.breaks)

  // Per-period averages
  const periodCount = Math.max(...trendAnalysis.value.map(a => a.segments.length), 0)
  const periodStats = []

  for (let i = 0; i < periodCount; i++) {
    const periodSegments = allSegments.filter(s => s.segmentIndex === i)
    if (periodSegments.length) {
      const avgSlope = mean(periodSegments.map(s => s.slope))
      const avgMean = mean(periodSegments.map(s => s.mean))
      const avgVariance = mean(periodSegments.map(s => s.variance))
      const startYear = periodSegments[0]?.startYear
      const endYear = periodSegments[0]?.endYear

      periodStats.push({
        periodIndex: i,
        label: `${startYear}-${String(endYear).slice(-2)}`,
        avgSlope,
        avgMean,
        avgVariance,
        lakeCount: periodSegments.length,
      })
    }
  }

  // Break stats
  const breakStats = []
  for (let i = 0; i < periodCount - 1; i++) {
    const breakPoints = allBreaks.filter(b => b.breakIndex === i)
    if (breakPoints.length) {
      breakStats.push({
        breakIndex: i,
        year: breakPoints[0]?.breakYear,
        avgDeltaSlope: mean(breakPoints.map(b => b.deltaSlope)),
        avgDeltaMean: mean(breakPoints.map(b => b.deltaMean)),
        significantCount: breakPoints.filter(b => b.p < 0.05).length,
      })
    }
  }

  return { periodStats, breakStats }
})

// Function to run trend analysis
async function runTrendAnalysis() {
  if (!stlResults.value?.length) {
    console.warn('[STL Trend] No STL results available')
    return
  }

  const breakYears = effectiveBreakYears.value
  if (!breakYears?.length) {
    console.warn('[STL Trend] No break years selected')
    return
  }

  console.log('[STL Trend] Starting analysis with break years:', breakYears)

  try {
    const requestBody = {
      stlResults: stlResults.value.map(r => ({
        lakeId: r.lakeId,
        label: r.label,
        lat: r.lat,
        lon: r.lon,
        trend: r.trend,
        seasonal: r.seasonal,
        remainder: r.remainder,
        time: r.time,
      })),
      breakYears,
    }

    const res = await $fetch('/api/analyzeSTLTrend', {
      method: 'POST',
      body: requestBody,
    })

    trendAnalysis.value = (res as { analysis?: STLTrendAnalysisItem[] }).analysis || []
    console.log('[STL Trend] Analysis complete:', trendAnalysis.value.length, 'lakes')
    emit('update:trend-analysis', trendAnalysis.value)
  }
  catch (e) {
    console.error('Failed to analyze STL trend:', e)
    trendAnalysis.value = []
    emit('update:trend-analysis', trendAnalysis.value)
  }
}

// Watch for changes and auto-run analysis
watch([stlResults, effectiveBreakYears], async ([newStl, newBreaks], [oldStl, oldBreaks]) => {
  console.log('[STL Trend] Watch triggered:', {
    stlCount: newStl?.length,
    breakCount: newBreaks?.length,
    hasAnalysis: trendAnalysis.value?.length > 0,
  })

  // Only run if we have both STL results and break years
  if (newStl?.length && newBreaks?.length) {
    // Run if: (1) STL changed, or (2) breaks changed and we haven't analyzed yet
    const stlChanged = newStl !== oldStl
    const breaksChanged = JSON.stringify(newBreaks) !== JSON.stringify(oldBreaks)
    const needsAnalysis = !trendAnalysis.value?.length || stlChanged || breaksChanged

    if (needsAnalysis) {
      await runTrendAnalysis()
    }
  }
}, { immediate: true, deep: true })
</script>

<template>
  <div
    class="side-view"
    un-min-w-200px
    un-px-4
    un-flex="~ col"
    un-gap-4
    un-h-full
    un-overflow-y-auto
  >
    <QSeperator
      title="Data Source"
      un-text="purple-500"
    />

    <QLabelValuePair
      label-id="dataset-select"
      label-text="Dataset"
    >
      <template #value>
        <QSelect
          v-model="datasetSelected"
          :items="datasetCandidates"
        />
      </template>
    </QLabelValuePair>

    <QSeperator
      title="STL Parameters"
      un-text="purple-500"
    />

    <QLabelValuePair
      label-id="window-mode"
      label-text="Window Mode"
    >
      <template #value>
        <div
          un-flex="~ row"
          un-gap-4
          un-items-center
        >
          <label
            un-flex="~ row"
            un-gap-2
            un-items-center
            un-cursor-pointer
          >
            <input
              v-model="windowMode"
              type="radio"
              value="span"
              un-w-4
              un-h-4
              un-accent-purple-500
            >
            <span un-text="sm">比例</span>
          </label>
          <label
            un-flex="~ row"
            un-gap-2
            un-items-center
            un-cursor-pointer
          >
            <input
              v-model="windowMode"
              type="radio"
              value="fixed"
              un-w-4
              un-h-4
              un-accent-purple-500
            >
            <span un-text="sm">固定长度</span>
          </label>
        </div>
      </template>
    </QLabelValuePair>

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

    <template v-if="windowMode === 'span'">
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
    </template>

    <template v-else>
      <QLabelValuePair
        label-id="seasonal-window"
        label-text="Seasonal Window"
      >
        <template #value>
          <QSelect
            v-model="seasonalWindow"
            :items="['7', '9', '11', '13', '15', '17', '19', '21', '23', '25']"
          />
        </template>
      </QLabelValuePair>

      <QLabelValuePair
        label-id="trend-window"
        label-text="Trend Window"
      >
        <template #value>
          <QSelect
            v-model="trendWindow"
            :items="['13', '15', '17', '19', '21', '23', '25', '27', '29', '31', '51', '101']"
          />
        </template>
      </QLabelValuePair>
    </template>

    <QLabelValuePair
      label-id="inner-iterations"
      label-text="Inner Iterations"
    >
      <template #value>
        <QSelect
          v-model="innerIterations"
          :items="['1', '2', '3', '4', '5']"
        />
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      label-id="outer-iterations"
      label-text="Outer Iterations (Robust)"
    >
      <template #value>
        <QSelect
          v-model="outerIterations"
          :items="['0', '1', '5', '10', '15']"
        />
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      label-id="robust-mode"
      label-text="Robust Mode"
    >
      <template #value>
        <input
          v-model="robustMode"
          type="checkbox"
          un-w-5
          un-h-5
          un-rounded
          un-border
          un-border-neutral-300
          un-dark:border-neutral-600
          un-bg-white
          un-dark:bg-neutral-800
          un-cursor-pointer
          un-accent-purple-500
        >
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      label-id="skip-low-pass"
      label-text="Skip Low-Pass Filter"
    >
      <template #value>
        <input
          v-model="skipLowPass"
          type="checkbox"
          un-w-5
          un-h-5
          un-rounded
          un-border
          un-border-neutral-300
          un-dark:border-neutral-600
          un-bg-white
          un-dark:bg-neutral-800
          un-cursor-pointer
          un-accent-purple-500
        >
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      label-id="skip-finishing"
      label-text="Skip Finishing Loop"
    >
      <template #value>
        <input
          v-model="skipFinishingLoop"
          type="checkbox"
          un-w-5
          un-h-5
          un-rounded
          un-border
          un-border-neutral-300
          un-dark:border-neutral-600
          un-bg-white
          un-dark:bg-neutral-800
          un-cursor-pointer
          un-accent-purple-500
        >
      </template>
    </QLabelValuePair>

    <QSeperator
      title="Trend Segmentation"
      un-text="purple-500"
    />

    <QLabelValuePair
      label-id="break-preset"
      label-text="Break Years Preset"
    >
      <template #value>
        <QSelect
          v-model="selectedBreakPreset"
          :items="breakPresets.map(p => p.label)"
        />
      </template>
    </QLabelValuePair>

    <QLabelValuePair
      v-if="selectedBreakPreset === 'Custom'"
      label-id="custom-break-years"
      label-text="Custom Break Years"
    >
      <template #value>
        <QSelect
          v-model="customBreakYearStrings"
          :items="availableYears.map(y => String(y))"
          multiple
        />
      </template>
    </QLabelValuePair>

    <!-- Manual Analysis Button -->
    <button
      v-if="stlResults?.length && !trendAnalysis?.length"
      un-px-4
      un-py-2
      un-rounded
      un-bg="purple-500 hover:purple-600"
      un-text="white"
      un-text-sm
      un-font-medium
      un-cursor-pointer
      un-transition-colors
      @click="runTrendAnalysis"
    >
      Run Trend Analysis
    </button>

    <!-- Status Indicator -->
    <div
      un-flex="~ col"
      un-gap-2
      un-p-3
      un-rounded
      un-text="xs"
      :class="trendAnalysis?.length
        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
        : stlResults?.length
          ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'"
    >
      <div
        un-flex="~ row"
        un-justify-between
      >
        <span>Status:</span>
        <span un-font-semibold>
          {{ trendAnalysis?.length
            ? '✓ Analysis Complete'
            : stlResults?.length
              ? '⏳ Select break years...'
              : '⏳ Waiting for STL decomposition...' }}
        </span>
      </div>
      <div
        un-flex="~ row"
        un-justify-between
      >
        <span>Current Preset:</span>
        <span>{{ selectedBreakPreset }}</span>
      </div>
      <div
        un-flex="~ row"
        un-justify-between
      >
        <span>Break Years:</span>
        <span>{{ effectiveBreakYears.length ? effectiveBreakYears.join(', ') : 'None selected' }}</span>
      </div>
      <div
        v-if="trendAnalysis?.length"
        un-flex="~ row"
        un-justify-between
      >
        <span>Lakes Analyzed:</span>
        <span>{{ trendAnalysis.length }}</span>
      </div>
      <div
        v-if="!trendAnalysis?.length && stlResults?.length && !effectiveBreakYears.length"
        un-text-center
        un-mt-1
      >
        Please select break years above to enable trend analysis
      </div>
    </div>

    <template v-if="trendAnalysis?.length">
      <QSeperator
        title="Summary Statistics"
        un-text="purple-500"
      />
      <div
        un-flex="~ col"
        un-gap-2
        un-text="xs neutral-600 dark:neutral-400"
      >
        <div
          v-for="stat in summaryStats?.periodStats"
          :key="stat.periodIndex"
          un-flex="~ col"
          un-p-2
          un-rounded
          un-bg="neutral-100 dark:neutral-800"
        >
          <div
            un-flex="~ row"
            un-justify-between
            un-font-bold
          >
            <span>Period {{ stat.periodIndex + 1 }}: {{ stat.label }}</span>
            <span>{{ stat.lakeCount }} lakes</span>
          </div>
          <div
            un-flex="~ row"
            un-justify-between
          >
            <span>Avg Slope:</span>
            <span :class="stat.avgSlope > 0 ? 'text-red-500' : 'text-blue-500'">
              {{ stat.avgSlope > 0 ? '+' : '' }}{{ stat.avgSlope.toFixed(4) }} °C/year
            </span>
          </div>
          <div
            un-flex="~ row"
            un-justify-between
          >
            <span>Avg Mean:</span>
            <span>{{ stat.avgMean.toFixed(2) }}°C</span>
          </div>
          <div
            un-flex="~ row"
            un-justify-between
          >
            <span>Avg Variance:</span>
            <span>{{ stat.avgVariance.toFixed(4) }}</span>
          </div>
        </div>

        <template v-if="summaryStats?.breakStats?.length">
          <div
            un-font-bold
            un-mt-2
          >
            Break Points Summary:
          </div>
          <div
            v-for="brk in summaryStats.breakStats"
            :key="brk.breakIndex"
            un-flex="~ col"
            un-p-2
            un-rounded
            un-bg="neutral-100 dark:neutral-800"
          >
            <div
              un-flex="~ row"
              un-justify-between
              un-font-semibold
            >
              <span>Break at {{ brk.year }}</span>
              <span>{{ brk.significantCount }}/{{ trendAnalysis.length }} significant</span>
            </div>
            <div
              un-flex="~ row"
              un-justify-between
            >
              <span>Avg ΔSlope:</span>
              <span :class="brk.avgDeltaSlope > 0 ? 'text-red-500' : 'text-blue-500'">
                {{ brk.avgDeltaSlope > 0 ? '+' : '' }}{{ brk.avgDeltaSlope.toFixed(4) }}
              </span>
            </div>
            <div
              un-flex="~ row"
              un-justify-between
            >
              <span>Avg ΔMean:</span>
              <span>{{ brk.avgDeltaMean > 0 ? '+' : '' }}{{ brk.avgDeltaMean.toFixed(2) }}°C</span>
            </div>
          </div>
        </template>
      </div>

      <QSeperator
        title="Selected Lake Period Statistics"
        un-text="purple-500"
      />
      <SegmentStatsTable
        v-if="selectedTrendAnalysis"
        :segments="adaptedSegments"
        :breaks="adaptedBreaks"
      />
      <div
        v-else
        un-text="neutral-500"
        un-text-sm
        un-p-4
        un-text-center
      >
        Select a lake to view its period statistics
      </div>
    </template>

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

        <div
          un-h-160px
          un-flex="~ col"
        >
          <PlotlyCompo
            type="chart"
            un-h-full
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

        <div
          un-h-160px
          un-flex="~ col"
        >
          <PlotlyCompo
            type="chart"
            un-h-full
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
            :layout="{ title: { text: 'Trend' }, showlegend: false, margin: { l: 40, r: 10, t: 30, b: 30 }, shapes: trendBreakShapes, annotations: trendBreakAnnotations }"
          />
        </div>

        <div
          un-h-160px
          un-flex="~ col"
        >
          <PlotlyCompo
            type="chart"
            un-h-full
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

        <div
          un-h-160px
          un-flex="~ col"
        >
          <PlotlyCompo
            type="chart"
            un-h-full
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

        <QSeperator
          title="Diagnostics"
          un-text="purple-500"
        />
        <div
          un-flex="~ col"
          un-gap-1
          un-text="xs neutral-600 dark:neutral-400"
        >
          <div v-if="selectedSTL.diagnostics">
            <div>Inner Iterations: {{ selectedSTL.diagnostics.innerIterations }}</div>
            <div>Outer Iterations: {{ selectedSTL.diagnostics.outerIterations }}</div>
            <div>Robust Mode: {{ selectedSTL.diagnostics.robust ? 'Enabled' : 'Disabled' }}</div>
            <div>Final MAD: {{ selectedSTL.diagnostics.finalMAD.toFixed(4) }}</div>
            <div>Low Weight Points: {{ selectedSTL.diagnostics.lowWeightCount }}</div>
            <div>Weight Range: [{{ selectedSTL.diagnostics.weightRange[0].toFixed(3) }}, {{ selectedSTL.diagnostics.weightRange[1].toFixed(3) }}]</div>
          </div>
          <div v-else>
            No diagnostics available
          </div>
        </div>

        <div
          v-if="selectedSTL.weights"
          un-h-120px
          un-flex="~ col"
        >
          <PlotlyCompo
            type="chart"
            un-h-full
            :data="[
              {
                x: selectedSTL.time,
                y: selectedSTL.weights,
                type: 'scatter',
                mode: 'lines',
                name: 'Robust Weights',
                line: { color: '#ef4444', width: 1 },
              },
            ]"
            :layout="{ title: { text: 'Robust Weights' }, showlegend: false, margin: { l: 40, r: 10, t: 30, b: 30 }, yaxis: { range: [0, 1] } }"
          />
        </div>
      </div>
    </template>
  </div>
</template>
