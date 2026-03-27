<script setup lang="ts">
import type { LakeFactors } from '~/types/factor'
import type { LakePoint, MutationPoint } from '~/types/mutation'
import { computed, ref } from 'vue'

const props = defineProps<{
  points: LakePoint[] | undefined
  mutationPoints: MutationPoint[] | undefined
  lakeFactors?: Map<string, LakeFactors>
}>()

const poi = defineModel<string | undefined>('poi')
const tCandidates = computed<number[] | undefined>(() => {
  if (!props.mutationPoints?.length)
    return undefined
  const years = props.mutationPoints.map(m => m.year)
  const uniqueYears = Array.from(new Set(years))
  uniqueYears.sort((a, b) => a - b)
  return uniqueYears
})
const timeFilterRange = ref<{
  start: number | undefined
  end: number | undefined
}>({
  start: undefined,
  end: undefined,
})
</script>

<template>
  <div
    class="main-view"
    un-flex="~ col grow"
    un-px-4
    un-gap-4
    un-overflow-y-auto
  >
    <div
      un-sticky
      un-top-0
      un-z-10
      un-bg="neutral-100 dark:neutral-900"
      un-flex="~ col"
      un-gap-4
    >
      <QSeperator
        title="Lake Distribution"
        un-text="amber-500"
        un-bg="neutral-100 dark:neutral-900"
      />
      <QLabelValuePair
        label-id="time-filter"
        label-text="Time Filter"
        un-shrink-0
      >
        <template #value>
          <QSlider
            :key="tCandidates?.length"
            v-model:start="timeFilterRange.start"
            v-model:end="timeFilterRange.end"
            :min="tCandidates ? Math.min(...tCandidates) : 0"
            :max="tCandidates ? Math.max(...tCandidates) : 0"
            :step="1"
            :range="true"
            :show-value="true"
          />
        </template>
      </QLabelValuePair>
      <QSeperator />
    </div>
    <MutationResDistribution
      v-model:poi="poi"
      :lakes="props.points"
      :mutations="props.mutationPoints"
      :time-filter-range="timeFilterRange"
    />
    <QSeperator
      title="Mutation Scatterplots"
      un-text="amber-500"
    />
    <MutationResPrePostScatter
      :mutations="mutationPoints"
      :t-candidates="tCandidates"
    />
  </div>
</template>
