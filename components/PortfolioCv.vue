<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { useMotion } from '@vueuse/motion'
import { computed, ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')
const { gtag } = useGtag()

interface Experience {
    period: string
    title: string
    company: string
    companyUrl?: string
    location: string
    description: string[]
    stack?: string[]
    current?: boolean
}

const experiences = computed<Experience[]>(() => [
    {
        period: store.isFrench ? 'Juin 2026 - Présent' : 'Jun. 2026 - Present',
        title: store.isFrench ? 'Développeur Full Stack' : 'Full Stack Developer',
        company: 'SOCOTEC',
        companyUrl: 'https://www.socotec.com/',
        location: store.isFrench ? 'Lyon & Remote' : 'Lyon & Remote',
        current: true,
        description: store.isFrench
            ? [
                  'Développement full-stack au sein de l’équipe logicielle du groupe SOCOTEC (testing, inspection & certification)',
                  'Applications métier dans l’écosystème Vue 3 / TypeScript et APIs',
                  'Contribution à l’outillage interne et aux composants partagés (socotec.io)',
                  'Qualité de code, tests et intégration continue',
              ]
            : [
                  'Full-stack development within SOCOTEC’s software team (testing, inspection & certification group)',
                  'Business applications in the Vue 3 / TypeScript ecosystem and APIs',
                  'Contribution to internal tooling and shared components (socotec.io)',
                  'Code quality, testing and continuous integration',
              ],
        stack: ['Vue.js 3', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'CI/CD'],
    },
    {
        period: store.isFrench ? 'Nov. 2025 - Juin 2026' : 'Nov. 2025 - Jun. 2026',
        title: store.isFrench ? 'Développeur Full Stack' : 'Full Stack Developer',
        company: 'SOGEDO',
        location: 'Lyon',
        description: store.isFrench
            ? [
                  'Refonte des plugins internes (auth, core, component) de Vue 2 vers Vue 3 (Composition API)',
                  'Migration progressive avec amélioration de l’architecture et suppression de dette technique',
                  'Introduction de TypeScript et standardisation du typage sur l’ensemble des nouveaux modules',
                  'Création d’un package npm privé interne avec CLI pour générer du code et initialiser automatiquement les projets',
                  'Mise en place de pipelines CI/CD GitLab avec GitLab Runner (lint, tests, build, versioning, déploiement)',
                  'Automatisation des builds et des contrôles qualité pour sécuriser les mises en production',
                  'Amélioration des performances front et de la maintenabilité du code',
                  'Collaboration avec équipes backend .NET et équipes métiers',
              ]
            : [
                  'Refactor of internal plugins (auth, core, component) from Vue 2 to Vue 3 (Composition API)',
                  'Progressive migration with architectural improvements and technical debt reduction',
                  'Introduction of TypeScript and standardization of strong typing across new modules',
                  'Creation of a private internal npm package with CLI tools to scaffold code and initialize project structures',
                  'Implementation of GitLab CI/CD pipelines with GitLab Runner (linting, testing, build, versioning, deployment)',
                  'Automation of builds and quality checks to secure production releases',
                  'Front-end performance and maintainability improvements',
                  'Close collaboration with .NET backend and business teams',
              ],
        stack: [
            'Vue.js 3',
            'TypeScript',
            'Node.js',
            'Vitest / Jest',
            'GitLab CI/CD',
            '.NET',
            'Private npm package',
            'CLI tooling',
        ],
    },
    {
        period: 'Oct. 2023 - Nov. 2025',
        title: store.isFrench ? 'Développeur Full Stack' : 'Full Stack Developer',
        company: 'SYSTRA',
        companyUrl: 'https://www.systra.com/',
        location: 'Lyon',
        description: store.isFrench
            ? [
                  "Architecture d'applications SIG traitant +10M de parcelles cadastrales",
                  'Pipeline CI/CD Docker GitLab avec tests automatisés',
                  "Intégration de modèles IA pour détection d'objets sur images aériennes",
                  "Refonte modules d'authentification et gestion des droits",
                  'Automatisation de processus métiers → gain de 30% de temps',
              ]
            : [
                  'Architecture of GIS applications processing +10M cadastral parcels',
                  'Docker GitLab CI/CD pipeline with automated tests',
                  'Integration of AI models for object detection on aerial images',
                  'Redesign of authentication and rights management modules',
                  'Business process automation → 30% time savings',
              ],
        stack: ['Vue.js 3', 'TypeScript', 'Node.js', 'PostGIS', 'Docker', 'GitLab CI/CD'],
    },
    {
        period: '2020 - 2023',
        title: store.isFrench ? 'Apprenti Développeur' : 'Apprentice Developer',
        company: 'Modaal',
        location: 'Lyon',
        description: store.isFrench
            ? [
                  "Conception architecture complète d'une application SIG",
                  'Développement de processus ETL Python pour fichiers massifs (+5Go)',
                  'API REST sécurisées avec validateurs de schéma',
                  'Création de composants Vue.js réutilisables',
              ]
            : [
                  'Complete architecture design of a GIS application',
                  'Development of Python ETL processes for massive files (+5GB)',
                  'Secured REST APIs with schema validators',
                  'Creation of reusable Vue.js components',
              ],
        stack: ['Vue.js', 'Express', 'PostgreSQL', 'Python', 'Docker'],
    },
    {
        period: store.isFrench ? 'Janv. 2025 - Présent' : 'Jan. 2025 - Present',
        title: store.isFrench ? 'Enseignant Vacataire Web Moderne' : 'Modern Web Development Lecturer',
        company: store.isFrench ? 'Université Lyon 1' : 'Lyon 1 University',
        companyUrl: 'https://www.univ-lyon1.fr/',
        location: 'Lyon',
        description: store.isFrench
            ? [
                  'Animation de module pour étudiants de licence',
                  'Formation Web Mordern, HTML/JS/CSS, framework VueJS, API, database',
                  'Création de supports de cours et exercices pratiques',
              ]
            : [
                  'Module for licence students',
                  'Training on Modern Web, HTML/JS/CSS, framework VueJS, API, database',
                  'Creation of course materials and practical exercises',
              ],
        stack: ['HTML/JS/CSS', 'Vue.js 3', 'TypeScript', 'Vite', 'Golang'],
    },
    {
        period: store.isFrench ? 'Depuis 2021' : 'Since 2021',
        title: store.isFrench ? 'Product Engineer Freelance' : 'Freelance Product Engineer',
        company: store.isFrench ? 'Auto-entrepreneur' : 'Self-employed',
        location: store.isFrench ? 'Lyon & Remote' : 'Lyon & Remote',
        description: store.isFrench
            ? [
                  'DishRank — app de notation de plats publiée sur iOS, Android et web (React Native + Next.js + Supabase)',
                  'Messagerie omnicanale IA en production pour indépendants (Chatwoot + RAG + API Claude)',
                  'ETF PEA — application web de suivi et d’analyse d’ETF éligibles au PEA',
                  'Produits livrés de bout en bout : conception, développement, déploiement et maintenance',
              ]
            : [
                  'DishRank — dish-rating app published on iOS, Android and web (React Native + Next.js + Supabase)',
                  'Omnichannel AI messaging in production for independents (Chatwoot + RAG + Claude API)',
                  'ETF PEA — web app to track and analyze PEA-eligible ETFs',
                  'Products shipped end to end: design, development, deployment and maintenance',
              ],
        stack: ['React Native', 'Next.js', 'Supabase', 'API Claude', 'Node.js'],
    },
])

// Animation variants - adapte selon prefers-reduced-motion
const getVariants = () => {
    if (prefersReducedMotion.value) {
        return {
            initial: { opacity: 0 },
            visible: { opacity: 1 },
        }
    }
    return {
        fadeUp: {
            initial: { opacity: 0, y: 40 },
            visible: {
                opacity: 1,
                y: 0,
                transition: {
                    type: 'spring',
                    stiffness: 80,
                    damping: 20,
                },
            },
        },
        fadeSlideRight: {
            initial: { opacity: 0, x: -30 },
            visible: {
                opacity: 1,
                x: 0,
                transition: {
                    type: 'spring',
                    stiffness: 100,
                    damping: 25,
                },
            },
        },
        scaleIn: {
            initial: { opacity: 0, scale: 0.9 },
            visible: {
                opacity: 1,
                scale: 1,
                transition: {
                    type: 'spring',
                    stiffness: 120,
                    damping: 22,
                },
            },
        },
    }
}

const downloadCV = () => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'download', {
            event_category: 'engagement',
            event_label: 'CV_PDF',
            value: 1,
        })
    }
    window.open('/cv/CV_Gregoire_Raturat.pdf', '_blank')
}

