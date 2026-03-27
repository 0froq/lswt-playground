<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { SlidingWindowAnalysisResponse } from '~/types/sliding'
import type { SpatialClusteringResponse } from '~/types/clustering'
import type { ParamsData, ParamsSlidingWindow, ParamsClustering } from '~/types/param'

const emit = defineEmits<{
  (e: 'update:points', points: LakePoint[]): void
  (e: 'update:rawSeries', series: any[]): void
  (e: 'update:slidingAnalysis', analysis: SlidingWindowAnalysisResponse): void
  (e: 'update:clusteringAnalysis', analysis: SpatialClusteringResponse): void
}>()

const poiModel = defineModel<string | undefined>('poi')
const dataset = defineModel<string | undefined>('dataset')

// Data loading params - use annual aggregation, no smoothing/differencing
const paramsData = ref<ParamsData>({
  agg: 'avg',
})

// Sliding window params
const paramsSliding = ref<ParamsSlidingWindow>({
  windowSizes: [5, 9, 13],
  selectedMetric: 'mean',
  selectedWindowSize: 9,
  selectedCenterYear: 2000,
})

// Clustering params
const paramsClustering = ref<ParamsClustering>({
  algorithm: 'kmeans',
  clusterCount: 5,
  coordinateWeight: 0.35,
  bandMode: 'std',
  selectedClusterId: undefined,
})

// Use playground data composable for loading raw series
const { rawSeries, points } = usePlaygroundData({
  paramsData,
  paramsPreprocess: ref({ smoothWindow: 1, diffOrder: 0 }), // No preprocessing
  dataset,
})

// Sync poi with model
const { poi, poiCandidates, selectedSeries } = usePlaygroundPoi({ rawSeries })
watch(poi, (v) => { poiModel.value = v }, { immediate: true })
watch(poiModel, (v) => { if (v !== poi.value) poi.value = v })

// Watch points and emit
watch(points, (newPoints) => {
  if (newPoints) emit('update:points', newPoints)
}, { immediate: true })

// Watch rawSeries and emit
watch(rawSeries, (newSeries) => {
  if (newSeries) emit('update:rawSeries', newSeries)
}, { immediate: true })

// Sliding window analysis results
const slidingAnalysis = ref<SlidingWindowAnalysisResponse | undefined>(undefined)

// Clustering analysis results
const clusteringAnalysis = ref<SpatialClusteringResponse | undefined>(undefined)

// Fetch sliding window analysis when raw series or params change
watchEffect(async () => {
  if (!rawSeries.value?.length) return

  const metrics: ('mean' | 'std' | 'slope')[] = ['mean', 'std', 'slope']

  try {
    const response = await $fetch('/api/slidingWindowAnalysis', {
      method: 'POST',
      body: {
        rawSeries: rawSeries.value,
        windowSizes: paramsSliding.value.windowSizes,
        metrics,
      },
    })
    slidingAnalysis.value = response as SlidingWindowAnalysisResponse
    emit('update:slidingAnalysis', slidingAnalysis.value)
  }
  catch (e) {
    console.error('Sliding window analysis failed:', e)
  }
})

// Fetch clustering analysis when raw series, clustering params, or window sizes change
watch([
  rawSeries,
  () => paramsClustering.value.clusterCount,
  () => paramsClustering.value.coordinateWeight,
  () => paramsClustering.value.bandMode,
  () => paramsSliding.value.windowSizes,
], async ([newRawSeries]) => {
  if (!newRawSeries?.length) return

  try {
    const response = await $fetch('/api/spatialClustering', {
      method: 'POST',
      body: {
        rawSeries: newRawSeries,
        clusterCount: paramsClustering.value.clusterCount,
        coordinateWeight: paramsClustering.value.coordinateWeight,
        bandMode: paramsClustering.value.bandMode,
        windowSizes: paramsSliding.value.windowSizes,
      },
    })
    clusteringAnalysis.value = response as SpatialClusteringResponse
    emit('update:clusteringAnalysis', clusteringAnalysis.value)
  }
  catch (e) {
    console.error('Spatial clustering failed:', e)
  }
}, { immediate: true })

// Get selected lake's sliding features for display (per-lake, not global)
const selectedLakeSlidingFeatures = computed(() => {
  if (!slidingAnalysis.value || !poi.value) return []
  return slidingAnalysis.value.perLakeFeatures.filter(f => f.lakeId === poi.value)
})
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
      un-text="sky-500"
    />
    <ParamsData
      @update:data-params="paramsData = $event"
    />

    <QSeperator
      title="Sliding Window Settings"
      un-text="sky-500"
    />
    <ParamsSlidingWindow
      @update:params="paramsSliding = $event"
    />

    <QSeperator
      title="Spatial Clustering"
      un-text="sky-500"
    />
    <ParamsClustering
      @update:params="paramsClustering = $event"
    />

    <QSeperator
      title="Points of Interest"
      un-text="sky-500"
    />
    <ParamsPoi
      v-model:poi="poi"
      :poi-candidates="poiCandidates"
    />

    <!-- Selected lake detail charts (4 charts: raw, mean, slope, std) -->
    <div v-if="poi">
      <QSeperator
        title="Selected Lake Details"
        un-text="sky-500"
      />
      <PoiDetailCharts
        :raw-series="rawSeries"
        :sliding-features="selectedLakeSlidingFeatures"
        :lake-id="poi"
      />
    </div>
  </div>
</template>
