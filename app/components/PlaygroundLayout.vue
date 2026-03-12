<script setup lang="ts">
import type { LakeFactors } from '~/types/factor'

const props = defineProps<{
  title: string
  theme: 'amber' | 'teal'
  lakeFactors?: Map<string, LakeFactors>
}>()

const themeColor = computed(() => {
  return props.theme === 'amber' ? 'amber-500' : 'teal-500'
})
</script>

<template>
  <div
    un-flex="~ row grow"
    un-w-full
    un-max-h-full
  >
    <!-- Sidebar Slot -->
    <div
      un-w="1/4"
      un-min-w-200px
      un-overflow-y-auto
    >
      <slot name="sidebar" />
    </div>

    <!-- Divider -->
    <div
      un-w-px
      un-bg="neutral-700 dark:neutral-300"
      un-mx-2
    />

    <!-- Main Content Slot -->
    <div
      un-flex-1
      un-overflow-y-auto
    >
      <slot name="main" />
    </div>
  </div>
</template>