// Refs pour les animations au scroll
const headerRef = ref<HTMLElement | null>(null)
const timelineRef = ref<HTMLElement | null>(null)
const statsRef = ref<HTMLElement | null>(null)

// Configuration des animations au montage (côté client uniquement)
if (import.meta.client) {
    const { fadeUp, scaleIn } = getVariants()

    // Header animation
    useMotion(headerRef, {
        initial: fadeUp?.initial,
        visibleOnce: fadeUp?.visible,
    })

    // Stats animation avec delay
    useMotion(statsRef, {
        initial: scaleIn?.initial,
        visibleOnce: {
            ...scaleIn?.visible,
            transition: {
                ...scaleIn?.visible.transition,
                delay: 0.3,
            },
        },
    })
}
</script>

<template>
    <div class="cv-section">
        <div class="cv-container">
            <!-- Header avec animation fade-up -->
            <div ref="headerRef" class="cv-header">
                <span class="section-label">
                    <span class="label-line"></span>
                    {{ store.isFrench ? 'Mon Parcours' : 'My Journey' }}
                </span>
                <h2 class="section-title">
                    {{ store.isFrench ? 'Expérience Professionnelle' : 'Professional Experience' }}
                </h2>
                <p class="section-description">
                    {{
                        store.isFrench
                            ? "Plus de 5 ans à concevoir et livrer des produits web & mobile de bout en bout — de la migration d'architecture à la mise en production — avec une spécialité en développement assisté par IA."
                            : '5+ years designing and shipping web & mobile products end to end — from architecture migration to production — with a focus on AI-assisted development.'
                    }}
                </p>

                <button class="download-cv" @click="downloadCV">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <path
                            d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M7 10L12 15M12 15L17 10M12 15V3"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                    {{ store.isFrench ? 'Télécharger le CV' : 'Download Resume' }}
                </button>
            </div>

            <!-- Timeline avec stagger progressif -->
            <div ref="timelineRef" class="timeline">
                <div
                    v-for="(exp, index) in experiences"
                    :key="index"
                    v-motion
                    :initial="
                        prefersReducedMotion
                            ? { opacity: 0 }
                            : {
                                  opacity: 0,
                                  x: -30,
                                  scale: 0.95,
                              }
                    "
                    :visibleOnce="
                        prefersReducedMotion
                            ? { opacity: 1 }
                            : {
                                  opacity: 1,
                                  x: 0,
                                  scale: 1,
                                  transition: {
                                      type: 'spring',
                                      stiffness: 90,
                                      damping: 22,
                                      delay: index * 0.12,
                                  },
                              }
                    "
                    class="timeline-item"
                    :class="{ current: exp.current }"
                >
                    <div class="timeline-marker">
                        <div class="marker-dot"></div>
                        <div v-if="index < experiences.length - 1" class="marker-line"></div>
                    </div>

                    <div class="timeline-content">
                        <div class="experience-header">
                            <div class="experience-period">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M8 2V5M16 2V5M3.5 9.09H20.5M21 8.5V17C21 20 19.5 22 16 22H8C4.5 22 3 20 3 17V8.5C3 5.5 4.5 3.5 8 3.5H16C19.5 3.5 21 5.5 21 8.5Z"
                                        stroke="currentColor"
                                        stroke-width="1.5"
                                        stroke-miterlimit="10"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                {{ exp.period }}
                            </div>
                            <span v-if="exp.current" class="current-badge">
                                {{ store.isFrench ? 'En cours' : 'Current' }}
                            </span>
                        </div>

                        <h3 class="experience-title">{{ exp.title }}</h3>
                        <p class="experience-company">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M12.37 8.88H17.62M6.38 8.88L7.13 9.63L9.38 7.38M6.38 15.88L7.13 16.63L9.38 14.38M12.37 15.88H17.62M9 22H15C20 22 22 20 22 15V9C22 4 20 2 15 2H9C4 2 2 4 2 9V15C2 20 4 22 9 22Z"
                                    stroke="currentColor"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                            <a
                                v-if="exp.companyUrl"
                                :href="exp.companyUrl"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="company-link"
                            >{{ exp.company }}</a>
                            <span v-else>{{ exp.company }}</span>
                            <span class="company-sep">•</span> {{ exp.location }}
                        </p>

                        <ul class="experience-description">
                            <li
                                v-for="(item, i) in exp.description"
                                :key="i"
                                v-motion
                                :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -10 }"
                                :visibleOnce="
                                    prefersReducedMotion
                                        ? { opacity: 1 }
                                        : {
                                              opacity: 1,
                                              x: 0,
                                              transition: {
                                                  type: 'spring',
                                                  stiffness: 100,
                                                  damping: 20,
                                                  delay: index * 0.12 + i * 0.05,
                                              },
                                          }
                                "
                            >
                                {{ item }}
                            </li>
                        </ul>

                        <div v-if="exp.stack" class="tech-stack">
                            <span
                                v-for="(tech, i) in exp.stack"
                                :key="i"
                                v-motion
                                :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }"
                                :visibleOnce="
                                    prefersReducedMotion
                                        ? { opacity: 1 }
                                        : {
                                              opacity: 1,
                                              scale: 1,
                                              transition: {
                                                  type: 'spring',
                                                  stiffness: 150,
                                                  damping: 18,
                                                  delay: index * 0.12 + 0.3 + i * 0.03,
                                              },
                                          }
                                "
                                class="tech-badge"
                            >
                                {{ tech }}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats avec animation scale-in retardée -->
            <div ref="statsRef" class="cv-stats">
                <div
                    v-for="(stat, index) in [
                        { number: '5+', label: store.isFrench ? 'Années d\'expérience' : 'Years of experience' },
                        { number: '10M+', label: store.isFrench ? 'Données traitées' : 'Data processed' },
                        { number: '100+', label: store.isFrench ? 'Étudiants formés' : 'Students trained' },
                        { number: '15+', label: store.isFrench ? 'Projets livrés' : 'Projects delivered' },
                    ]"
                    :key="index"
                    v-motion
                    :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8, y: 20 }"
                    :visibleOnce="
                        prefersReducedMotion
                            ? { opacity: 1 }
                            : {
                                  opacity: 1,
                                  scale: 1,
                                  y: 0,
                                  transition: {
                                      type: 'spring',
                                      stiffness: 100,
                                      damping: 20,
                                      delay: 0.5 + index * 0.08,
                                  },
                              }
                    "
                    class="stat-card"
                >
                    <div class="stat-number">{{ stat.number }}</div>
                    <div class="stat-label">{{ stat.label }}</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.cv-section {
    padding: var(--space-xl) var(--space-lg);
}

