<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')
const { gtag } = useGtag()

// TODO(Grégoire) : remplacer par les liens directs App Store / Google Play de DishRank
const DISHRANK_APP_STORE_URL = 'https://dishrank.fr'
const DISHRANK_PLAY_STORE_URL = 'https://dishrank.fr'
const DISHRANK_WEB_URL = 'https://dishrank.fr'

interface CaseStudy {
    id: string
    status: string
    statusKind: 'live' | 'study'
    meta: string
    title: string
    tagline: string
    summary: string
    tech: string[]
    hasStoreBadges?: boolean
    screenshots?: Array<{ src: string; alt: string }>
}

const content = computed<{ label: string; title: string; description: string; cases: CaseStudy[] }>(() =>
    store.isFrench
        ? {
              label: 'Sélection',
              title: 'Réalisations',
              description: 'Des produits conçus, développés et mis en production en autonomie.',
              cases: [
                  {
                      id: 'dishrank',
                      status: 'En production',
                      statusKind: 'live',
                      meta: '2026 · Développé en solo',
                      title: 'DishRank',
                      tagline: 'Noter les plats, pas les restaurants',
                      summary:
                          'Application iOS, Android et web pour noter les plats et retrouver les meilleures assiettes autour de soi. Conçue, développée et publiée en autonomie, de la maquette à la mise en ligne, sur une base de code commune React Native / Next.js avec Supabase côté données.',
                      tech: ['React Native', 'Next.js', 'Supabase', 'TypeScript'],
                      hasStoreBadges: true,
                      screenshots: [
                          { src: '/projects/dishrank/home-sm.webp', alt: 'DishRank — écran d’accueil' },
                          { src: '/projects/dishrank/map-sm.webp', alt: 'DishRank — carte des plats' },
                          { src: '/projects/dishrank/profil-sm.webp', alt: 'DishRank — profil' },
                      ],
                  },
                  {
                      id: 'inbox',
                      status: 'En production',
                      statusKind: 'live',
                      meta: '2026 · Produit SaaS',
                      title: 'Messagerie omnicanale',
                      tagline: 'Une boîte de réception unique pour les tatoueurs',
                      summary:
                          "Une messagerie qui regroupe WhatsApp, Instagram, Messenger et email au même endroit, construite sur Chatwoot. Des brouillons de réponse sont proposés à l'artiste, qui garde la main : chaque message est relu et validé avant envoi. Utilisée en production par des tatoueurs.",
                      tech: ['Chatwoot', 'Node.js', 'PostgreSQL', 'API Claude'],
                  },
              ],
          }
        : {
              label: 'Selection',
              title: 'Selected work',
              description: 'Products designed, built and shipped to production on my own.',
              cases: [
                  {
                      id: 'dishrank',
                      status: 'Live in production',
                      statusKind: 'live',
                      meta: '2026 · Built solo',
                      title: 'DishRank',
                      tagline: 'Rate dishes, not restaurants',
                      summary:
                          'An iOS, Android and web app to rate dishes and find the best plates around you. Designed, built and published on my own, from mockup to release, on a shared React Native / Next.js codebase with Supabase for the data.',
                      tech: ['React Native', 'Next.js', 'Supabase', 'TypeScript'],
                      hasStoreBadges: true,
                      screenshots: [
                          { src: '/projects/dishrank/home-sm.webp', alt: 'DishRank — home screen' },
                          { src: '/projects/dishrank/map-sm.webp', alt: 'DishRank — dish map' },
                          { src: '/projects/dishrank/profil-sm.webp', alt: 'DishRank — profile' },
                      ],
                  },
                  {
                      id: 'inbox',
                      status: 'Live in production',
                      statusKind: 'live',
                      meta: '2026 · SaaS product',
                      title: 'Omnichannel messaging',
                      tagline: 'A single inbox for tattoo artists',
                      summary:
                          'A messaging tool that brings WhatsApp, Instagram, Messenger and email together in one place, built on Chatwoot. Draft replies are suggested to the artist, who stays in control: every message is reviewed and approved before it goes out. Used in production by tattoo artists.',
                      tech: ['Chatwoot', 'Node.js', 'PostgreSQL', 'Claude API'],
                  },
              ],
          },
)

