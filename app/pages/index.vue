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
        un-rounded-xs
        un-border="1 neutral-200 dark:neutral-800"
        un-hover="border-neutral-500 translate-y-[-2px] shadow-lg"
        un-transition-all
      >
        <div
          un-flex="~ row"
          un-items-center
          un-gap-3
          un-mb-3
        >
          <un-i-solar-pallete-2-bold-duotone un-text="3xl sky-500" />
          <div
            un-text-2xl
            un-font="stylish bold"
          >
            Playground
          </div>
        </div>
        <div un-text="neutral-600 dark:neutral-400">
          Interactive LSWT analysis tools including <u>mutation</u> detection
          and <u>segmentation</u> visualization.
        </div>
      </NuxtLink>

      <!-- Documentation Card -->
      <NuxtLink
        to="/docs"
        un-block
        un-p-6
        un-rounded-xs
        un-border="1 neutral-200 dark:neutral-800"
        un-hover="border-neutral-500 translate-y-[-2px] shadow-lg"
        un-transition-all
      >
        <div
          un-flex="~ row"
          un-items-center
          un-gap-3
          un-mb-3
        >
          <un-i-solar-book-2-bold-duotone un-text="3xl sky-500" />
          <div
            un-text-xl
            un-font="script bold"
          >
            Documentation
          </div>
        </div>
        <div un-text="neutral-600 dark:neutral-400">
          The <u>methodology</u>, <u>algorithms</u>, and even my slides.
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
  </div>
</template>