.cv-container {
    max-width: 900px;
    margin: 0 auto;
}

/* Header */
.cv-header {
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
    color: #6d5745;
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
    margin: 0 auto var(--space-lg);
}

.download-cv {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 600;
    padding: var(--space-sm) var(--space-lg);
    background: var(--accent-primary);
    color: var(--bg-primary);
    border: 2px solid var(--accent-primary);
    border-radius: 50px;
    cursor: pointer;
    transition:
        transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.25s ease,
        border-color 0.25s ease,
        box-shadow 0.25s ease;
    will-change: transform;
}

.download-cv:hover {
    background: var(--text-primary);
    border-color: var(--text-primary);
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 12px 35px rgba(139, 111, 92, 0.35);
}

.download-cv:active {
    transform: translateY(-1px) scale(0.98);
}

/* Timeline */
.timeline {
    position: relative;
    padding-left: var(--space-lg);
}

.timeline-item {
    position: relative;
    display: flex;
    gap: var(--space-lg);
    margin-bottom: var(--space-xl);
}

.timeline-marker {
    position: relative;
    flex-shrink: 0;
}

.marker-dot {
    width: 16px;
    height: 16px;
    background: var(--accent-primary);
    border: 4px solid var(--bg-secondary);
    border-radius: 50%;
    box-shadow: 0 0 0 2px var(--accent-primary);
    transition:
        all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.4s ease;
}

