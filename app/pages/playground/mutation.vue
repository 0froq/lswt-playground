<script setup lang="ts">
import type { LakePoint, MutationPoint } from '~/types/mutation'

const poi = ref<string | undefined>(undefined)
const points = ref<LakePoint[] | undefined>(undefined)
const mutationPoints = ref<MutationPoint[] | undefined>(undefined)
const dataset = ref<string | undefined>(undefined)

const { lakeFactorsMap, loadFactors } = useLakeFactors()

watchEffect(async () => {
  await loadFactors(dataset.value)
})
</script>

<template>
  <PlaygroundLayout
    title="Mutation Detection"
    theme="amber"
    :lake-factors="lakeFactorsMap"
  >
    <template #sidebar>
      <PlaygroundMutationSideView
        v-model:poi="poi"
        v-model:dataset="dataset"
        @update:points="points = $event"
        @update:mutation-points="mutationPoints = $event"
      />
    </template>

    <template #main>
      <PlaygroundMutationMainView
        v-model:poi="poi"
        :points="points"
        :mutation-points="mutationPoints"
        :lake-factors="lakeFactorsMap"
      />
    </template>
  </PlaygroundLayout>
</template>
