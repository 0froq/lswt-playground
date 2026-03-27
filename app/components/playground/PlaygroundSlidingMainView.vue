<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { SlidingWindowAnalysisResponse } from '~/types/sliding'
import type { SpatialClusteringResponse } from '~/types/clustering'
import type { ParamsSlidingWindow } from '~/types/param'

const props = defineProps<{
  points?: LakePoint[]
  slidingAnalysis?: SlidingWindowAnalysisResponse
  clusteringAnalysis?: SpatialClusteringResponse
  rawSeries?: any[] // Raw time series data
  paramsSliding?: ParamsSlidingWindow
}>()

// Unified selection model - all components bind to this
const poi = defineModel<string | undefined>('poi')

// Map controls
const selectedMetric = ref<'mean' | 'std' | 'slope'>('mean')
const selectedWindowSizeStr = ref<string>('9')
const selectedCenterYearStr = ref<string>('2000')

// Use windowSizes from paramsSliding if provided, otherwise default
const windowSizes = computed(() => props.paramsSliding?.windowSizes ?? [5, 9, 13])

// Sync with paramsSliding when available
watch(() => props.paramsSliding, (params) => {
  if (params) {
    selectedMetric.value = params.selectedMetric
    selectedWindowSizeStr.value = String(params.selectedWindowSize)
    selectedCenterYearStr.value = String(params.selectedCenterYear)
  }
}, { immediate: true })

const selectedWindowSize = computed(() => Number(selectedWindowSizeStr.value))
const selectedCenterYear = computed(() => Number(selectedCenterYearStr.value))

const yearCandidates = computed(() => props.slidingAnalysis?.yearCandidates ?? [])

watch(yearCandidates, (years) => {
  if (years.length && !years.includes(Number(selectedCenterYearStr.value))) {
    selectedCenterYearStr.value = String(years[Math.floor(years.length / 2)])
  }
})

// 1. Sliding window map data
const filteredSlidingData = computed(() => {
  return props.slidingAnalysis?.perLakeFeatures.filter(
    f => f.metric === selectedMetric.value,
  ) ?? []
})

// 2. Global sliding features
const globalFeatures = computed(() => {
  return props.slidingAnalysis?.globalMeanFeatures ?? []
})

// Cluster colors
const clusterColors = [
  '#0ea5e9', '#ef4444', '#3b82f6', '#22c55e', '#f59e0b',
  '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#84cc16',
]

function getClusterColor(clusterId: number): string {
  return clusterColors[(clusterId + 1) % clusterColors.length] ?? '#0ea5e9'
}

// Get cluster ID for a lake
function getClusterIdForLake(lakeId: string | undefined): number | undefined {
  if (!lakeId) return undefined
  const assignment = props.clusteringAnalysis?.assignments.find(a => a.lakeId === lakeId)
  return assignment?.clusterId
}

// Get sliding features for selected lake
const selectedLakeSlidingFeatures = computed(() => {
  if (!poi.value) return []
  const clusterId = getClusterIdForLake(poi.value)
  return props.slidingAnalysis?.globalMeanFeatures.filter(
    f => f.lakeId === poi.value || (clusterId !== undefined && f.lakeId === `cluster_${clusterId}`),
  ) ?? []
})
</script>

