<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const { data: home } = await useAsyncData('index', () => queryCollection('content').path('/').first())
</script>

<template>
  <div
    un-py-1
    un-max-w-800px
    un-mx-auto
  >
    <!-- Hero Section -->
    <div
      un-text-3xl
      un-my-6
      un-font-bold
    >
      Lake Surface Water Temperature Playground
    </div>
    <div
      un-text="base neutral-500"
      un-mb-8
    >
      A comprehensive platform for analyzing lake surface water temperature (LSWT) data.
      Explore mutation detection algorithms, segmentation analysis, and visualization tools.
    </div>

    <!-- Quick Access Cards -->
    <div
      un-grid="~ cols-1 md:cols-2"
      un-gap-6
      un-mb-8
    >
      <!-- Playground Card -->
      <NuxtLink
        to="/playground"
        un-block
        un-p-6
        un-rounded-lg
        un-border="1 neutral-200 dark:neutral-700"
        un-bg="neutral-50 dark:neutral-800"
        un-hover="border-amber-500 bg-amber-50/10 dark:bg-amber-900/10"
        un-transition-all
      >
        <div
          un-flex="~ row"
          un-items-center
          un-gap-3
          un-mb-3
        >
          <un-i-ph-chart-line-up-duotone un-text="3xl amber-500" />
          <div
            un-text-xl
            un-font-semibold
          >
            Playground
          </div>
        </div>
        <div un-text="neutral-600 dark:neutral-400">
          Interactive LSWT analysis tools including mutation detection
          and segmentation visualization.
        </div>
      </NuxtLink>

      <!-- Documentation Card -->
      <NuxtLink
        to="/docs"
        un-block
        un-p-6
        un-rounded-lg
        un-border="1 neutral-200 dark:neutral-700"
        un-bg="neutral-50 dark:neutral-800"
        un-hover="border-teal-500 bg-teal-50/10 dark:bg-teal-900/10"
        un-transition-all
      >
        <div
          un-flex="~ row"
          un-items-center
          un-gap-3
          un-mb-3
        >
          <un-i-ph-book-open-duotone un-text="3xl teal-500" />
          <div
            un-text-xl
            un-font-semibold
          >
            Documentation
          </div>
        </div>
        <div un-text="neutral-600 dark:neutral-400">
          Learn about the methodology, algorithms, and how to use
          the analysis tools effectively.
        </div>
      </NuxtLink>
    </div>

    <!-- Content Section -->
    <div
      v-if="home"
      un-max-w-none
      un-mb-8
    >
      <ContentRenderer :value="home" />
    </div>

    <!-- Feature Highlights -->
    <div
      un-text-2xl
      un-mb-4
      un-font-semibold
    >
      Features
    </div>
    <div
      un-grid="~ cols-1 md:cols-3"
      un-gap-4
      un-mb-8
    >
      <div
        un-p-4
        un-rounded
        un-bg="neutral-50 dark:neutral-800"
      >
        <un-i-ph-graph
          un-text="2xl purple-500"
          un-mb-2
        />
        <div
          un-font-medium
          un-mb-1
        >
          Mutation Detection
        </div>
        <div un-text="sm neutral-500">
          Pettitt test, sequential t-test with OLS and Sen's slope
        </div>
      </div>
      <div
        un-p-4
        un-rounded
        un-bg="neutral-50 dark:neutral-800"
      >
        <un-i-ph-scissors
          un-text="2xl rose-500"
          un-mb-2
        />
        <div
          un-font-medium
          un-mb-1
        >
          Segmentation
        </div>
        <div un-text="sm neutral-500">
          Custom break years and statistical comparison
        </div>
      </div>
      <div
        un-p-4
        un-rounded
        un-bg="neutral-50 dark:neutral-800"
      >
        <un-i-ph-presentation-chart
          un-text="2xl blue-500"
          un-mb-2
        />
        <div
          un-font-medium
          un-mb-1
        >
          Visualization
        </div>
        <div un-text="sm neutral-500">
          Interactive Plotly charts with dark mode support
        </div>
      </div>
    </div>

    <!-- GitHub Link -->
    <div
      un-flex="~ row"
      un-items-center
      un-justify-center
      un-gap-2
      un-pt-4
      un-border-t="1 neutral-200 dark:neutral-700"
    >
      <un-i-ph-github-logo-duotone />
      <a
        href="https://github.com/"
        un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
        un-transition-colors
      >
        View on GitHub
      </a>
    </div>
  </div>
</template>
