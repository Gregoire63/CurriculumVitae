<script setup lang="ts">
import { onMounted } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

/**
 * Consentement à la mesure d'audience (Google Analytics).
 *
 * La CNIL ne range pas Google Analytics parmi les traceurs exemptés : il ne doit
 * se charger qu'après un accord explicite. Le choix (accord comme refus) est
 * gardé 6 mois, puis redemandé. « Refuser » est aussi visible et aussi facile
 * que « Accepter ». Le lien « Gestion des cookies » du pied de page rouvre ce
 * bandeau pour changer d'avis.
 */
const CONSENT_KEY = 'portfolio-consent'
const CONSENT_MAX_AGE_MS = 182 * 24 * 60 * 60 * 1000

interface StoredConsent {
    analytics: boolean
    date: string
}

const store = usePortfolioStore()
const nuxtApp = useNuxtApp()
const { initialize, disableAnalytics } = useGtag()

const readConsent = (): StoredConsent | null => {
    try {
        const raw = localStorage.getItem(CONSENT_KEY)
        if (!raw) return null
        const parsed = JSON.parse(raw) as StoredConsent
        if (typeof parsed.analytics !== 'boolean' || !parsed.date) return null
        if (Date.now() - new Date(parsed.date).getTime() > CONSENT_MAX_AGE_MS) return null
        return parsed
    } catch {
        return null
    }
}

const writeConsent = (analytics: boolean) => {
    try {
        localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics, date: new Date().toISOString() }))
    } catch {
        // Stockage indisponible (navigation privée stricte) : le choix vaut pour cette visite
    }
}

// initialize() ajoute la balise <script> via useHead : il lui faut le contexte Nuxt,
// absent dans un rappel requestIdleCallback ou un gestionnaire de clic.
const startAnalytics = () => {
    const run = () => nuxtApp.runWithContext(() => initialize())
    if ('requestIdleCallback' in window) requestIdleCallback(run)
    else setTimeout(run, 2000)
}

// Retire les cookies _ga déjà posés quand le visiteur retire son accord
const clearAnalyticsCookies = () => {
    const host = window.location.hostname
    const domains = ['', host, `.${host.replace(/^www\./, '')}`]
    for (const cookie of document.cookie.split(';')) {
        const name = cookie.split('=')[0]?.trim()
        if (!name || !name.startsWith('_ga')) continue
        for (const domain of domains) {
            document.cookie = `${name}=; Max-Age=0; path=/${domain ? `; domain=${domain}` : ''}`
        }
    }
}

const accept = () => {
    writeConsent(true)
    store.setConsentOpen(false)
    startAnalytics()
}

const refuse = () => {
    const previous = readConsent()
    writeConsent(false)
    store.setConsentOpen(false)
    if (previous?.analytics) {
        disableAnalytics()
        clearAnalyticsCookies()
    }
}

const openPolicy = () => {
    store.setPrivacyPolicyOpen(true)
}

onMounted(() => {
    const consent = readConsent()
    if (consent === null) store.setConsentOpen(true)
    else if (consent.analytics) startAnalytics()
})
</script>

<template>
    <Transition name="consent">
        <div
            v-if="store.isConsentOpen"
            class="consent"
            role="region"
            :aria-label="store.isFrench ? 'Consentement à la mesure d’audience' : 'Analytics consent'"
        >
            <p class="consent-label">{{ store.isFrench ? "Mesure d'audience" : 'Analytics' }}</p>
            <p class="consent-text">
                {{
                    store.isFrench
                        ? "J'utilise Google Analytics pour savoir quelles pages sont lues. Rien n'est déposé sans votre accord."
                        : 'I use Google Analytics to see which pages get read. Nothing is stored without your consent.'
                }}
                <button type="button" class="consent-more" @click="openPolicy">
                    {{ store.isFrench ? 'En savoir plus' : 'Learn more' }}
                </button>
            </p>
            <div class="consent-actions">
                <button type="button" class="consent-button" @click="refuse">
                    {{ store.isFrench ? 'Refuser' : 'Decline' }}
                </button>
                <button type="button" class="consent-button primary" @click="accept">
                    {{ store.isFrench ? 'Accepter' : 'Accept' }}
                </button>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.consent {
    position: fixed;
    left: var(--space-md);
    bottom: var(--space-md);
    z-index: 900;
    width: min(380px, calc(100vw - 2 * var(--space-sm)));
    padding: var(--space-sm) var(--space-sm) var(--space-sm) calc(var(--space-sm) + 0.25rem);
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 16px;
    box-shadow: 0 18px 50px rgba(42, 40, 38, 0.16);
    font-family: var(--font-body);
}

.consent-label {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--accent-strong);
    margin-bottom: 0.35rem;
}

.consent-text {
    font-size: 0.875rem;
    line-height: 1.55;
    color: var(--text-secondary);
}

.consent-more {
    font: inherit;
    color: var(--accent-strong);
    background: none;
    border: none;
    padding: 0;
    text-decoration: underline;
    text-underline-offset: 2px;
    cursor: pointer;
}

.consent-actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xs);
    margin-top: 0.75rem;
}

/* Même taille, même poids pour les deux choix : refuser doit être aussi simple qu'accepter */
.consent-button {
    font-family: var(--font-body);
    font-size: 0.875rem;
    font-weight: 700;
    padding: 0.6rem 1rem;
    border-radius: 999px;
    border: 2px solid var(--accent-primary);
    background: transparent;
    color: var(--accent-strong);
    cursor: pointer;
    transition:
        background 0.2s var(--ease-smooth),
        color 0.2s var(--ease-smooth);
}

.consent-button.primary {
    background: var(--accent-primary);
    color: var(--bg-primary);
}

@media (hover: hover) and (pointer: fine) {
    .consent-button:hover {
        background: var(--accent-tertiary);
    }

    .consent-button.primary:hover {
        background: var(--accent-strong);
        border-color: var(--accent-strong);
    }
}

.consent-enter-active,
.consent-leave-active {
    transition:
        opacity 0.3s var(--ease-smooth),
        transform 0.3s var(--ease-smooth);
}

.consent-enter-from,
.consent-leave-to {
    opacity: 0;
    transform: translateY(12px);
}

@media (max-width: 600px) {
    .consent {
        left: var(--space-sm);
        right: var(--space-sm);
        bottom: var(--space-sm);
        width: auto;
    }
}

@media (prefers-reduced-motion: reduce) {
    .consent-enter-active,
    .consent-leave-active {
        transition: opacity 0.15s linear;
    }

    .consent-enter-from,
    .consent-leave-to {
        transform: none;
    }
}
</style>
