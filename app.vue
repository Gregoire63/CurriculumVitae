<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { usePortfolioStore } from './stores/portfolio'

const store = usePortfolioStore()
const isReady = ref(false)

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

    isReady.value = true
})

onUnmounted(() => {
    if (darkModeQuery) {
        darkModeQuery.removeEventListener('change', handleDarkMode)
    }
})
</script>

<template>
    <div class="app-container">
        <!-- Loading screen — pré-rendu par SSG, disparaît après hydratation -->
        <Transition name="loader-fade">
            <div v-if="!isReady" class="app-loader">
                <svg viewBox="0 0 240 219" xmlns="http://www.w3.org/2000/svg" class="loader-logo" aria-label="GR">
                    <g transform="translate(0, 219) scale(0.1, -0.1)">
                        <path d="M5 2178 c-3 -7 -4 -497 -3 -1088 l3 -1075 79 -3 79 -3 625 623 c344 343 668 667 721 721 l95 98 -54 54 -54 55 -438 0 -439 0 3 -147 3 -148 173 -3 c129 -2 172 -6 172 -15 0 -12 -632 -638 -651 -645 -5 -2 -8 261 -7 635 l3 638 418 1 c230 1 421 4 424 8 4 4 -60 74 -142 156 l-150 150 -428 0 c-333 0 -429 -3 -432 -12z"/>
                        <path d="M1330 2183 c0 -5 162 -170 361 -369 316 -316 360 -364 351 -380 -6 -11 -324 -331 -706 -713 -383 -381 -693 -697 -690 -702 3 -5 93 -9 200 -9 188 1 195 2 221 24 16 13 138 135 273 271 135 135 253 251 264 257 16 9 56 -27 300 -271 l282 -282 99 3 100 3 3 110 2 110 -275 275 c-151 151 -275 280 -275 285 0 6 124 134 275 285 l275 274 0 96 0 95 -323 323 -322 322 -208 0 c-114 0 -207 -3 -207 -7z"/>
                    </g>
                </svg>
            </div>
        </Transition>

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

/* ── Loading screen ── */
.app-loader {
    position: fixed;
    inset: 0;
    z-index: 99999;
    background:
        linear-gradient(var(--bg-accent) 1px, transparent 1px),
        linear-gradient(90deg, var(--bg-accent) 1px, transparent 1px),
        linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
    background-size: 50px 50px, 50px 50px, 100% 100%;
    display: flex;
    align-items: center;
    justify-content: center;
}

.loader-logo {
    width: 100px;
    height: 90px;
    fill: var(--accent-primary);
    animation: loader-appear 0.6s var(--ease-out) both,
               loader-pulse 1.8s ease-in-out 0.6s infinite;
}

@keyframes loader-appear {
    0% {
        opacity: 0;
        transform: scale(0.4);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
}

@keyframes loader-pulse {
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.08);
        opacity: 0.8;
    }
}

@media (prefers-reduced-motion: reduce) {
    .loader-logo {
        animation: none;
        opacity: 1;
    }
}

.loader-fade-leave-active {
    transition: opacity 0.4s ease-out;
}
.loader-fade-leave-to {
    opacity: 0;
}
</style>
