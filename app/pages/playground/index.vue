<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const tools = [
  {
    id: 'mutation',
    title: 'Mutation Detection',
    description: 'Detect significant change points in lake temperature time series using Pettitt test, sequential t-test, and statistical analysis.',
    icon: 'ph-chart-line-up-duotone',
    color: 'amber',
    href: '/playground/mutation',
    features: ['Pettitt Test', 'Sequential T-Test', 'Sen\'s Slope', 'Variance Analysis'],
  },
  {
    id: 'segment',
    title: 'Segmentation Analysis',
    description: 'Compare lake temperature across different time periods with custom break years and statistical comparison.',
    icon: 'ph-line-segments-duotone',
    color: 'teal',
    href: '/playground/segments',
    features: ['Custom Break Years', 'Period Comparison', 'Statistical Tests', 'Interactive Charts'],
  },
]
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
      un-text-center
      un-mb-12
    >
      <div
        un-text-4xl
        un-font-bold
        un-mb-4
      >
        Playground
      </div>
      <div
        un-text="lg neutral-500"
        un-max-w-600px
        un-mx-auto
      >
        Interactive tools for Lake Surface Water Temperature analysis.
        Choose a tool below to get started.
      </div>
    </div>

    <!-- Tool Cards Grid -->
    <div
      un-grid="~ cols-1 md:cols-2"
      un-gap-8
      un-mb-12
    >
      <NuxtLink
        v-for="tool in tools"
        :key="tool.id"
        :to="tool.href"
        un-block
        un-p-8
        un-rounded-xl
        un-border="2 neutral-200 dark:neutral-700"
        un-bg="neutral-50 dark:neutral-800"
        un-transition-all
        un-duration-300
        :class="`hover:border-${tool.color}-500 hover:bg-${tool.color}-50/10 dark:hover:bg-${tool.color}-900/10`"
      >
        <div
          un-flex="~ row"
          un-items-center
          un-gap-4
          un-mb-4
        >
          <div
            :class="`un-text-5xl un-${tool.color}-500`"
          >
            <component :is="`un-i-${tool.icon}`" />
          </div>
          <div
            un-text-2xl
            un-font-bold
          >
            {{ tool.title }}
          </div>
        </div>

        <div
          un-text="neutral-600 dark:neutral-400"
          un-mb-6
          un-leading-relaxed
        >
          {{ tool.description }}
        </div>

        <!-- Features -->
        <div
          un-flex="~ row wrap"
          un-gap-2
        >
          <span
            v-for="feature in tool.features"
            :key="feature"
            un-px-3
            un-py-1
            un-rounded-full
            un-bg="neutral-200 dark:neutral-700"
            un-text="sm neutral-600 dark:neutral-300"
          >
            {{ feature }}
          </span>
        </div>

        <!-- Arrow indicator -->
        <div
          un-mt-6
          un-flex="~ row"
          un-items-center
          un-gap-2
          :class="`un-text-${tool.color}-500`"
        >
          <span un-font-medium>Get Started</span>
          <un-i-ph-arrow-right-duotone un-text-xl />
        </div>
      </NuxtLink>
    </div>

    <!-- Back to Home -->
    <div
      un-text-center
    >
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
</template>
