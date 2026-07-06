<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')
const { gtag } = useGtag()

interface CompactProject {
    name: string
    description: string
    url: string
    logo: string
    tech: string
}

const projects = computed<CompactProject[]>(() => [
    {
        name: 'ETF PEA',
        description: store.isFrench
            ? 'Suivi et analyse des ETF éligibles au PEA : dashboards, comparaison, portefeuille.'
            : 'Track and compare PEA-eligible ETFs: dashboards, comparison, portfolio.',
        url: 'https://etf.gregoire-raturat.fr',
        logo: '/projects/etf-pea/logo.webp',
        tech: 'Next.js',
    },
    {
        name: 'WebQuest',
        description: store.isFrench
            ? 'Apprendre le développement web front directement dans le navigateur : HTML, CSS, JS, APIs, JWT.'
            : 'Learn frontend web development directly in the browser: HTML, CSS, JS, APIs, JWT.',
        url: 'https://web-quests.onrender.com/',
        logo: '/projects/webquest/logo.webp',
        tech: 'Go',
    },
    {
        name: 'CityZen',
        description: store.isFrench
            ? 'Site vitrine pour salon de coiffure, gestion de contenu via Firebase.'
            : 'Showcase website for a hair salon, content managed with Firebase.',
        url: 'https://cityzen-coiffure.fr/',
        logo: '/projects/cityzen/logo.webp',
        tech: 'Vue.js',
    },
    {
        name: 'Model Viewer',
        description: store.isFrench
            ? "Documentation sur l'intégration 3D dans Vue.js avec ModelViewer et Three.js."
            : 'Documentation on 3D integration in Vue.js with ModelViewer and Three.js.',
        url: 'https://vue-and-modelviewer.netlify.app/',
        logo: '/projects/modelviewer/logo.webp',
        tech: 'Three.js',
    },
    {
        name: 'NextMusic',
        description: store.isFrench
            ? 'Application de bibliothèque musicale, interface inspirée de Dribbble.'
            : 'Music library application with a Dribbble-inspired interface.',
        url: 'https://next-music.netlify.app/bibliotheque',
        logo: '/projects/nextmusic/logo.webp',
        tech: 'Next.js',
    },
])

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

const trackClick = (name: string) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'view_item', {
            event_category: 'other_projects',
            event_label: name,
        })
    }
}
</script>

<template>
    <div class="other-projects-wrapper">
        <div class="other-projects-container">
            <!-- Section Header -->
            <div ref="headerRef" class="section-header">
                <span class="section-label">
                    <span class="label-line"></span>
                    {{ store.isFrench ? 'Aussi' : 'Also' }}
                </span>
                <h2 class="section-title">
                    {{ store.isFrench ? 'Autres projets' : 'Other projects' }}
                </h2>
            </div>

            <!-- Compact list -->
            <ul class="projects-list">
                <li
                    v-for="(project, index) in projects"
                    :key="project.name"
                    v-motion
                    :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20 }"
                    :visibleOnce="
                        prefersReducedMotion
                            ? { opacity: 1 }
                            : {
                                  opacity: 1,
                                  y: 0,
                                  transition: { type: 'spring', stiffness: 90, damping: 22, delay: 0.1 + index * 0.08 },
                              }
                    "
                >
                    <a
                        :href="project.url"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="project-row"
                        @click="trackClick(project.name)"
                    >
                        <img :src="project.logo" :alt="`${project.name} logo`" class="project-logo" loading="lazy" width="32" height="32" />
                        <span class="project-name">{{ project.name }}</span>
                        <span class="project-description">{{ project.description }}</span>
                        <span class="project-tech">{{ project.tech }}</span>
                        <svg class="project-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                d="M7 17L17 7M17 7H7M17 7V17"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </a>
                </li>
            </ul>
        </div>
    </div>
</template>

<style scoped>
.other-projects-wrapper {
    position: relative;
    width: 100%;
    padding: var(--space-lg) var(--space-lg);
    z-index: 1;
}

.other-projects-container {
    max-width: 900px;
    margin: 0 auto;
}

/* Section Header */
.section-header {
    text-align: center;
    margin-bottom: var(--space-md);
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
    font-size: clamp(1.75rem, 4vw, 2.5rem);
    font-weight: 700;
    color: var(--text-primary);
}

/* Compact list */
.projects-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
}

.project-row {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-sm);
    border-bottom: 1px solid var(--bg-accent);
    text-decoration: none;
    color: var(--text-primary);
    transition:
        background 0.3s ease,
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    border-radius: 12px;
}

.projects-list li:first-child .project-row {
    border-top: 1px solid var(--bg-accent);
}

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
    .project-row:hover {
        background: var(--bg-primary);
        transform: translateX(4px);
    }

    .project-row:hover .project-arrow {
        transform: translate(2px, -2px);
        color: var(--text-primary);
    }
}

.project-logo {
    width: 32px;
    height: 32px;
    object-fit: contain;
    border-radius: 8px;
    background: var(--bg-accent);
    padding: 3px;
    flex-shrink: 0;
}

.project-name {
    font-family: var(--font-display);
    font-size: 1.0625rem;
    font-weight: 600;
    white-space: nowrap;
}

.project-description {
    flex: 1;
    font-size: 0.875rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
}

.project-tech {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    padding: 0.2rem 0.6rem;
    background: var(--bg-accent);
    color: var(--accent-strong);
    border-radius: 20px;
    white-space: nowrap;
    flex-shrink: 0;
}

.project-arrow {
    color: var(--accent-primary);
    flex-shrink: 0;
    transition:
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        color 0.3s ease;
}

/* Mobile */
@media (max-width: 768px) {
    .other-projects-wrapper {
        padding: var(--space-lg) var(--space-md);
    }

    .project-row {
        flex-wrap: wrap;
        row-gap: var(--space-xs);
    }

    .project-name {
        flex: 1;
    }

    .project-description {
        order: 4;
        flex-basis: 100%;
        white-space: normal;
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
