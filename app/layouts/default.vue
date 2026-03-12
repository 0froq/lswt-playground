<script setup lang="ts">
</script>

<template>
  <div
    un-flex="~ col"
    un-overflow-y-hidden
  >
    <header>
      <PageNav />
    </header>
    <main
      un-p="x-6 y-4"
      un-flex-1
      un-overflow-y-auto
    >
      <slot />
    </main>
    <footer>
      <PageFooter />
    </footer>
  </div>
</template>

<style>
main * {
  &::-webkit-scrollbar {
    width: 1px;
  }
}
</style>
