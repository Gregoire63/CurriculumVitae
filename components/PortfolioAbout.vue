<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')

interface Degree {
    year: string
    title: string
    school: string
    url: string
    type?: 'certification' | 'degree'
}

// computed (et non ref) pour que les titres se retraduisent au changement de langue
const degrees = computed<Degree[]>(() => [
    {
        year: '2024',
        title: 'Vue.js Certified Developer',
        school: 'Vue.js Official Certification',
        url: 'https://certificates.dev/vuejs',
        type: 'certification',
    },
    {
        year: '2021 - 2023',
        title: store.isFrench ? "Mastère - Expert en Système d'Information" : 'Master - Information System Expert',
        school: 'ISITECH - Lyon',
        url: 'https://www.ecole-isitech.com/',
        type: 'degree',
    },
    {
        year: '2020 - 2021',
        title: store.isFrench ? 'Bachelor - Responsable de Projet Informatique' : 'Bachelor - IT Project Manager',
        school: 'ISITECH - Lyon',
        url: 'https://www.ecole-isitech.com/',
        type: 'degree',
    },
    {
        year: '2017 - 2020',
        title: store.isFrench ? 'Licence Informatique' : 'Computer Science Degree',
        school: 'Université Clermont Auvergne',
        url: 'https://www.uca.fr/',
        type: 'degree',
    },
])

const headerRef = ref<HTMLElement | null>(null)

// Animations (côté client uniquement)
if (import.meta.client) {
    const { useMotion } = await import('@vueuse/motion')
    const fadeUp = {
        initial: prefersReducedMotion.value ? { opacity: 0 } : { opacity: 0, y: 30 },
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
</script>

<template>
    <div class="about-wrapper">
        <div class="about-container">
            <!-- Section Header (compact) -->
            <div ref="headerRef" class="section-header">
                <span class="section-label">
                    <span class="label-line"></span>
                    {{ store.isFrench ? 'Formation' : 'Education' }}
                </span>
                <h2 class="section-title">
                    {{ store.isFrench ? 'Diplômes & certification' : 'Degrees & certification' }}
                </h2>
            </div>

            <!-- Compact degrees list -->
            <div class="degrees-grid">
                <a
                    v-for="(degree, index) in degrees"
                    :key="index"
                    v-motion
                    :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 16 }"
                    :visibleOnce="
                        prefersReducedMotion
                            ? { opacity: 1 }
                            : {
                                  opacity: 1,
                                  y: 0,
                                  transition: { type: 'spring', stiffness: 100, damping: 22, delay: 0.1 + index * 0.08 },
                              }
                    "
                    :href="degree.url"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="degree-card"
                    :class="{ cert: degree.type === 'certification' }"
                >
                    <div class="degree-top">
                        <span class="degree-year">{{ degree.year }}</span>
                        <span v-if="degree.type === 'certification'" class="degree-badge">
                            {{ store.isFrench ? 'Certifié' : 'Certified' }}
                        </span>
                    </div>
                    <h3 class="degree-title">{{ degree.title }}</h3>
                    <span class="degree-school">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                            <path d="M22 10v6M2 10l10-5 10 5-10 5z" stroke-linecap="round" stroke-linejoin="round" />
                            <path d="M6 12v5c0 1 2.5 2.5 6 2.5s6-1.5 6-2.5v-5" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                        {{ degree.school }}
                    </span>
                </a>
            </div>
        </div>
    </div>
</template>

<style scoped>
.about-wrapper {
    position: relative;
    width: 100%;
    padding: var(--space-lg) var(--space-lg);
    z-index: 1;
}

.about-container {
    max-width: 1000px;
    margin: 0 auto;
}

/* Section Header (compact) */
.section-header {
    text-align: center;
    margin-bottom: var(--space-lg);
}

.section-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    font-family: var(--font-mono);
    font-size: 0.8125rem;
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
    font-size: clamp(1.6rem, 3.5vw, 2.25rem);
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
}

/* Compact grid */
.degrees-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
    gap: var(--space-sm);
}

.degree-card {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 14px;
    padding: var(--space-sm) var(--space-md);
    text-decoration: none;
    transition:
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        border-color 0.3s ease,
        box-shadow 0.3s ease;
}

.degree-card.cert {
    border-color: var(--accent-secondary);
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
    .degree-card:hover {
        transform: translateY(-4px);
        border-color: var(--accent-primary);
        box-shadow: 0 12px 30px rgba(139, 111, 92, 0.14);
    }
}

.degree-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-xs);
}

.degree-year {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.degree-badge {
    font-family: var(--font-mono);
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--accent-strong);
    background: var(--accent-tertiary);
    border-radius: 100px;
    padding: 0.15rem 0.55rem;
}

.degree-title {
    font-family: var(--font-display);
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.35;
    margin: 0;
}

.degree-school {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.85rem;
    color: var(--text-secondary);
}

.degree-school svg {
    width: 15px;
    height: 15px;
    flex-shrink: 0;
    color: var(--accent-primary);
    opacity: 0.75;
}

/* Responsive */
@media (max-width: 768px) {
    .about-wrapper {
        padding: var(--space-lg) var(--space-md);
    }
    .section-header {
        margin-bottom: var(--space-md);
    }
    .degrees-grid {
        grid-template-columns: 1fr;
        gap: var(--space-xs);
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
