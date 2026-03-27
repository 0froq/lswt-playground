<script setup lang="ts">
import type { ParamsSlidingWindow } from '~/types/param'
import type { SlidingMetricKey } from '~/types/sliding'

const emit = defineEmits<{
  (e: 'update:params', params: ParamsSlidingWindow): void
}>()

// Window size options
const windowSizeOptions = [3, 5, 7, 9, 11, 13, 15]
const metricOptions: SlidingMetricKey[] = ['mean', 'std', 'slope']

// Internal state
const windowSizes = ref<number[]>([5, 9, 13])
const selectedMetric = ref<SlidingMetricKey>('mean')
const selectedWindowSizeStr = ref<string>('9')
const selectedCenterYear = ref<number>(2000)

// Computed number value
const selectedWindowSize = computed(() => Number(selectedWindowSizeStr.value))

// Emit params when any value changes
watch([windowSizes, selectedMetric, selectedWindowSizeStr, selectedCenterYear], () => {
  emit('update:params', {
    windowSizes: windowSizes.value,
    selectedMetric: selectedMetric.value,
    selectedWindowSize: Number(selectedWindowSizeStr.value),
    selectedCenterYear: selectedCenterYear.value,
  })
}, { immediate: true, deep: true })

// Toggle window size selection
function toggleWindowSize(size: number) {
  const index = windowSizes.value.indexOf(size)
  if (index === -1) {
    windowSizes.value.push(size)
    windowSizes.value.sort((a, b) => a - b)
  }
  else {
    windowSizes.value.splice(index, 1)
  }
}
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-3
  >
    <!-- Window Sizes Selection -->
    <QLabelValuePair
      label-id="window-sizes-select"
      label-text="Window Sizes (years)"
    >
      <template #value>
        <div un-flex="~ wrap" un-gap-2>
          <button
            v-for="size in windowSizeOptions"
            :key="size"
            un-px-2
            un-py-1
            un-text-xs
            un-rounded
            un-transition-colors
            :un-bg="windowSizes.includes(size) ? 'sky-500' : 'neutral-200 dark:neutral-700'"
            :un-text="windowSizes.includes(size) ? 'white' : 'neutral-700 dark:neutral-300'"
            @click="toggleWindowSize(size)"
          >
            {{ size }}y
          </button>
        </div>
      </template>
    </QLabelValuePair>

    <!-- Selected Metric -->
    <QLabelValuePair
      label-id="metric-select"
      label-text="Display Metric"
    >
      <template #value>
        <QSelect
          v-model="selectedMetric"
          :items="metricOptions"
        />
      </template>
    </QLabelValuePair>

    <!-- Selected Window Size for Map -->
    <QLabelValuePair
      label-id="window-size-map"
      label-text="Map Window Size"
    >
      <template #value>
        <QSelect
          v-model="selectedWindowSizeStr"
          :items="['3', '5', '7', '9', '11', '13', '15']"
        />
      </template>
    </QLabelValuePair>

    <!-- Selected Center Year for Map -->
    <QLabelValuePair
      label-id="center-year-map"
      label-text="Map Center Year"
    >
      <template #value>
        <QSlider
          v-model="selectedCenterYear"
          :min="1990"
          :max="2020"
          :step="1"
          :show-value="true"
        />
      </template>
    </QLabelValuePair>
  </div>
</template>