.timeline-item.current .marker-dot {
    width: 20px;
    height: 20px;
    background: var(--text-primary);
    box-shadow:
        0 0 0 3px var(--text-primary),
        0 0 25px rgba(139, 111, 92, 0.6);
}

@media (prefers-reduced-motion: no-preference) {
    .timeline-item.current .marker-dot {
        animation: pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
}

@keyframes pulse {
    0%,
    100% {
        box-shadow:
            0 0 0 3px var(--text-primary),
            0 0 25px rgba(139, 111, 92, 0.6);
    }
    50% {
        box-shadow:
            0 0 0 5px var(--text-primary),
            0 0 35px rgba(139, 111, 92, 0.8);
    }
}

.marker-line {
    position: absolute;
    left: 50%;
    top: 20px;
    bottom: -60px;
    width: 2px;
    background: linear-gradient(180deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
    transform: translateX(-50%);
}

/* Content */
.timeline-content {
    flex: 1;
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 16px;
    padding: var(--space-lg);
    transition:
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.3s ease,
        border-color 0.3s ease;
    will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
    .timeline-content:hover {
        transform: translateY(-6px) scale(1.01);
        box-shadow:
            0 15px 50px rgba(0, 0, 0, 0.12),
            0 5px 15px rgba(139, 111, 92, 0.08);
        border-color: var(--accent-secondary);
    }
}

.experience-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--space-sm);
    flex-wrap: wrap;
    gap: var(--space-xs);
}

