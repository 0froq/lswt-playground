<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { SlidingWindowAnalysisResponse } from '~/types/sliding'
import type { SpatialClusteringResponse } from '~/types/clustering'

const poi = ref<string | undefined>(undefined)
const points = ref<LakePoint[] | undefined>(undefined)
const rawSeries = ref<any[] | undefined>(undefined)
const slidingAnalysis = ref<SlidingWindowAnalysisResponse | undefined>(undefined)
const clusteringAnalysis = ref<SpatialClusteringResponse | undefined>(undefined)
const dataset = ref<string | undefined>(undefined)

const { lakeFactorsMap, loadFactors } = useLakeFactors()

watchEffect(async () => {
  await loadFactors(dataset.value)
})
</script>

<template>
  <PlaygroundLayout
    title="Sliding Window Analysis"
    theme="sky"
    :lake-factors="lakeFactorsMap"
  >
    <template #sidebar>
      <PlaygroundSlidingSideView
        v-model:poi="poi"
        v-model:dataset="dataset"
        @update:points="points = $event"
        @update:raw-series="rawSeries = $event"
        @update:sliding-analysis="slidingAnalysis = $event"
        @update:clustering-analysis="clusteringAnalysis = $event"
      />
    </template>

    <template #main>
      <PlaygroundSlidingMainView
        v-model:poi="poi"
        :points="points"
        :raw-series="rawSeries"
        :sliding-analysis="slidingAnalysis"
        :clustering-analysis="clusteringAnalysis"
      />
    </template>
  </PlaygroundLayout>
</template>
