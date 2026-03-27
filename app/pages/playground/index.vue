<script setup lang="ts">
import LinkUnderline from '~/components/LinkUnderline.vue'

definePageMeta({
  layout: 'default',
})
</script>

<template>
  <div
    un-py-1
    un-max-w-1200px
    un-mx-auto
    un-h-full
  >
    <!-- Header -->
    <div
      un-mb-12
    >
      <div
        un-flex="~ row"
        un-justify-between
        un-gap-4
        un-mb-4
      >
        <div
          un-text-4xl
          un-font="bold stylish"
          un-mb-4
        >
          Playground
        </div>
        <!-- Back to Home -->
        <div>
          <NuxtLink
            to="/"
            un-inline-flex
            un-items-center
            un-gap-2
            un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
            un-transition-colors
          >
            <un-i-ph-arrow-left />
            <span>Back to Home</span>
          </NuxtLink>
        </div>
      </div>
      <div
        un-text="lg neutral-500"
        un-max-w-600px
      >
        Interactive tools for Lake Surface Water Temperature analysis.
        Choose a tool below to get started.
      </div>
    </div>
    <div
      un-flex="~ row"
      un-gap-8
      un-mb-12
    >
      <LinkUnderline
        un-text="2xl"
        un-before="bg-gradient-to-r from-amber-100 to-amber-500"
        text="Mutation Detection"
        :tooltip="true"
        tooltip-text="Detect significant change points in lake temperature time series."
        href="/playground/mutation"
      />
      <LinkUnderline
        un-text="2xl"
        un-before="bg-gradient-to-r from-teal-100 to-teal-500"
        text="Segmentation Analysis"
        :tooltip="true"
        tooltip-text="Compare lake temperature across different time periods with custom break years."
        href="/playground/segments"
      />
      <LinkUnderline
        un-text="2xl"
        un-before="bg-gradient-to-r from-purple-100 to-purple-500"
        text="STL Decomposition"
        :tooltip="true"
        tooltip-text="Decompose time series into trend, seasonal, and remainder components using LOESS."
        href="/playground/stl"
      />
      <LinkUnderline
        un-text="2xl"
        un-before="bg-gradient-to-r from-sky-100 to-sky-500"
        text="Sliding Window Analysis"
        :tooltip="true"
        tooltip-text="Analyze lake temperature trends using sliding windows with spatial clustering."
        href="/playground/sliding"
      />
    </div>
  </div>
</template>
