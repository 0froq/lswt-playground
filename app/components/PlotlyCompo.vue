<script setup lang="ts">
import { ref } from 'vue'
import { usePlotly } from '../composables/usePlotly'

const props = defineProps<{
  type?: 'chart' | 'map'
  data?: Plotly.Data[]
  layout?: Partial<Plotly.Layout>
  config?: Partial<Plotly.Config>
}>()

const emit = defineEmits<{ (e: 'plotlyClick', payload: any): void, (e: 'plotlyHover', payload: any): void, (e: 'plotlyUnhover', payload: any): void }>()

const el = ref<HTMLDivElement | null>(null)
usePlotly(el, props, emit)
</script>

<template>
  <div
    ref="el"
    un-w-full
    un-h-full
  />
</template>
