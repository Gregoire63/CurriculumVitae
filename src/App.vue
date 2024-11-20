<script setup>
import NavBar from './components/navBar/NavBar.vue'
import HomeView from './views/HomeView.vue'
import { SiteStore } from './stores/Site.js'
import { onMounted, onUnmounted } from 'vue'
import fav from '/favicon-w.ico'
import fav_dark from '/favicon.ico'

var darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
handleDarkmode(darkModeMediaQuery)
function handleDarkmode(e) {
  var darkModeOn = e.matches // true if dark mode is enabled
  var largeFavicon = document.querySelector('link[rel="icon"]') // get favicon.ico element
  if (!largeFavicon) return
  largeFavicon.href = darkModeOn ? fav : fav_dark
}
darkModeMediaQuery.addEventListener('change', handleDarkmode)

const scrollEvent = () => {
  SiteStore().setScrollY(window.scrollY)
}

onMounted(() => {
  document.addEventListener('scroll', scrollEvent)
})
onUnmounted(() => {
  document.removeEventListener('scroll', scrollEvent)
})
</script>

<template>
  <main>
    <NavBar class="fade-in" />
    <HomeView />
  </main>
</template>
<style>
:root {
  --background-color: #fff9f9; /* Blanc par défaut */
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
</style>
