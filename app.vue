<script setup>
import { SiteStore } from './stores/Site.js'
import { onMounted, onUnmounted } from 'vue'
import fav from './public/favicon-w.ico'
import fav_dark from './public/favicon.ico'

useHead({
  title: 'Grégoire Raturat - FullStack Developer',
  meta: [
    { charset: 'UTF-8' },
    { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
    { name: 'description', content: 'Portfolio de Grégoire Raturat, développeur FullStack passionné par l\'innovation et le travail en équipe.' },
    { name: 'keywords', content: 'Grégoire Raturat, gregoire, raturat, développeur, FullStack, portfolio, innovation, travail en équipe' },
    { name: 'author', content: 'Grégoire Raturat' },
    { property: 'og:title', content: 'Grégoire Raturat - FullStack Developer' },
    { property: 'og:description', content: 'Portfolio de Grégoire Raturat, développeur FullStack passionné par l\'innovation et le travail en équipe.' },
    { property: 'og:type', content: 'website' },
    { property: 'og:url', content: 'https://resume.gregoire-raturat.fr/' },
    { property: 'og:image', content: '/screen.webp' },
    { name: 'twitter:card', content: 'summary_large_image' },
    { name: 'twitter:title', content: 'Grégoire Raturat - FullStack Developer' },
    { name: 'twitter:description', content: 'Portfolio de Grégoire Raturat, développeur FullStack passionné par l\'innovation et le travail en équipe.' },
    { name: 'twitter:image', content: '/screen.webp' }
  ],
  link: [
    { rel: 'canonical', href: 'https://resume.gregoire-raturat.fr/' }
  ],
  script: [
    {
      src: 'https://www.googletagmanager.com/gtag/js?id=G-ZEHQTGC6EE',
      async: true,
      innerHTML: `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-ZEHQTGC6EE');
      `
    },
  ],
  noscript: [
    {
      innerHTML: `
        <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-JCR79FL8"
        height="0" width="0" style="display:none;visibility:hidden"></iframe>
      `
    },
    {
      innerHTML: 'Votre navigateur ne supporte pas JavaScript. Veuillez activer JavaScript pour une meilleure expérience.'
    }
  ]
})

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
      <NuxtPage />
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
