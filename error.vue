<script setup lang="ts">
import type { NuxtError } from '#app'

// Page affichée par Nuxt pour toute erreur, dont les URL inconnues (404).
// app.vue n'est pas rendu ici : ni curseur personnalisé, ni préférence de langue
// chargée. Le texte est donc bilingue d'emblée, et les couleurs sont posées
// localement plutôt que lues dans les variables d'app.vue.
const props = defineProps<{ error: NuxtError }>()

const is404 = computed(() => props.error?.statusCode === 404)

useHead({
    title: is404.value ? 'Page introuvable' : 'Erreur',
    meta: [{ name: 'robots', content: 'noindex' }],
})

const goHome = () => clearError({ redirect: '/' })
</script>

<template>
    <main class="error-page">
        <div class="error-card">
            <p class="error-code">{{ error?.statusCode || 500 }}</p>
            <h1 class="error-title">
                {{ is404 ? 'Page introuvable' : 'Une erreur est survenue' }}
                <span lang="en">{{ is404 ? 'Page not found' : 'Something went wrong' }}</span>
            </h1>
            <p class="error-text">
                {{
                    is404
                        ? "Cette adresse ne mène nulle part. Le portfolio, lui, est à l'accueil."
                        : "La page n'a pas pu s'afficher. Réessayez depuis l'accueil."
                }}
            </p>
            <button type="button" class="error-home" @click="goHome">
                Retour à l'accueil <span lang="en">· Back home</span>
            </button>
        </div>
    </main>
</template>

<style scoped>
.error-page {
    min-height: 100dvh;
    display: grid;
    place-items: center;
    padding: 2rem 1rem;
    background: linear-gradient(135deg, #fefcf8 0%, #f5f0e8 100%);
    color: #2a2826;
    font-family: 'DM Sans', system-ui, Arial, sans-serif;
}

.error-card {
    width: min(520px, 100%);
    text-align: center;
}

.error-code {
    font-family: 'Space Mono', 'Courier New', monospace;
    font-size: 0.8125rem;
    letter-spacing: 0.2em;
    color: #6e5747;
    margin: 0 0 1rem;
}

.error-title {
    font-family: 'Playfair Display', Georgia, 'Times New Roman', serif;
    font-size: clamp(2rem, 6vw, 3rem);
    line-height: 1.15;
    margin: 0 0 1rem;
}

.error-title span {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.45em;
    font-weight: 400;
    color: #6b6560;
}

.error-text {
    font-size: 1.0625rem;
    line-height: 1.7;
    color: #6b6560;
    margin: 0 0 2rem;
}

.error-home {
    font-family: inherit;
    font-size: 1rem;
    padding: 0.85rem 1.75rem;
    border-radius: 999px;
    border: 2px solid #8b6f5c;
    background: #8b6f5c;
    color: #fefcf8;
    cursor: pointer;
    transition: background 0.2s ease;
}

.error-home:hover {
    background: #6e5747;
    border-color: #6e5747;
}

.error-home span {
    opacity: 0.8;
}
</style>
