<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const prefersReducedMotion = usePreferredReducedMotion()

interface Degree {
    year: string
    title: string
    school: string
    url: string
    type?: 'certification' | 'degree'
}

const degrees = ref<Degree[]>([
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
        title: store.isFrench ? 'Licence - Licence Informatique' : 'Bachelor - Computer Science Degree',
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

const clickCard = (url: string) => () => window.open(url, '_blank')
</script>

<template>
    <div class="about-wrapper">
        <div class="about-container">
            <!-- Section Header -->
            <div ref="headerRef" class="section-header">
                <span class="section-label">
                    <span class="label-line"></span>
                    {{ store.isFrench ? 'Parcours' : 'Education' }}
                </span>
                <h2 class="section-title">
                    {{ store.isFrench ? 'Formation' : 'Academic Background' }}
                </h2>
                <p class="section-description">
                    {{
                        store.isFrench
                            ? "Un parcours académique solide qui m'a permis d'acquérir une expertise technique complète et une vision globale des systèmes d'information."
                            : 'A solid academic background that allowed me to gain comprehensive technical expertise and a global vision of information systems.'
                    }}
                </p>
            </div>

            <!-- Degrees Grid avec animations stagger -->
            <div class="degrees-grid">
                <div
                    v-for="(degree, index) in degrees"
                    :key="index"
                    v-motion
                    :initial="
                        prefersReducedMotion
                            ? { opacity: 0 }
                            : {
                                  opacity: 0,
                                  y: 30,
                                  scale: 0.95,
                              }
                    "
                    :visibleOnce="
                        prefersReducedMotion
                            ? { opacity: 1 }
                            : {
                                  opacity: 1,
                                  y: 0,
                                  scale: 1,
                                  transition: {
                                      type: 'spring',
                                      stiffness: 90,
                                      damping: 22,
                                      delay: 0.3 + index * 0.15,
                                  },
                              }
                    "
                    class="degree-card"
                    @click="clickCard(degree.url)"
                >
                    <div class="card-glow"></div>
                    <div class="card-content">
                        <div class="degree-year">{{ degree.year }}</div>
                        <h3 class="degree-title">{{ degree.title }}</h3>
                        <div class="degree-school">
                            <!-- DIPLOME -->
                            <svg
                                v-if="degree.type === 'degree'"
                                viewBox="0 0 32 32"
                                class="degree-icon"
                                aria-hidden="true"
                            >
                                <path
                                    d="M20,24c-2.8,0-5-2.2-5-5s2.2-5,5-5s5,2.2,5,5S22.8,24,20,24z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M29,5H3C2.4,5,2,5.4,2,6v20c0,0.6,0.4,1,1,1h11v-4.4c-0.6-1.1-1-2.3-1-3.6
                                        c0-3.9,3.1-7,7-7s7,3.1,7,7c0,1.3-0.4,2.5-1,3.6V27h3c0.6,0,1-0.4,1-1V6
                                        C30,5.4,29.6,5,29,5z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M20,26c-1.5,0-2.9-0.5-4-1.3V31c0,0.3,0.2,0.6,0.4,0.8
                                        c0.3,0.2,0.6,0.2,0.9,0.1l2.7-0.9l2.7,0.9c0.1,0,0.2,0.1,0.3,0.1
                                        c0.2,0,0.4-0.1,0.6-0.2c0.3-0.2,0.4-0.5,0.4-0.8v-6.3
                                        C22.9,25.5,21.5,26,20,26z"
                                    fill="currentColor"
                                />
                            </svg>

                            <!-- CERTIFICATION -->
                            <svg v-else viewBox="0 0 1920 1920" class="certification-icon" aria-hidden="true">
                                <path
                                    d="m960 15 266.667 241.92 359.893-13.867 48.747 356.907L1920 820.547l-192 304.64
                                        76.267 352.106-342.934 109.867-167.893 318.613L960 1769.56
                                        l-333.44 136.213-167.893-318.613-342.934-109.867L192 1125.187
                                        0 820.547 284.693 599.96l48.747-356.907 359.893 13.867L960 15Zm341.056 613.483
                                        64.533 85.013-561.6 426.24-255.04-255.04 75.414-75.413
                                        189.226 189.226 487.467-370.026Z"
                                    fill="currentColor"
                                    fill-rule="evenodd"
                                />
                            </svg>

                            {{ degree.school }}
                        </div>
                    </div>
                    <div class="card-corner"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.about-wrapper {
    position: relative;
    width: 100%;
    padding: var(--space-xl) var(--space-lg);
    z-index: 1;
}

.about-container {
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

/* Degrees Grid */
.degrees-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-lg);
}

.degree-card {
    position: relative;
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 20px;
    padding: var(--space-lg);
    cursor: pointer;
    overflow: hidden;
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        border-color 0.3s ease,
        box-shadow 0.3s ease;
}

@media (prefers-reduced-motion: no-preference) {
    .degree-card:hover {
        transform: translateY(-8px);
        border-color: var(--accent-secondary);
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
    }
}

.card-glow {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle at center, rgba(139, 111, 92, 0.15) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.6s cubic-bezier(0.4, 0, 0.6, 1);
    pointer-events: none;
}

@media (prefers-reduced-motion: no-preference) {
    .degree-card:hover .card-glow {
        opacity: 1;
    }
}

.card-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.degree-year {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
}

.degree-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    line-height: 1.4;
    margin: 0;
}

.degree-school {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 1rem;
    color: var(--text-secondary);
    margin-top: var(--space-xs);
}

.degree-school svg {
    flex-shrink: 0;
    opacity: 0.6;
}

.card-corner {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 60px;
    height: 60px;
    background: linear-gradient(135deg, transparent 50%, var(--accent-tertiary) 50%);
    opacity: 0.3;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.degree-icon {
    color: var(--accent-primary);
    opacity: 0.7;
    width: 20px;
}

.certification-icon {
    color: var(--accent-primary);
    opacity: 0.7;
    width: 20px;
}

.degree-card[data-type='certification'] {
    border-color: var(--accent-secondary);
}
.degree-icon {
    color: var(--accent-primary);
    opacity: 0.7;
}

.certification-icon {
    color: var(--accent-secondary);
}

.degree-card[data-type='certification'] {
    border-color: var(--accent-secondary);
}

@media (prefers-reduced-motion: no-preference) {
    .degree-card:hover .card-corner {
        width: 80px;
        height: 80px;
        opacity: 0.5;
    }
}

/* Responsive */
@media (max-width: 768px) {
    .about-wrapper {
        padding: var(--space-lg) var(--space-md);
    }

    .degrees-grid {
        grid-template-columns: 1fr;
        gap: var(--space-md);
    }

    .degree-card {
        padding: var(--space-md);
    }

    .degree-title {
        font-size: 1.25rem;
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
