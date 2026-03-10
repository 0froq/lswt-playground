<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const route = useRoute()
const path = computed(() => {
  const slug = route.params.slug
  if (Array.isArray(slug))
    return `/docs/${slug.join('/')}`
  return '/docs'
})

const { data: doc } = await useAsyncData(path.value, () =>
  queryCollection('content').path(path.value).first(),
)

if (!doc.value) {
  throw createError({
    statusCode: 404,
    message: 'Page not found',
  })
}

useHead({
  title: doc.value?.title,
  meta: [
    { name: 'description', content: doc.value?.description },
  ],
})
</script>

<template>
  <div
    un-py-1
    un-max-w-800px
    un-mx-auto
  >
    <!-- Breadcrumb -->
    <div
      un-flex="~ row"
      un-items-center
      un-gap-2
      un-mb-6
      un-text="sm neutral-500"
    >
      <NuxtLink
        to="/"
        un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
      >
        Home
      </NuxtLink>
      <span>/</span>
      <NuxtLink
        to="/docs"
        un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
      >
        Docs
      </NuxtLink>
      <template v-if="$route.params.slug">
        <span>/</span>
        <span un-capitalize>{{ $route.params.slug?.[$route.params.slug.length - 1] }}</span>
      </template>
    </div>

    <!-- Document Content -->
    <article
      v-if="doc"
      un-prose
      un-max-w-none
    >
      <ContentRenderer :value="doc" />
    </article>

    <!-- Navigation Footer -->
    <div
      un-mt-12
      un-pt-6
      un-border-t="1 neutral-200 dark:neutral-700"
      un-flex="~ row"
      un-justify-between
    >
      <NuxtLink
        to="/playground"
        un-flex="~ row"
        un-items-center
        un-gap-2
        un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
      >
        <un-i-ph-arrow-left />
        <span>Go to Playground</span>
      </NuxtLink>
      <NuxtLink
        to="/"
        un-flex="~ row"
        un-items-center
        un-gap-2
        un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
      >
        <span>Back to Home</span>
        <un-i-ph-arrow-right />
      </NuxtLink>
    </div>
  </div>
</template>