const headerRef = ref<HTMLElement | null>(null)

// Configuration animations (côté client uniquement)
if (import.meta.client) {
    const { useMotion } = await import('@vueuse/motion')
    const fadeUp = {
        initial: prefersReducedMotion.value ? { opacity: 0 } : { opacity: 0, y: 40 },
        visibleOnce: prefersReducedMotion.value
            ? { opacity: 1 }
            : {
                  opacity: 1,
                  y: 0,
                  transition: {
                      type: 'spring',
                      stiffness: 80,
                      damping: 20,
                  },
              },
    }

    useMotion(headerRef, fadeUp)
}

const trackOutbound = (label: string) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'outbound_click', {
            event_category: 'case_study',
            event_label: label,
        })
    }
}
</script>

<template>
    <div class="cases-wrapper">
        <div class="cases-container">
            <!-- Section Header -->
            <div ref="headerRef" class="section-header">
                <span class="section-label">
                    <span class="label-line"></span>
                    {{ content.label }}
                </span>
                <h2 class="section-title">{{ content.title }}</h2>
                <p class="section-description">{{ content.description }}</p>
            </div>

            <!-- Case studies -->
            <article
                v-for="(cs, index) in content.cases"
                :key="cs.id"
                v-motion
                :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 }"
                :visibleOnce="
                    prefersReducedMotion
                        ? { opacity: 1 }
                        : {
                              opacity: 1,
                              y: 0,
                              transition: { type: 'spring', stiffness: 80, damping: 20, delay: 0.15 + index * 0.1 },
                          }
                "
                class="case-study"
            >
                <!-- Meta column -->
                <div class="case-meta">
                    <div class="case-badges">
                        <span class="case-status" :class="cs.statusKind">{{ cs.status }}</span>
                        <span class="case-date">{{ cs.meta }}</span>
                    </div>
                    <h3 class="case-title">{{ cs.title }}</h3>
                    <p class="case-tagline">{{ cs.tagline }}</p>
                    <div class="case-tech">
                        <span v-for="tech in cs.tech" :key="tech" class="tech-tag">{{ tech }}</span>
                    </div>
                </div>

                <!-- Narrative column -->
                <div class="case-body">
                    <div class="case-block">
                        <p class="case-summary">{{ cs.summary }}</p>

                        <!-- Store badges (DishRank) -->
                        <div v-if="cs.hasStoreBadges" class="store-badges">
                            <a
                                :href="DISHRANK_APP_STORE_URL"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="store-badge"
                                @click="trackOutbound('dishrank_app_store')"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path
                                        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.702"
                                    />
                                </svg>
                                <span class="store-text">
                                    <small>{{ store.isFrench ? 'Télécharger dans' : 'Download on the' }}</small>
                                    <strong>{{ store.isFrench ? "l'App Store" : 'App Store' }}</strong>
                                </span>
                            </a>
                            <a
                                :href="DISHRANK_PLAY_STORE_URL"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="store-badge"
                                @click="trackOutbound('dishrank_play_store')"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path
                                        d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"
                                    />
                                </svg>
                                <span class="store-text">
                                    <small>{{ store.isFrench ? 'Disponible sur' : 'Get it on' }}</small>
                                    <strong>Google Play</strong>
                                </span>
                            </a>
                            <a
                                :href="DISHRANK_WEB_URL"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="web-link"
                                @click="trackOutbound('dishrank_web')"
                            >
                                dishrank.fr
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path
                                        d="M7 17L17 7M17 7H7M17 7V17"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </a>
                        </div>

                        <!-- Screenshots (DishRank) -->
                        <div v-if="cs.screenshots" class="case-shots">
                            <img
                                v-for="shot in cs.screenshots"
                                :key="shot.src"
                                :src="shot.src"
                                :alt="shot.alt"
                                width="440"
                                height="921"
                                loading="lazy"
                                class="case-shot"
                            />
                        </div>
                    </div>
                </div>
            </article>
        </div>
    </div>
