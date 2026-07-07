<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref } from 'vue'
import { type Project, usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')
const { gtag } = useGtag()

// Projets secondaires : liste compacte, chaque ligne ouvre la popup (modale) de détail.
// On ne référence que des images .webp déjà présentes pour garder le site léger.
const projects = computed<Project[]>(() => [
    {
        name: 'ETF PEA',
        description: store.isFrench
            ? "Application web pour suivre et analyser les ETF éligibles au PEA : dashboards, comparaison de fonds et suivi de portefeuille d'investissement."
            : 'Web application to track and analyze PEA-eligible ETFs: dashboards, fund comparison and investment portfolio tracking.',
        year: '2026',
        type: store.isFrench ? 'Auto-entrepreneur' : 'Self-employed',
        url: 'https://etf.gregoire-raturat.fr',
        techno: [
            { name: 'Next.js', url: 'https://nextjs.org/' },
            { name: 'React', url: 'https://react.dev/' },
            { name: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
        ],
        path: '/projects/etf-pea',
        color: '15, 52, 96',
        imgs: [
            { src: '/projects/etf-pea/dashboard_1.webp', title: 'Dashboard' },
            { src: '/projects/etf-pea/dashboard_2.webp', title: 'Dashboard' },
            { src: '/projects/etf-pea/compare.webp', title: store.isFrench ? 'Comparaison' : 'Comparison' },
            { src: '/projects/etf-pea/portfolio_1.webp', title: store.isFrench ? 'Portefeuille' : 'Portfolio' },
            { src: '/projects/etf-pea/portfolio_2.webp', title: store.isFrench ? 'Portefeuille' : 'Portfolio' },
        ],
    },
    {
        name: 'WebQuest',
        description: store.isFrench
            ? "Plateforme interactive pour apprendre le développement web frontend directement dans le navigateur : HTML, CSS, JavaScript, APIs et authentification JWT."
            : 'Interactive platform to learn frontend web development directly in the browser: HTML, CSS, JavaScript, APIs and JWT authentication.',
        year: '2025',
        type: store.isFrench ? 'Auto-entrepreneur' : 'Self-employed',
        url: 'https://web-quests.onrender.com/',
        techno: [
            { name: 'Golang', url: 'https://go.dev/' },
            { name: 'HTML/CSS/JS', url: 'https://developer.mozilla.org/fr/docs/Web' },
        ],
        path: '/projects/webquest',
        color: '18, 18, 18',
        imgs: [{ src: '/projects/webquest/og_image.webp', title: 'WebQuest' }],
    },
    {
        name: 'CityZen',
        description: store.isFrench
            ? 'Site vitrine élégant pour un salon de coiffure, inspiré de designs primés Awwwards. Interface moderne avec gestion de contenu via Firebase.'
            : 'Elegant showcase website for a hair salon, inspired by award-winning Awwwards designs. Modern interface with content management via Firebase.',
        year: '2023',
        type: store.isFrench ? 'Auto-entrepreneur' : 'Self-employed',
        url: 'https://cityzen-coiffure.fr/',
        techno: [
            { name: 'Vue.js', url: 'https://vuejs.org/' },
            { name: 'Firebase', url: 'https://firebase.google.com/' },
        ],
        path: '/projects/cityzen',
        color: '148, 139, 115',
        imgs: [
            { src: '/projects/cityzen/menu.webp', title: 'Menu' },
            { src: '/projects/cityzen/avis.webp', title: store.isFrench ? 'Avis' : 'Reviews' },
            { src: '/projects/cityzen/contact.webp', title: 'Contact' },
            { src: '/projects/cityzen/admin_1.webp', title: store.isFrench ? 'Administration' : 'Admin' },
        ],
    },
    {
        name: 'Model Viewer',
        description: store.isFrench
            ? "Documentation complète sur l'intégration de composants 3D interactifs dans Vue.js avec ModelViewer et Three.js."
            : 'Complete documentation on integrating interactive 3D components in Vue.js with ModelViewer and Three.js.',
        year: '2023',
        type: 'Documentation',
        url: 'https://vue-and-modelviewer.netlify.app/',
        techno: [
            { name: 'Three.js', url: 'https://threejs.org/' },
            { name: 'Vue.js', url: 'https://vuejs.org/' },
            { name: 'ModelViewer', url: 'https://modelviewer.dev/' },
        ],
        path: '/projects/modelviewer',
    },
    {
        name: 'NextMusic',
        description: store.isFrench
            ? "Application de bibliothèque musicale développée avec Next.js et Tailwind CSS, à l'interface élégante inspirée de designs Dribbble."
            : 'Music library application built with Next.js and Tailwind CSS, with an elegant Dribbble-inspired interface.',
        year: '2022',
        type: store.isFrench ? 'Projet scolaire' : 'School project',
        url: 'https://next-music.netlify.app/bibliotheque',
        techno: [
            { name: 'Next.js', url: 'https://nextjs.org/' },
            { name: 'Tailwind CSS', url: 'https://tailwindcss.com/' },
        ],
        path: '/projects/nextmusic',
        color: '18, 18, 18',
        imgs: [
            { src: '/projects/nextmusic/next-music-homescreen.webp', title: store.isFrench ? 'Accueil' : 'Home' },
            {
                src: '/projects/nextmusic/next-music-biblioscreen.webp',
                title: store.isFrench ? 'Bibliothèque' : 'Library',
            },
            { src: '/projects/nextmusic/next-music-favoritescreen.webp', title: store.isFrench ? 'Favoris' : 'Favorites' },
            { src: '/projects/nextmusic/next-music-search.webp', title: store.isFrench ? 'Recherche' : 'Search' },
        ],
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

// Ouvre la popup de détail du projet (même mécanisme que la section Portfolio d'origine)
const openProject = (project: Project) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'view_item', {
            event_category: 'other_projects',
            event_label: project.name,
        })
    }
    store.setActiveProject({ ...project, visible: false })
    setTimeout(() => {
        if (store.activeProject) {
            store.activeProject.visible = true
        }
    }, 50)
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
                    <button type="button" class="project-row" @click="openProject(project)">
                        <img
                            :src="`${project.path}/logo.webp`"
                            :alt="`${project.name} logo`"
                            class="project-logo"
                            loading="lazy"
                            width="32"
                            height="32"
                        />
                        <span class="project-name">{{ project.name }}</span>
                        <span class="project-description">{{ project.description }}</span>
                        <span class="project-tech">{{ project.techno[0].name }}</span>
                        <svg class="project-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                d="M9 6l6 6-6 6"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>
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
    width: 100%;
    padding: var(--space-sm) var(--space-sm);
    border: none;
    border-bottom: 1px solid var(--bg-accent);
    background: none;
    text-align: left;
    font-family: inherit;
    color: var(--text-primary);
    cursor: pointer;
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
        background: var(--bg-secondary);
        transform: translateX(4px);
    }

    .project-row:hover .project-arrow {
        transform: translateX(3px);
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
