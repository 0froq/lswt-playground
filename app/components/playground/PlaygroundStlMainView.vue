<script setup lang="ts">
import type { LakeFactors } from '~/types/factor'
import type { LakePoint } from '~/types/mutation'
import type { STLResult } from '~/types/stl'
import type { STLTrendAnalysisItem } from '~/types/stl-trend'

const props = defineProps<{
  points?: LakePoint[]
  stlResults?: STLResult[]
  trendAnalysis?: STLTrendAnalysisItem[]
  lakeFactors?: Map<string, LakeFactors>
}>()

const poi = defineModel<string | undefined>('poi')
</script>

<template>
  <div
    class="main-view"
    un-flex="~ col grow"
    un-px-4
    un-gap-4
    un-overflow-y-auto
  >
    <QSeperator
      title="STL Map"
      un-text="purple-500"
    />
    <StlMapView
      v-model:poi="poi"
      :points="props.points"
      :stl-results="props.stlResults"
      :trend-analysis="props.trendAnalysis"
    />
  </div>
</template>
