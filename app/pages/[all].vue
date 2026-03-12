<script setup lang="ts">
const router = useRouter()
</script>

<template>
  <main
    un-p="x4 y10"
    un-text="center teal-700 dark:gray-200"
  >
    <div un-text-4xl>
      <div
        un-i-carbon-warning
        un-inline-block
      />
    </div>
    <div>Not found</div>
    <div>
      <button
        un-btn
        text-sm
        m="3 t8"
        @click="router.back()"
      >
        Back
      </button>
    </div>
  </main>
</template>
