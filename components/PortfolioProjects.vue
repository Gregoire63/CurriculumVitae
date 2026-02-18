<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref } from 'vue'
import { type Project, usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const prefersReducedMotion = usePreferredReducedMotion()
const { gtag } = useGtag()

const projects = computed<Project[]>(() => [
    {
        name: 'WebQuest',
        description: store.isFrench
            ? "WebQuest est une plateforme interactive pour apprendre le développement web frontend : HTML, CSS, JavaScript, les APIs et l'authentification JWT — directement dans le navigateur."
            : 'WebQuest is an interactive platform for learning frontend web development: HTML, CSS, JavaScript, APIs and JWT authentication — directly in the browser.',
        year: '2026',
        type: store.isFrench ? 'Auto-Entrepreneur' : 'Self-employed',
        url: 'https://web-quests.onrender.com/',
        techno: [
            { name: 'HTML/CSS/JS', url: 'https://developer.mozilla.org/fr/docs/Web' },
            { name: 'Golang', url: 'https://go.dev/' },
        ],
        path: '/projects/webquest',
        color: '18, 18, 18',
        imgs: [
            { src: '/projects/webquest/og_image.webp' },
            {
                src: '/projects/webquest/webquest.mp4',
                type: 'video',
            },
        ],
    },
    {
        name: 'CityZen',
        description: store.isFrench
            ? 'Site web élégant pour salon de coiffure, inspiré de designs primés Awwwards. Interface moderne avec gestion de contenu via Firebase.'
            : 'Elegant website for hair salon, inspired by award-winning Awwwards designs. Modern interface with content management via Firebase.',
        year: '2023',
        type: store.isFrench ? 'Auto-Entrepreneur' : 'Self-employed',
        techno: [
            { name: 'Vue.js', url: 'https://vuejs.org/' },
            { name: 'Firebase', url: 'https://firebase.google.com/' },
        ],
        url: 'https://cityzen-coiffure.fr/',
        path: '/projects/cityzen',
        color: '148, 139, 115',
        imgs: [
            { src: '/projects/cityzen/cityzen_2.mp4', type: 'video', title: store.isFrench ? 'Accueil' : 'Home' },
            { src: '/projects/cityzen/contact.webp', title: 'Contact' },
        ],
    },
    {
        name: 'HapartEnVille',
        description: store.isFrench
            ? 'Site vitrine pour l’association HapartEnVille, mettant en valeur les événements culturels locaux via une interface moderne. Développé en collaboration avec l’association pour un accès inclusif à la culture.'
            : 'Showcase website for the HapartEnVille association, highlighting local cultural events through a modern interface. Developed in collaboration with the association for inclusive access to culture.',
        year: '2023',
        type: store.isFrench ? 'Auto-Entrepreneur' : 'Self-employed',
        techno: [
            { name: 'Vue.js', url: 'https://vuejs.org/' },
            { name: 'GSAP', url: 'https://gsap.com/' },
        ],
        path: '/projects/happartenville',
        color: '7, 26, 24',
        url: 'https://hapartenville.fr/',
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
            { name: 'Vue.js', url: 'https://vuejs.org/' },
            { name: 'Three.js', url: 'https://threejs.org/' },
            { name: 'ModelViewer', url: 'https://modelviewer.dev/' },
        ],
        path: '/projects/modelviewer',
        imgs: [{ src: '/projects/modelviewer/vue_modelviewer.mp4', type: 'video' }],
    },
    {
        name: 'NextMusic',
        description: store.isFrench
            ? 'Application de musique moderne développée avec Next.js et Tailwind CSS. Interface élégante inspirée de designs Dribbble, permettant de gérer sa bibliothèque musicale.'
            : 'Modern music application developed with Next.js and Tailwind CSS. Elegant interface inspired by Dribbble designs, allowing music library management.',
        year: '2022',
        type: store.isFrench ? 'Projet scolaire' : 'School project',
        url: 'https://next-music.netlify.app/bibliotheque',
        techno: [
            { name: 'Next.js', url: 'https://nextjs.org/' },
            { name: 'Tailwind', url: 'https://tailwindcss.com/' },
        ],
        path: '/projects/nextmusic',
        color: '18, 18, 18',
        imgs: [
            { src: '/projects/nextmusic/next-music-homescreen.webp', title: store.isFrench ? 'Accueil' : 'Home' },
            {
                src: '/projects/nextmusic/next-music-biblioscreen.webp',
                title: store.isFrench ? 'Bibliothèque' : 'Library',
            },
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

const openProject = (project: Project) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'view_item', {
            event_category: 'portfolio',
            event_label: project.name,
            value: 1,
        })
    }
    if (!project.imgs && project.path) return window.open(project.url, '_blank')
    store.setActiveProject({ ...project, visible: false })
    setTimeout(() => {
        if (store.activeProject) {
            store.activeProject.visible = true
        }
    }, 50)
}
</script>

<template>
    <div class="projects-wrapper">
        <div class="projects-container">
            <!-- Section Header -->
            <div ref="headerRef" class="section-header">
                <span class="section-label">
                    <span class="label-line"></span>
                    {{ store.isFrench ? 'Réalisations' : 'Work' }}
                </span>
                <h2 class="section-title">Portfolio</h2>
                <p class="section-description">
                    {{
                        store.isFrench
                            ? "Une sélection de projets qui démontrent mon expertise technique et ma créativité dans la conception d'applications web et mobiles."
                            : 'A selection of projects that demonstrate my technical expertise and creativity in designing web and mobile applications.'
                    }}
                </p>
            </div>

            <!-- Projects Grid avec animations stagger -->
            <div class="projects-grid">
                <div
                    v-for="(project, index) in projects"
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
                                      delay: 0.3 + index * 0.12,
                                  },
                              }
                    "
                    class="project-card"
                    @click="openProject(project)"
                >
                    <!-- Card Content -->
                    <div class="card-header">
                        <div class="project-thumbnail">
                            <img :src="`${project.path}/logo.webp`" :alt="`${project.name} logo`" loading="lazy" />
                        </div>
                        <div class="project-meta">
                            <h3 class="project-name">{{ project.name }}</h3>
                            <div class="project-info">
                                <span class="project-year">{{ project.year }}</span>
                                <span class="dot-separator">•</span>
                                <span class="project-type">{{ project.type }}</span>
                            </div>
                        </div>
                    </div>

                    <p class="project-description">{{ project.description }}</p>

                    <div class="project-tech">
                        <div v-for="(tech, techIndex) in project.techno" :key="techIndex" class="tech-tag">
                            {{ tech.name }}
                        </div>
                    </div>

                    <div class="card-footer">
                        <span class="view-more">
                            {{ store.isFrench ? `Voir le ${project.imgs?.length?'projet':'site'}` : `View ${project.imgs?.length?'project':'site'}` }}
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M7 17L17 7M17 7H7M17 7V17"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.projects-wrapper {
    position: relative;
    width: 100%;
    padding: var(--space-xl) var(--space-lg);
    z-index: 1;
}

