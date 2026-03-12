<script setup lang="ts">
import { appName } from '~/constants'
import '~/assets/css/style.css'

useHead({
  title: appName,
})
</script>

<template>
  <NuxtLayout
    un-text="neutral-700 dark:neutral-300"
    un-bg="neutral-50 dark:neutral-950"
    un-font-serif
    un-min-h-100vh
  >
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
@import url('https://fontsapi.zeoseven.com/232/tc/result.css');
@import url('https://fontsapi.zeoseven.com/994/main/result.css');
@import url('https://cdn.jsdelivr.net/gh/game1024/web-fonts@main/LXGWNeoZhiSong/result.css');

@font-face {
  font-family: 'LXGW Bright Code TC';
  src: url('fonts/LXGWBrightCodeTC-ExtraLight.ttf');
}
@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('fonts/LXGWNeoZhiSongPlus.ttf');
}

html,
body,
#__nuxt {
  height: 100vh;
  margin: 0;
  padding: 0;
}

html.dark {
  color-scheme: dark;
}
</style>
