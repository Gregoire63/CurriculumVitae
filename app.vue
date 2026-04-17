<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { usePortfolioStore } from './stores/portfolio'

const store = usePortfolioStore()

// ────────────────────────────────────────────────────────────
// Favicon selon le thème système
// ────────────────────────────────────────────────────────────
const updateFavicon = (isDark: boolean) => {
    const favicon = document.querySelector('link[rel="icon"]')
    if (favicon) {
        favicon.setAttribute('href', isDark ? '/favicon.ico' : '/favicon-w.ico')
    }
}

const handleDarkMode = (e: MediaQueryListEvent | MediaQueryList) => {
    updateFavicon(e.matches)
}

let darkModeQuery: MediaQueryList | null = null

// ────────────────────────────────────────────────────────────
// Attribut lang dynamique (FR / EN) — important pour SEO
// ────────────────────────────────────────────────────────────
useHead({
    htmlAttrs: {
        // Réactif sur la langue du store
        lang: computed(() => (store.isFrench ? 'fr' : 'en')),
    },
})

// ────────────────────────────────────────────────────────────
// Cycle de vie
// ────────────────────────────────────────────────────────────
onMounted(() => {
    // Langue sauvegardée
    const savedLang = localStorage.getItem('portfolio-lang') || 'fr'
    store.setLanguage(savedLang as 'en' | 'fr')

    // Favicon selon thème
    darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
    handleDarkMode(darkModeQuery)
    darkModeQuery.addEventListener('change', handleDarkMode)

})

onUnmounted(() => {
    if (darkModeQuery) {
        darkModeQuery.removeEventListener('change', handleDarkMode)
    }
})
</script>

<template>
    <div class="app-container">
        <CustomCursor />
        <NuxtPage />
    </div>
</template>

<style>
:root {
    /* Palette de couleurs modernisée */
    --bg-primary: #fefcf8;
    --bg-secondary: #f5f0e8;
    --bg-accent: #e8dfd0;

    --text-primary: #2a2826;
    --text-secondary: #6b6560;
    --text-muted: #9d9691;

    --accent-primary: #8b6f5c;
    --accent-secondary: #c9b299;
    --accent-tertiary: #e5dbc8;

    /* Spacing system */
    --space-xs: 0.5rem;
    --space-sm: 1rem;
    --space-md: 2rem;
    --space-lg: 4rem;
    --space-xl: 6rem;

    /* Typography */
    --font-display: 'Playfair Display', serif;
    --font-mono: 'Space Mono', monospace;
    --font-body: 'DM Sans', sans-serif;

    /* Animations */
    --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
    --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    cursor: none !important;
}

html {
    scroll-behavior: smooth;
    overflow-x: hidden;
}

body {
    font-family: var(--font-body);
    background: var(--bg-primary);
    color: var(--text-primary);
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.app-container {
    position: relative;
    min-height: 100dvh;
}

/* Scrollbar personnalisée */
::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

::-webkit-scrollbar-track {
    background: var(--bg-secondary);
}

::-webkit-scrollbar-thumb {
    background: var(--accent-secondary);
    border-radius: 4px;
    transition: background 0.3s var(--ease-smooth);
}

::-webkit-scrollbar-thumb:hover {
    background: var(--accent-primary);
}

/* Utility classes */
.no-scroll {
    overflow: hidden !important;
    height: 100dvh;
}

</style>