.experience-period {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--accent-primary);
}

.current-badge {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: 4px 12px;
    background: var(--accent-primary);
    color: var(--bg-primary);
    border-radius: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: no-preference) {
    .current-badge:hover {
        transform: scale(1.08);
    }
}

.experience-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: var(--space-xs) 0;
}

.experience-company {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: var(--space-md);
}

.company-link {
    color: var(--accent-primary);
    font-weight: 600;
    text-decoration: none;
    border-bottom: 1px solid transparent;
    transition:
        color 0.25s ease,
        border-color 0.25s ease;
}

.company-link:hover {
    color: var(--text-primary);
    border-color: var(--accent-primary);
}

.company-sep {
    opacity: 0.5;
}

.experience-description {
    list-style: none;
    padding: 0;
    margin: 0 0 var(--space-md) 0;
}

.experience-description li {
    position: relative;
    padding-left: var(--space-md);
    margin-bottom: var(--space-xs);
    color: var(--text-secondary);
    line-height: 1.6;
}

.experience-description li::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: var(--accent-primary);
    font-weight: bold;
}

.tech-stack {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
}

.tech-badge {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: 4px 12px;
    background: var(--bg-accent);
    color: var(--accent-primary);
    border-radius: 12px;
    border: 1px solid var(--accent-tertiary);
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.2s ease;
    will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
    .tech-badge:hover {
        background: var(--accent-primary);
        color: var(--bg-primary);
        border-color: var(--accent-primary);
        transform: translateY(-2px) scale(1.05);
        box-shadow: 0 4px 12px rgba(139, 111, 92, 0.25);
    }
}

/* Stats */
.cv-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: var(--space-md);
    margin-top: var(--space-xl);
}

.stat-card {
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 16px;
    padding: var(--space-lg);
    text-align: center;
    transition:
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        border-color 0.3s ease,
        box-shadow 0.3s ease;
    will-change: transform;
}

@media (prefers-reduced-motion: no-preference) {
    .stat-card:hover {
        transform: translateY(-6px) scale(1.03);
        border-color: var(--accent-primary);
        box-shadow:
            0 12px 35px rgba(139, 111, 92, 0.2),
            0 4px 12px rgba(0, 0, 0, 0.08);
    }
}

.stat-number {
    font-family: var(--font-display);
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--accent-primary);
    line-height: 1;
    margin-bottom: var(--space-xs);
}

.stat-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
}

/* Responsive */
@media (max-width: 768px) {
    .cv-section {
        padding: var(--space-lg) var(--space-md);
    }

    .timeline {
        padding-left: 0;
    }
    .stat-card {
        padding: 10px !important;
    }
    .timeline-item {
        gap: var(--space-md);
        margin-bottom: var(--space-sm);
    }
    .timeline-marker {
        display: none;
    }
    .timeline-content {
        padding: var(--space-md);
    }
    .cv-stats {
        margin-top: var(--space-md);
        gap: var(--space-xs);
    }
    .experience-title {
        font-size: 1.25rem;
    }
}

/* Performance: reduce animations on lower-end devices */
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
