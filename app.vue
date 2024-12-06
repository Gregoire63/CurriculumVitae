<script setup>
import { SiteStore } from './stores/Site.js'
import { onMounted, onUnmounted, ref } from 'vue'
import fav from './public/favicon-w.ico'
import fav_dark from './public/favicon.ico'
import LoadingIndicator from './components/LoadingIndicator.vue'
import HomeView from './views/HomeView.vue'

function handleDarkmode(e) {
  var darkModeOn = e.matches
  var largeFavicon = document.querySelector('link[rel="icon"]')
  if (!largeFavicon) return
  largeFavicon.href = darkModeOn ? fav : fav_dark
}

const scrollEvent = () => {
  SiteStore().setScrollY(window.scrollY)
}
let darkModeMediaQuery
onMounted(() => {
  if(import.meta.client)
    SiteStore().setLangage(localStorage?.getItem('langage'))
  window.scrollTo({ top: 0 })
  document.addEventListener('scroll', scrollEvent)
  darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  if(darkModeMediaQuery){
    handleDarkmode(darkModeMediaQuery)
    darkModeMediaQuery.addEventListener('change', handleDarkmode)
  }
})
onUnmounted(() => {
  document.removeEventListener('scroll', scrollEvent)
  darkModeMediaQuery.removeEventListener('change', handleDarkmode)
})
</script>

<template>
  <NuxtLayout>
    <LoadingIndicator/>
    <HomeView />
  </NuxtLayout>
</template>
<style>
:root {
  --background-color: #fff9f9;
  --primary: #7d6167;
  --secondary: #e5dbd1;
  --secondary_1: #f9ead7;
  --gray: #f3f3f3;
  --text: #8e9092;
}
.no-scroll {
  overflow: hidden !important;
}
main {
  width: 100%;
  min-height: 400vh;
  background-color: var(--gray);
}
::-webkit-scrollbar {
  width: 10px !important;
  height: 8px !important;
}

::-webkit-scrollbar-track {
  background-color: #f1f1f1;
}

::-webkit-scrollbar-thumb {
  background-color: #888;
  border-radius: 5px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: #555;
}
</style>
