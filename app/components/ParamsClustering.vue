<script setup lang="ts">
import type { ParamsClustering } from '~/types/param'

const emit = defineEmits<{
  (e: 'update:params', params: ParamsClustering): void
}>()

// Internal state
const clusterCount = ref<number>(5)
const coordinateWeight = ref<number>(0.35)
const bandMode = ref<'std' | 'minmax'>('std')

// Emit params when any value changes
watch([clusterCount, coordinateWeight, bandMode], () => {
  emit('update:params', {
    algorithm: 'kmeans',
    clusterCount: clusterCount.value,
    coordinateWeight: coordinateWeight.value,
    bandMode: bandMode.value,
    selectedClusterId: undefined,
  })
}, { immediate: true, deep: true })
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-3
  >
    <!-- Cluster Count -->
    <QLabelValuePair
      label-id="cluster-count"
      label-text="Number of Clusters"
    >
      <template #value>
        <QSlider
          v-model="clusterCount"
          :min="2"
          :max="10"
          :step="1"
          :show-value="true"
        />
      </template>
    </QLabelValuePair>

    <!-- Coordinate Weight -->
    <QLabelValuePair
      label-id="coordinate-weight"
      label-text="Coordinate Weight"
    >
      <template #value>
        <QSlider
          v-model="coordinateWeight"
          :min="0"
          :max="1"
          :step="0.05"
          :show-value="true"
        />
      </template>
    </QLabelValuePair>

    <!-- Band Mode -->
    <QLabelValuePair
      label-id="band-mode"
      label-text="Range Band Mode"
    >
      <template #value>
        <QSelect
          v-model="bandMode"
          :items="['std', 'minmax']"
        />
      </template>
    </QLabelValuePair>
  </div>
</template>
