<script setup lang="ts">
import type { LakePoint } from '~/types/mutation'
import type { Break, Segment } from '~/types/segments'

const poi = ref<string | undefined>(undefined)
const points = ref<LakePoint[] | undefined>(undefined)
const segments = ref<Segment[] | undefined>(undefined)
const breaks = ref<Break[] | undefined>(undefined)
const dataset = ref<string | undefined>(undefined)

const { lakeFactorsMap, loadFactors } = useLakeFactors()

watchEffect(async () => {
  await loadFactors(dataset.value)
})
</script>

<template>
  <PlaygroundLayout
    title="Segmentation Analysis"
    theme="teal"
    :lake-factors="lakeFactorsMap"
  >
    <template #sidebar>
      <PlaygroundSegmentSideView
        v-model:poi="poi"
        v-model:dataset="dataset"
        @update:points="points = $event"
        @update:segments="segments = $event"
        @update:breaks="breaks = $event"
      />
    </template>

    <template #main>
      <PlaygroundSegmentMainView
        v-model:poi="poi"
        :points="points"
        :segments="segments"
        :breaks="breaks"
        :lake-factors="lakeFactorsMap"
      />
    </template>
  </PlaygroundLayout>
</template>