</template>

<style scoped>
.cases-wrapper {
    position: relative;
    width: 100%;
    padding: var(--space-xl) var(--space-lg);
    z-index: 1;
}

.cases-container {
    max-width: 1200px;
    margin: 0 auto;
}

/* Section Header */
.section-header {
    text-align: center;
    margin-bottom: var(--space-xl);
}

.section-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--accent-primary);
    margin-bottom: var(--space-sm);
}

.label-line {
    width: 30px;
    height: 2px;
    background: var(--accent-primary);
}

.section-title {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--space-md);
}

.section-description {
    font-size: 1.125rem;
    line-height: 1.8;
    color: var(--text-secondary);
    max-width: 700px;
    margin: 0 auto;
}

/* Case study card */
.case-study {
    display: grid;
    /* minmax(0, 1fr) : empêche le min-content des enfants (bande de screenshots) d'élargir la grille */
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-md);
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 24px;
    padding: var(--space-md);
    margin-bottom: var(--space-lg);
}

.case-meta,
.case-body {
    min-width: 0;
}

.case-study:last-child {
    margin-bottom: 0;
}

/* Meta column */
.case-badges {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
}

.case-status {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.3rem 0.7rem;
    border-radius: 20px;
}

.case-status.live {
    color: #166534;
    background: #dcfce7;
    border: 1px solid #86efac;
}

.case-status.study {
    color: #854d0e;
    background: #fef9c3;
    border: 1px solid #fde047;
}

.case-date {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-secondary);
}

.case-title {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 var(--space-xs) 0;
}

.case-tagline {
    font-size: 1.0625rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin-bottom: var(--space-sm);
}

.case-tech {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
}

.tech-tag {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: var(--space-xs) var(--space-sm);
    background: var(--bg-accent);
    color: var(--accent-strong);
    border-radius: 20px;
}

/* Narrative column */
.case-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.case-summary {
    font-size: 1rem;
    line-height: 1.8;
    color: var(--text-secondary);
    margin: 0;
}

/* Store badges */
.store-badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
}

.store-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    background: var(--text-primary);
    color: var(--bg-primary);
    border-radius: 12px;
    padding: 0.5rem 0.9rem;
    text-decoration: none;
    transition:
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.3s ease;
}

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
    .store-badge:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(42, 40, 38, 0.3);
    }
}

.store-badge svg {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
}

.store-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}

.store-text small {
    font-size: 0.625rem;
    opacity: 0.8;
}

.store-text strong {
    font-family: var(--font-body);
    font-size: 0.9375rem;
}

.web-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    min-height: 44px;
    padding: 0 var(--space-xs);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--accent-primary);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    transition: color 0.3s ease;
}

@media (pointer: fine) {
    .web-link:hover {
        color: var(--text-primary);
    }
}

/* Screenshots */
.case-shots {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: var(--space-xs);
}

.case-shot {
    width: 140px;
    flex-shrink: 0;
    border-radius: 16px;
    border: 1px solid var(--bg-accent);
}

/* Desktop layout */
@media (min-width: 1024px) {
    .case-study {
        grid-template-columns: 320px minmax(0, 1fr);
        gap: var(--space-lg);
        padding: var(--space-lg);
    }

    .case-shot {
        width: 180px;
    }
}

/* Mobile */
@media (max-width: 768px) {
    .cases-wrapper {
        padding: var(--space-lg) var(--space-md);
    }

    .section-header {
        margin-bottom: var(--space-md);
    }

    .case-study {
        margin-bottom: var(--space-md);
    }

    .case-title {
        font-size: 1.5rem;
    }
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
</style>
