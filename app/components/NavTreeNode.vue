<script setup lang="ts">
import { computed, ref, watch } from 'vue'

interface NavItem {
  label: string
  url: string
  children?: NavItem[]
}

interface Props {
  item: NavItem
  depth: number
  isExactCurrent: (url: string) => boolean
  isActiveParent: (url: string) => boolean
}

const props = defineProps<Props>()

const hasChildren = computed(() =>
  props.item.children && props.item.children.length > 0,
)

// Check if this item is the exact current route
const isCurrent = computed(() => props.isExactCurrent(props.item.url))

// Check if this item is an ancestor of current route
const isActive = computed(() => props.isActiveParent(props.item.url))

// Auto expand if active or has active child
const isExpanded = ref(isActive.value)

// Watch for route changes to update expansion
watch(() => props.isActiveParent(props.item.url), (active) => {
  if (active)
    isExpanded.value = true
}, { immediate: true })

function toggle() {
  if (hasChildren.value) {
    isExpanded.value = !isExpanded.value
  }
}

// Transition hooks for children animation
function beforeEnter(el: Element) {
  const element = el as HTMLElement
  element.style.maxHeight = '0px'
  element.style.opacity = '0'
  element.style.overflow = 'hidden'
}

function enter(el: Element) {
  const element = el as HTMLElement
  requestAnimationFrame(() => {
    element.style.transition = 'max-height 200ms ease-out, opacity 200ms ease-out'
    element.style.maxHeight = `${element.scrollHeight}px`
    element.style.opacity = '1'
  })
}

function afterEnter(el: Element) {
  const element = el as HTMLElement
  element.style.maxHeight = ''
  element.style.opacity = ''
  element.style.overflow = ''
}

function beforeLeave(el: Element) {
  const element = el as HTMLElement
  element.style.maxHeight = `${element.scrollHeight}px`
  element.style.opacity = '1'
  element.style.overflow = 'hidden'
}

function leave(el: Element) {
  const element = el as HTMLElement
  requestAnimationFrame(() => {
    element.style.transition = 'max-height 150ms ease-in, opacity 150ms ease-in'
    element.style.maxHeight = '0px'
    element.style.opacity = '0'
  })
}

function afterLeave(el: Element) {
  const element = el as HTMLElement
  element.style.maxHeight = ''
  element.style.opacity = ''
  element.style.overflow = ''
}

// Get text color based on state
const textClass = computed(() => {
  if (isCurrent.value) {
    return 'text-sky-600 dark:text-sky-400'
  }
  if (isActive.value) {
    return 'text-neutral-700 dark:text-neutral-500 font-thin'
  }
  return 'text-neutral-600 dark:text-neutral-400'
})

const indentStyle = computed(() => ({
  paddingLeft: `${props.depth}em`,
}))
</script>

<template>
  <div
    :style="indentStyle"
    un-mb-1
  >
    <!-- Item Row -->
    <div
      un-flex="~ row"
      un-items-center
      un-gap-1
      un-py-1
      un-w-full
    >
      <!-- Indent indicator -->
      <span
        v-if="depth > 0"
        un-text="neutral-500"
      >
        ../
      </span>

      <!-- Link -->
      <LinkUnderline
        :href="item.url"
        :text="item.label"
        :vanilla="true"
        un-text-sm
        un-underline="~ px neutral-400 dark:neutral-600 hover:sky-500"
        :class="textClass"
      />

      <!-- Toggle /.. -->
      <template v-if="hasChildren">
        <span un-text="neutral-500">/</span>
        <span
          un-text="neutral-500 hover:neutral-950 dark:hover:neutral-50"
          un-cursor-pointer
          un-transition
          :aria-expanded="isExpanded"
          :aria-label="isExpanded ? '折叠' : '展开'"
          @click="toggle"
        >
          <span>..</span>
        </span>
      </template>
    </div>

    <!-- Children -->
    <Transition
      @before-enter="beforeEnter"
      @enter="enter"
      @after-enter="afterEnter"
      @before-leave="beforeLeave"
      @leave="leave"
      @after-leave="afterLeave"
    >
      <div
        v-if="hasChildren && isExpanded"
        un-ml-0
        un-mt-1
        un-space-y-1
        un-overflow-hidden
      >
        <NavTreeNode
          v-for="child in item.children"
          :key="child.url"
          :item="child"
          :depth="depth + 1"
          :is-exact-current="isExactCurrent"
          :is-active-parent="isActiveParent"
        />
      </div>
    </Transition>
  </div>
</template>
