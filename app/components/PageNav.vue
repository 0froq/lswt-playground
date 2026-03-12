<script setup lang="ts">
import QNavCd from './QNavCd.vue'

const color = useColorMode()
useHead({
  meta: [{
    id: 'theme-color',
    name: 'theme-color',
    content: () => color.value === 'dark' ? '#222222' : '#ffffff',
  }],
})
function toggleDark() {
  color.preference = color.value === 'dark' ? 'light' : 'dark'
}

const navigationTree = [
  {
    label: 'Home',
    url: '/',
  },
  {
    label: 'Playground',
    url: '/playground',
    children: [
      { label: 'Mutation', url: '/playground/mutation' },
      { label: 'Segments', url: '/playground/segments' },
    ],
  },
  {
    label: 'Documentation',
    url: '/docs',
    children: [
      {
        label: 'Guide',
        url: '/docs/guide',
        children: [
          { label: 'Quick Start', url: '/docs/guide/quickstart' },
          { label: 'Advanced', url: '/docs/guide/advanced' },
        ],
      },
    ],
  },
  {
    label: 'Slides',
    url: '/slides',
  },
]
</script>

<template>
  <nav
    un-flex="~ row"
    un-justify-between
    un-p-4
    un-top-0
    un-z-100
  >
    <div
      un-flex="~ row"
      un-items-center
      un-gap-6
      un-text-xl
    >
      <NavLogo />
    </div>
    <div
      un-flex="~ row"
      un-items-center
      un-gap-6
      un-text-xl
    >
      <!-- Navigation Dropdown -->
      <QNavCd :nav="navigationTree" />

      <a
        un-m-1
        un-h-6
        un-w-6
        un-flex
        un-items-center
        un-justify-center
        un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
        un-transition-colors
        un-duration-200
        href="https://github.com/"
      >
        <un-i-ph-github-logo-duotone />
      </a>
      <div
        un-m-1
        un-h-6
        un-flex
        un-cursor-pointer
        un-items-center
        un-justify-center
        un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
        un-transition-colors
        un-duration-200
        @click="toggleDark()"
      >
        <ClientOnly>
          <template
            #placeholder
          >
            <un-i-ph-circle-dashed-duotone
              un-animate-spin
              un-animate-duration-2000
            />
          </template>
          <un-i-ph-moon-duotone v-if="color.value === 'dark'" />
          <un-i-ph-sun-duotone v-else />
        </ClientOnly>
      </div>
    </div>
  </nav>
</template>
