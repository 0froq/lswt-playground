<script setup lang="ts">
import SvgFroqLogo from '~/components/SvgFroqLogo.vue'
</script>

<template>
  <div
    un-m-2
    un-top-0
    un-z-100
    un-sticky
  >
    <a
      class="group"
      un-text="5xl neutral-600 dark:neutral-400"
      href="/"
    >
      <SvgFroqLogo :animated="true" />
    </a>
  </div>
</template>
