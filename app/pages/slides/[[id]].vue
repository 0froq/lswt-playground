<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()

// Read all slide files from content/slides/
const { data: slides } = await useAsyncData('slides', async () => {
  const collection = await queryCollection('content')
    .where('stem', 'LIKE', 'slides/%')
    .order('stem', 'DESC')
    .all()

  return collection.map((slide: any) => {
    const stem = slide.stem.replace('slides/', '')
    const match = stem.match(/gm-(\d{4})-(\d{2})-(\d{2})/)
    const date = match ? `${match[1]}-${match[2]}-${match[3]}` : stem
    const displayDate = match
      ? new Date(`${match[1]}-${match[2]}-${match[3]}`).toLocaleDateString('zh-CN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : stem

    return {
      ...slide,
      id: stem,
      date,
      displayDate,
      path: `/slides/${stem}`,
    }
  })
})

const currentIndex = computed(() => {
  const id = route.params.id
  if (!id || !slides.value)
    return -1
  return slides.value.findIndex((s: any) => s.id === id)
})

const currentSlide = computed(() => {
  if (currentIndex.value === -1 || !slides.value)
    return null
  return slides.value[currentIndex.value]
})

const prevSlide = computed(() => {
  if (!slides.value || currentIndex.value <= 0)
    return null
  return slides.value[currentIndex.value - 1]
})

const nextSlide = computed(() => {
  if (!slides.value || currentIndex.value >= slides.value.length - 1)
    return null
  return slides.value[currentIndex.value + 1]
})

useHead({
  title: currentSlide.value?.title || 'Group Meeting Slides',
})
</script>

<template>
  <div
    un-w-full
    un-h-full
  >
    <!-- Slide List (when no specific slide selected) -->
    <div
      v-if="!$route.params.id"
      un-py-1
      un-max-w-800px
      un-mx-auto
    >
      <div
        un-text-3xl
        un-my-6
        un-font-bold
      >
        Group Meeting Slides
      </div>
      <div
        un-text="neutral-500"
        un-mb-8
      >
        Research presentations and progress reports from group meetings.
      </div>

      <div
        un-flex="~ col"
        un-gap-4
      >
        <NuxtLink
          v-for="slide in slides"
          :key="slide.id"
          :to="slide.path"
          un-block
          un-p-6
          un-rounded-lg
          un-border="1 neutral-200 dark:neutral-700"
          un-bg="neutral-50 dark:neutral-800"
          un-hover="border-purple-500 bg-purple-50/10 dark:bg-purple-900/10"
          un-transition-all
        >
          <div
            un-flex="~ row"
            un-items-center
            un-gap-3
            un-mb-2
          >
            <un-i-ph-presentation-chart un-text="2xl purple-500" />
            <div>
              <div
                un-text-xl
                un-font-semibold
              >
                {{ slide.displayDate }}
              </div>
              <div
                v-if="slide.description"
                un-text="sm neutral-500"
                un-mt-1
              >
                {{ slide.description }}
              </div>
            </div>
          </div>
          <div
            v-if="slide.title"
            un-text="neutral-600 dark:neutral-400"
            un-mt-2
          >
            {{ slide.title }}
          </div>
        </NuxtLink>
      </div>
    </div>

    <!-- Individual Slide View -->
    <div
      v-else-if="currentSlide"
      un-w-full
      un-h="[calc(100vh-80px)]"
      un-flex="~ col"
    >
      <!-- Slide Header -->
      <div
        un-flex="~ row"
        un-justify-between
        un-items-center
        un-px-4
        un-py-3
        un-border-b="1 neutral-200 dark:neutral-700"
      >
        <div
          un-flex="~ row"
          un-items-center
          un-gap-3
        >
          <NuxtLink
            to="/slides"
            un-flex
            un-items-center
            un-justify-center
            un-w-8
            un-h-8
            un-rounded
            un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
            un-hover="bg-neutral-100 dark:bg-neutral-800"
          >
            <un-i-ph-arrow-left />
          </NuxtLink>
          <div>
            <div un-font-medium>
              {{ currentSlide.displayDate }}
            </div>
            <div
              v-if="currentSlide.title"
              un-text="sm neutral-500"
            >
              {{ currentSlide.title }}
            </div>
          </div>
        </div>
      </div>

      <!-- Slide Content Rendered with Nuxt Content -->
      <div
        un-flex-1
        un-overflow-auto
        un-p-8
      >
        <article
          v-if="currentSlide"
          un-max-w-none
        >
          <ContentRenderer :value="currentSlide" />
        </article>
      </div>

      <!-- Slide Navigation Footer -->
      <div
        un-px-4
        un-py-3
        un-border-t="1 neutral-200 dark:neutral-700"
        un-flex="~ row"
        un-justify-between
        un-items-center
      >
        <NuxtLink
          v-if="prevSlide"
          :to="prevSlide.path"
          un-flex="~ row"
          un-items-center
          un-gap-2
          un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
        >
          <un-i-ph-arrow-left />
          Previous
        </NuxtLink>
        <span v-else />

        <div un-text="sm neutral-500">
          {{ currentIndex + 1 }} / {{ slides?.length }}
        </div>

        <NuxtLink
          v-if="nextSlide"
          :to="nextSlide.path"
          un-flex="~ row"
          un-items-center
          un-gap-2
          un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
        >
          Next
          <un-i-ph-arrow-right />
        </NuxtLink>
        <span v-else />
      </div>
    </div>

    <!-- Not Found -->
    <div
      v-else
      un-py-1
      un-max-w-800px
      un-mx-auto
      un-text-center
    >
      <div
        un-text="6xl neutral-300"
        un-mb-4
      >
        📊
      </div>
      <div
        un-text-2xl
        un-font-bold
        un-mb-2
      >
        Slide Not Found
      </div>
      <div
        un-text="neutral-500"
        un-mb-6
      >
        The slide you're looking for doesn't exist.
      </div>
      <NuxtLink
        to="/slides"
        un-inline-flex
        un-items-center
        un-gap-2
        un-px-4
        un-py-2
        un-rounded
        un-bg="neutral-100 dark:neutral-800"
        un-text="neutral-700 dark:neutral-300"
      >
        <un-i-ph-arrow-left />
        Back to Slides
      </NuxtLink>
    </div>
  </div>
</template>
