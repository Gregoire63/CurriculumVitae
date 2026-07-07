<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')
const { gtag } = useGtag()

interface Service {
    title: string
    description: string
    tags: string[]
    icon: 'rocket' | 'brain' | 'team'
}

const content = computed<{ label: string; title: string; description: string; services: Service[]; cta: string }>(
    () =>
        store.isFrench
            ? {
                  label: 'Services',
                  title: 'Ce que je fais',
                  description: 'Trois façons de travailler ensemble, en mission courte et en remote.',
                  cta: 'En discuter',
                  services: [
                      {
                          title: 'MVP express',
                          description:
                              'Votre produit fonctionnel en quelques semaines : web + mobile, de la conception au déploiement en production.',
                          tags: ['Next.js', 'Supabase', 'React Native'],
                          icon: 'rocket',
                      },
                      {
                          title: 'Pipelines IA',
                          description:
                              "RAG, agents, intégration de l'API Claude dans vos produits — avec des coûts et une fiabilité maîtrisés.",
                          tags: ['RAG', 'Agents', 'API Claude'],
                          icon: 'brain',
                      },
                      {
                          title: 'Équipes augmentées',
                          description:
                              "Audit et mise en place du développement assisté par IA : outillage, conventions, formation de vos équipes.",
                          tags: ['Audit', 'Outillage', 'Formation'],
                          icon: 'team',
                      },
                  ],
              }
            : {
                  label: 'Services',
                  title: 'What I do',
                  description: 'Three ways to work together, on short-term engagements and fully remote.',
                  cta: "Let's talk",
                  services: [
                      {
                          title: 'Express MVP',
                          description:
                              'Your working product in a few weeks: web + mobile, from design to production deployment.',
                          tags: ['Next.js', 'Supabase', 'React Native'],
                          icon: 'rocket',
                      },
                      {
                          title: 'AI pipelines',
                          description:
                              'RAG, agents, Claude API integration into your products — with costs and reliability under control.',
                          tags: ['RAG', 'Agents', 'Claude API'],
                          icon: 'brain',
                      },
                      {
                          title: 'Augmented teams',
                          description:
                              'Audit and rollout of AI-assisted development: tooling, conventions, training for your teams.',
                          tags: ['Audit', 'Tooling', 'Training'],
                          icon: 'team',
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

const handleContact = (service: string) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'service_cta', {
            event_category: 'engagement',
            event_label: service,
        })
    }
    store.navigateToSection('contact')
}
</script>

<template>
    <div class="services-wrapper">
        <div class="services-container">
            <!-- Section Header -->
            <div ref="headerRef" class="section-header">
                <span class="section-label">
                    <span class="label-line"></span>
                    {{ content.label }}
                </span>
                <h2 class="section-title">{{ content.title }}</h2>
                <p class="section-description">{{ content.description }}</p>
            </div>

            <!-- Services Grid -->
            <div class="services-grid">
                <div
                    v-for="(service, index) in content.services"
                    :key="service.icon"
                    v-motion
                    :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 30, scale: 0.95 }"
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
                                      delay: 0.2 + index * 0.12,
                                  },
                              }
                    "
                    class="service-card"
                >
                    <div class="service-icon" aria-hidden="true">
                        <!-- Rocket -->
                        <svg v-if="service.icon === 'rocket'" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <path
                                d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0m0 7v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                        <!-- Brain / AI -->
                        <svg v-else-if="service.icon === 'brain'" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <path
                                d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <path
                                d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4m8.599-6.5a3 3 0 0 0 .399-1.375m-11.995 0A3 3 0 0 0 6.401 6.5m-2.924 4.396a4 4 0 0 1 2.523-1.771m11.998 0a4 4 0 0 1 2.524 1.77m-14.489 6.48A4 4 0 0 1 12 18a4 4 0 0 1 5.967-1.125"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                        <!-- Team -->
                        <svg v-else viewBox="0 0 24 24" fill="none">
                            <path
                                d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <circle cx="9" cy="7" r="4" stroke="currentColor" stroke-width="2" />
                            <path
                                d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </div>

                    <h3 class="service-title">{{ service.title }}</h3>
                    <p class="service-description">{{ service.description }}</p>

                    <div class="service-tags">
                        <span v-for="tag in service.tags" :key="tag" class="tech-tag">{{ tag }}</span>
                    </div>

                    <button class="service-cta" @click="handleContact(service.title)">
                        {{ content.cta }}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                d="M7 17L17 7M17 7H7M17 7V17"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.services-wrapper {
    position: relative;
    width: 100%;
    padding: var(--space-xl) var(--space-lg);
    z-index: 1;
}

.services-container {
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

/* Services Grid */
.services-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-md);
}

.service-card {
    display: flex;
    flex-direction: column;
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 24px;
    padding: var(--space-md);
    transition:
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.3s ease,
        border-color 0.3s ease;
}

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
    .service-card:hover {
        transform: translateY(-8px);
        box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.12),
            0 0 0 1px rgba(139, 111, 92, 0.1);
        border-color: var(--accent-secondary);
    }
}

.service-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    background: var(--bg-accent);
    border-radius: 16px;
    color: var(--accent-primary);
    margin-bottom: var(--space-sm);
}

.service-icon svg {
    width: 28px;
    height: 28px;
}

.service-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--space-xs) 0;
}

.service-description {
    font-size: 0.9375rem;
    line-height: 1.7;
    color: var(--text-secondary);
    margin-bottom: var(--space-sm);
    flex: 1;
}

.service-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-bottom: var(--space-sm);
}

.tech-tag {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: var(--space-xs) var(--space-sm);
    background: var(--bg-accent);
    color: var(--accent-strong);
    border-radius: 20px;
}

.service-cta {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    align-self: flex-start;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent-primary);
    background: none;
    border: none;
    padding: var(--space-xs) 0;
    cursor: pointer;
    transition: color 0.3s ease;
}

.service-cta svg {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
    .service-cta:hover {
        color: var(--text-primary);
    }

    .service-cta:hover svg {
        transform: translate(3px, -3px);
    }
}

/* Mobile */
@media (max-width: 768px) {
    .services-wrapper {
        padding: var(--space-lg) var(--space-md);
    }

    .section-header {
        margin-bottom: var(--space-md);
    }

    .services-grid {
        grid-template-columns: 1fr;
        gap: var(--space-sm);
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
