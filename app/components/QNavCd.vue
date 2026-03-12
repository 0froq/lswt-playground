<script setup lang="ts">
import { useElementHover, useToggle } from '@vueuse/core'
import { computed, onMounted, ref } from 'vue'

interface NavItem {
  label: string
  url: string
  children?: NavItem[]
}

const props = defineProps<{
  nav: NavItem[]
}>()

const route = useRoute()

// Refs for hover detection
const iconRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)

// VueUse composables
const isHoveredIcon = useElementHover(iconRef)
const isHoveredPanel = useElementHover(panelRef)
const [isPinned, togglePin] = useToggle(false)

const isPanelVisible = computed(() => {
  return isPinned.value || isHoveredIcon.value || isHoveredPanel.value
})

const panelOpacity = computed(() => {
  if (isPinned.value || isHoveredPanel.value)
    return 1
  if (isHoveredIcon.value)
    return 0.5
  return 0
})

// Calculate max width when all levels expanded
const calculatedWidth = ref(256)

function calculateMaxWidth(items: NavItem[], depth = 0): number {
  let maxWidth = 0

  for (const item of items) {
    // Estimate width: label length * char width + depth indent + padding + toggle
    const charWidth = 7.5 // approximate width per character
    const indentWidth = depth * 12 // 12px per depth level
    const toggleWidth = item.children ? 20 : 0 // space for "/.."
    const padding = 24 // p-3

    const itemWidth = (item.label.length * charWidth) + indentWidth + toggleWidth + padding + 16
    maxWidth = Math.max(maxWidth, itemWidth)

    // Recurse into children (as if all expanded)
    if (item.children && item.children.length > 0) {
      const childMaxWidth = calculateMaxWidth(item.children, depth + 1)
      maxWidth = Math.max(maxWidth, childMaxWidth)
    }
  }

  return maxWidth
}

onMounted(() => {
  // Calculate based on all items fully expanded
  const maxWidth = calculateMaxWidth(props.nav)
  calculatedWidth.value = Math.max(256, Math.min(480, maxWidth))
})

// Transition hooks for panel animation
function beforeEnter(el: Element) {
  const element = el as HTMLElement
  element.style.opacity = '0'
  element.style.transform = 'translateY(-8px) scale(0.95)'
}

function enter(el: Element) {
  const element = el as HTMLElement
  requestAnimationFrame(() => {
    element.style.transition = 'opacity 200ms ease-out, transform 200ms ease-out'
    element.style.opacity = String(panelOpacity.value)
    element.style.transform = 'translateY(0) scale(1)'
  })
}

function leave(el: Element) {
  const element = el as HTMLElement
  element.style.transition = 'opacity 150ms ease-in, transform 150ms ease-in'
  element.style.opacity = '0'
  element.style.transform = 'translateY(-8px) scale(0.95)'
}

/**
 * Check if URL is exactly the current route
 */
function isExactCurrent(url: string): boolean {
  if (url === '/') {
    return route.path === '/' || route.path === '/en/'
  }
  return route.path === url
}

/**
 * Check if URL is ancestor of current route (for expansion)
 */
function isActiveParent(url: string): boolean {
  if (url === '/')
    return false
  return route.path.startsWith(`${url}/`) || route.path === url
}
</script>

<template>
  <div
    un-relative
  >
    <!-- Icon Button -->
    <div
      ref="iconRef"
      un-m-1
      un-h-6
      un-w-6
      un-flex
      un-cursor-pointer
      un-items-center
      un-justify-center
      un-transition-colors
      un-duration-200
      un-relative
      :class="isPinned
        ? 'un-text-sky-600 dark:un-text-sky-400'
        : 'un-text-neutral-500 hover:un-text-neutral-700 dark:hover:un-text-neutral-300'"
      @click="togglePin()"
    >
      <un-i-ph-list-dashes-duotone
        un-transition-colors
        un-duration-200
        un-text="neutral-500 hover:neutral-700 dark:hover:neutral-300"
      />

      <span
        v-if="isPinned"
        un-absolute
        un--top-0.5
        un--right-0.5
        un-w-1.5
        un-h-1.5
        un-bg-emerald-500
        un-rounded-full
      />
    </div>

    <!-- Floating Panel -->
    <Transition
      @before-enter="beforeEnter"
      @enter="enter"
      @leave="leave"
    >
      <div
        v-show="isPanelVisible"
        ref="panelRef"
        :style="{ opacity: panelOpacity, width: `${calculatedWidth}px` }"
        un-absolute
        un-top-full
        un-right-0
        un-mt-2
        un-max-h-96
        un-overflow-y-auto
        un-rounded-xs
        un-bg="neutral-100 dark:neutral-900"
        un-shadow="lg"
        un-z-50
        un-p-3
        :class="isPinned
          ? 'border-(~ px emerald-600) dark:border-emerald-400'
          : 'border border-neutral-200 dark:border-neutral-800'"
      >
        <nav un-space-y-1>
          <NavTreeNode
            v-for="item in nav"
            :key="item.url"
            :item="item"
            :depth="0"
            :is-exact-current="isExactCurrent"
            :is-active-parent="isActiveParent"
          />
        </nav>
      </div>
    </Transition>
  </div>
</template>
