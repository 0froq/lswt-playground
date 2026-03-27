<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { STLResult } from '~/types/stl'
import type { STLTrendAnalysisItem } from '~/types/stl-trend'

const poi = ref<string | undefined>(undefined)
const points = ref<LakePoint[] | undefined>(undefined)
const stlResults = ref<STLResult[] | undefined>(undefined)
const trendAnalysis = ref<STLTrendAnalysisItem[] | undefined>(undefined)
const dataset = ref<string | undefined>(undefined)

const { lakeFactorsMap, loadFactors } = useLakeFactors()

watchEffect(async () => {
  await loadFactors(dataset.value)
})
</script>

<template>
  <PlaygroundLayout
    title="STL Decomposition"
    theme="purple"
    :lake-factors="lakeFactorsMap"
  >
    <template #sidebar>
      <PlaygroundStlSideView
        v-model:poi="poi"
        v-model:dataset="dataset"
        @update:points="points = $event"
        @update:stl-results="stlResults = $event"
        @update:trend-analysis="trendAnalysis = $event"
      />
    </template>

    <template #main>
      <PlaygroundStlMainView
        v-model:poi="poi"
        :points="points"
        :stl-results="stlResults"
        :trend-analysis="trendAnalysis"
        :lake-factors="lakeFactorsMap"
      />
    </template>
  </PlaygroundLayout>
</template>