<template>
  <div
    class="main-view"
    un-flex="~ col grow"
    un-px-4
    un-gap-6
    un-overflow-y-auto
  >
    <!-- Section 1: Sliding Window Map -->
    <div
      un-sticky
      un-top-0
      un-z-10
      un-bg="neutral-100 dark:neutral-900"
      un-flex="~ col"
      un-gap-4
    >
      <QSeperator
        title="1. Lake Distribution by Sliding Window Feature"
        un-text="sky-500"
        un-bg="neutral-100 dark:neutral-900"
      />

      <div un-flex="~ row wrap" un-gap-4>
        <QLabelValuePair label-id="map-metric" label-text="Metric" un-shrink-0>
          <template #value>
            <QSelect v-model="selectedMetric" :items="['mean', 'std', 'slope']" />
          </template>
        </QLabelValuePair>

        <QLabelValuePair label-id="map-window" label-text="Window" un-shrink-0>
          <template #value>
            <QSelect v-model="selectedWindowSizeStr" :items="['3', '5', '7', '9', '11', '13', '15']" />
          </template>
        </QLabelValuePair>

        <QLabelValuePair label-id="map-year" label-text="Year" un-shrink-0>
          <template #value>
            <QSelect v-model="selectedCenterYearStr" :items="yearCandidates.map(String)" />
          </template>
        </QLabelValuePair>
      </div>

      <QSeperator />
    </div>

    <SlidingWindowMapView
      v-if="points?.length"
      :points="points"
      :sliding-data="filteredSlidingData"
      :selected-metric="selectedMetric"
      :selected-window-size="selectedWindowSize"
      :selected-center-year="selectedCenterYear"
      :selected-lake-id="poi"
      @select-lake="poi = $event"
    />

    <!-- Section 2: Spatial Clusters Map -->
    <QSeperator title="2. Spatial Clusters" un-text="sky-500" />

    <ClusterMapView
      v-if="clusteringAnalysis"
      :points="points ?? []"
      :cluster-assignments="clusteringAnalysis.assignments"
      :selected-lake-id="poi"
      @select-lake="poi = $event"
    />

    <!-- Section 3: Raw Time Series with Member Lakes -->
    <QSeperator title="3. Raw Time Series with Member Lakes" un-text="sky-500" />

    <ClusterTimeSeriesWithMembers
      v-if="clusteringAnalysis"
      :clusters="clusteringAnalysis.clusters"
      :selected-lake-id="poi"
    />

    <!-- Section 4: Sliding Window Mean -->
    <QSeperator title="4. Sliding Window Mean" un-text="sky-500" />

    <div un-grid un-grid-cols="1 md:2 lg:3 xl:4" un-gap-4>
      <SlidingWindowSingleMetric
        :data="globalFeatures"
        title="Global Mean"
        metric="mean"
        y-axis-title="°C"
        :selected-window-sizes="windowSizes"
      />
      <SlidingWindowSingleMetric
        v-for="cluster in clusteringAnalysis?.clusters"
        :key="`mean-${cluster.clusterId}`"
        :data="cluster.slidingFeatures"
        :title="`Cluster ${cluster.clusterId + 1}`"
        metric="mean"
        y-axis-title="°C"
        :color="getClusterColor(cluster.clusterId)"
        :selected-window-sizes="windowSizes"
      />
    </div>

    <!-- Section 5: Sliding Window Slope -->
    <QSeperator title="5. Sliding Window Slope" un-text="sky-500" />

    <div un-grid un-grid-cols="1 md:2 lg:3 xl:4" un-gap-4>
      <SlidingWindowSingleMetric
        :data="globalFeatures"
        title="Global Slope"
        metric="slope"
        y-axis-title="°C/year"
        :selected-window-sizes="windowSizes"
      />
      <SlidingWindowSingleMetric
        v-for="cluster in clusteringAnalysis?.clusters"
        :key="`slope-${cluster.clusterId}`"
        :data="cluster.slidingFeatures"
        :title="`Cluster ${cluster.clusterId + 1}`"
        metric="slope"
        y-axis-title="°C/year"
        :color="getClusterColor(cluster.clusterId)"
        :selected-window-sizes="windowSizes"
      />
    </div>

    <!-- Section 6: Sliding Window Std -->
    <QSeperator title="6. Sliding Window Standard Deviation" un-text="sky-500" />

    <div un-grid un-grid-cols="1 md:2 lg:3 xl:4" un-gap-4>
      <SlidingWindowSingleMetric
        :data="globalFeatures"
        title="Global Std"
        metric="std"
        y-axis-title="°C"
        :selected-window-sizes="windowSizes"
      />
      <SlidingWindowSingleMetric
        v-for="cluster in clusteringAnalysis?.clusters"
        :key="`std-${cluster.clusterId}`"
        :data="cluster.slidingFeatures"
        :title="`Cluster ${cluster.clusterId + 1}`"
        metric="std"
        y-axis-title="°C"
        :color="getClusterColor(cluster.clusterId)"
        :selected-window-sizes="windowSizes"
      />
    </div>
  </div>
</template>