.projects-container {
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

/* Projects Grid */
.projects-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: var(--space-lg);
}

/* Project Card */
.project-card {
    position: relative;
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 24px;
    padding: var(--space-lg);
    cursor: pointer;
    overflow: hidden;
    transition:
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.3s ease,
        border-color 0.3s ease;
    will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
    .project-card:hover {
        transform: translateY(-8px) scale(1.01);
        box-shadow:
            0 24px 60px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(139, 111, 92, 0.1);
        border-color: var(--accent-secondary);
    }
}

/* Card Content */
.card-header {
    position: relative;
    display: flex;
    align-items: center;
    gap: var(--space-md);
    margin-bottom: var(--space-md);
    z-index: 1;
}

.project-thumbnail {
    width: 60px;
    height: 60px;
    background: var(--bg-accent);
    border-radius: 12px;
    padding: var(--space-xs);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.3s ease;
}

@media (prefers-reduced-motion: no-preference) {
    .project-card:hover .project-thumbnail {
        transform: scale(1.08) rotate(-5deg);
        background: var(--accent-tertiary);
    }
}

.project-thumbnail img {
    width: 100%;
    height: 100%;
    object-fit: contain;
}

.project-meta {
    flex: 1;
}

.project-name {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 var(--space-xs) 0;
}

.project-info {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-muted);
}

.dot-separator {
    opacity: 0.5;
}

.project-description {
    position: relative;
    font-size: 0.9375rem;
    line-height: 1.7;
    color: var(--text-secondary);
    margin-bottom: var(--space-md);
    z-index: 1;
}

.project-tech {
    position: relative;
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
    margin-bottom: var(--space-md);
    z-index: 1;
}

.tech-tag {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: var(--space-xs) var(--space-sm);
    background: var(--bg-accent);
    color: var(--accent-primary);
    border-radius: 20px;
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.3s ease,
        color 0.3s ease;
}

@media (prefers-reduced-motion: no-preference) {
    .project-card:hover .tech-tag {
        background: var(--accent-secondary);
        color: var(--bg-primary);
        transform: translateY(-2px);
    }
}

.card-footer {
    position: relative;
    display: flex;
    justify-content: flex-end;
    z-index: 1;
}

.view-more {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--accent-primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.view-more svg {
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: no-preference) {
    .project-card:hover .view-more {
        color: var(--text-primary);
    }

    .project-card:hover .view-more svg {
        transform: translate(4px, -4px);
    }
}

/* Responsive */
@media (max-width: 768px) {
    .projects-wrapper {
        padding: var(--space-lg) var(--space-md);
    }
    .section-header {
        margin-bottom: var(--space-md);
    }
    .projects-grid {
        grid-template-columns: 1fr;
        gap: var(--space-sm);
    }

    .project-card {
        padding: var(--space-md);
    }

    .project-name {
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
