<script setup lang="ts">
import { appName } from '~/constants'

useHead({
  title: appName,
})
</script>

<template>
  <NuxtLayout
    un-text="neutral-700 dark:neutral-300"
    un-bg="neutral-100 dark:neutral-900"
    un-font-serif
  >
    <NuxtPage />
  </NuxtLayout>
</template>

<style>
@import url('https://fontsapi.zeoseven.com/232/tc/result.css');
/* @font-face { */
/*   font-family: 'YshiPenShutiTC'; */
/*   src: url('~/assets/fonts/YshiPenShutiTC-Regular.ttf'); */
/* } */

/* @font-face { */
/*   font-family: 'QiushuiShotaiTC'; */
/*   src: url('~/assets/fonts/QiushuiShotai.ttf'); */
/* } */
@font-face {
  font-family: 'LXGW Bright Code TC';
  src: url('assets/fonts/LXGWBrightCodeTC-ExtraLight.ttf');
}
@font-face {
  font-family: 'LXGW Neo ZhiSong Plus';
  src: url('assets/fonts/LXGWNeoZhiSongPlus.ttf');
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
