<script setup lang="ts">
const props = defineProps<{
  defaultOverrides?: {
    smoothWindow?: number
    diffOrder?: number
  }
}>()

const emit = defineEmits<{
  (e: 'update:preprocessParams', preprocessParams: {
    smoothWindow: number
    diffOrder: number
  }): void
}>()

const diffOrderSelected = ref<number>(props.defaultOverrides?.diffOrder ?? 0)
// const diffOrderSelected = computed<number>(() => {
//   return props.defaultOverrides?.diffOrder ?? 0
// })

const smoothWindowSelected = ref<number>(props.defaultOverrides?.smoothWindow ?? 1)
// const smoothWindowSelected = computed<number>(() => {
//   return props.defaultOverrides?.smoothWindow ?? 1
// })

watch(
  [
    smoothWindowSelected,
    diffOrderSelected,
  ],
  () => {
    const preprocessParams = {
      smoothWindow: smoothWindowSelected.value,
      diffOrder: diffOrderSelected.value,
    }
    emit('update:preprocessParams', preprocessParams)
  },
  { immediate: true },
)
</script>

<template>
  <div
    un-flex="~ col"
    un-gap-1
  >
    <QLabelValuePair
      label-id="smooth-window-slider"
      label-text="Smooth Window"
    >
      <template #value>
        <QSlider
          v-model="smoothWindowSelected"
          :min="1"
          :max="5"
          :step="1"
          :show-value="true"
        />
      </template>
    </QLabelValuePair>
    <QLabelValuePair
      label-id="diff-order-slider"
      label-text="Difference Order"
    >
      <template #value>
        <QSlider
          v-model="diffOrderSelected"
          :min="0"
          :max="2"
          :step="1"
          :show-value="true"
        />
      </template>
    </QLabelValuePair>
  </div>
</template>
