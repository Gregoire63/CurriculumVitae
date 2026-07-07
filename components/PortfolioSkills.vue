<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const isVisible = ref(false)

interface Skill {
    category: string
    icon: 'server' | 'layout' | 'check' | 'terminal' | 'blocks' | 'users' | 'mobile'
    skills: string[]
}

const skillsData = computed<Skill[]>(() => [
    {
        category: 'Frontend',
        icon: 'layout',
        skills: [
            'Vue.js / Nuxt',
            'React / Next.js',
            'TypeScript',
            'Tailwind CSS',
            'Pinia',
            'HTML5 / CSS3',
            store.isFrench ? 'Architecture de composants' : 'Component architecture',
            store.isFrench ? 'Optimisation des performances' : 'Performance optimization',
            'OpenLayers',
        ],
    },
    {
        category: 'Backend',
        icon: 'server',
        skills: [
            'Node.js (Express)',
            store.isFrench ? 'Conception d’API REST' : 'REST API design',
            'Supabase',
            'PostgreSQL',
            'PostGIS',
            'MongoDB',
            'Redis',
            '.NET',
            store.isFrench ? 'Auth & RBAC (JWT, HMAC)' : 'Auth & RBAC (JWT, HMAC)',
        ],
    },
    {
        category: 'Mobile',
        icon: 'mobile',
        skills: [
            'React Native',
            'Expo',
            'EAS Build',
            store.isFrench ? 'Publication App Store / Play Store' : 'App Store / Play Store publishing',
            store.isFrench ? 'Notifications push' : 'Push notifications',
        ],
    },
    {
        category: store.isFrench ? 'IA & Data' : 'AI & Data',
        icon: 'blocks',
        skills: [
            store.isFrench ? 'API Claude' : 'Claude API',
            'RAG (pgvector)',
            store.isFrench ? 'Agents & MCP' : 'Agents & MCP',
            'Embeddings',
            store.isFrench ? 'Prompt engineering' : 'Prompt engineering',
            'BullMQ',
            store.isFrench ? 'Maîtrise des coûts LLM' : 'LLM cost control',
            store.isFrench ? 'Développement assisté par IA' : 'AI-assisted development',
        ],
    },
    {
        category: 'DevOps & Tools',
        icon: 'terminal',
        skills: [
            store.isFrench ? 'Git (workflow, code review)' : 'Git (workflow, code review)',
            'GitLab CI/CD',
            'Docker',
            'Nginx',
            'Linux',
            'Netlify / Vercel',
            store.isFrench ? 'Packages npm privés' : 'Private npm packages',
            store.isFrench ? 'Outillage CLI (Node.js)' : 'CLI tooling (Node.js)',
        ],
    },
    {
        category: 'Testing',
        icon: 'check',
        skills: [
            store.isFrench ? 'Vitest (unitaires, intégration)' : 'Vitest (unit, integration)',
            'Cypress (E2E)',
            store.isFrench ? 'Stratégie de tests' : 'Testing strategy',
        ],
    },
    {
        category: 'Architecture',
        icon: 'blocks',
        skills: [
            store.isFrench ? 'Refactoring & dette technique' : 'Refactoring & technical debt',
            store.isFrench ? 'Architecture modulaire' : 'Modular architecture',
            store.isFrench ? 'Industrialisation projet' : 'Project industrialization',
            store.isFrench ? 'Automatisation & scaffolding' : 'Automation & scaffolding',
        ],
    },
    {
        category: store.isFrench ? 'Méthodo & Soft skills' : 'Methodology & Soft skills',
        icon: 'users',
        skills: [
            'Agile (Scrum / Kanban)',
            store.isFrench ? 'Communication technique claire' : 'Clear technical communication',
            store.isFrench ? 'Résolution de problèmes' : 'Problem solving',
            store.isFrench ? 'Collaboration inter-équipes' : 'Cross-team collaboration',
        ],
    },
])

onMounted(() => {
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    isVisible.value = true
                    observer.unobserve(entry.target)
                }
            })
        },
        { threshold: 0.12 },
    )

    const section = document.querySelector('.skills-wrapper')
    if (section) {
        observer.observe(section)
    } else {
        isVisible.value = true
    }

    // Léger tilt 3D au survol — désactivé si l'utilisateur préfère moins d'animations
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) return

    const skillCards = document.querySelectorAll<HTMLElement>('.skill-category')
    const setHoverData = (e: MouseEvent, card: HTMLElement) => {
        const rect = card.getBoundingClientRect()
        const xPercentage = ((e.clientX - rect.left) / rect.width) * 100
        const yPercentage = ((e.clientY - rect.top) / rect.height) * 100
        card.style.setProperty('--x', `${xPercentage}%`)
        card.style.setProperty('--y', `${yPercentage}%`)
        card.style.setProperty('--rotate-x', `${(yPercentage - 50) / 26}deg`)
        card.style.setProperty('--rotate-y', `${(50 - xPercentage) / 26}deg`)
    }

    skillCards.forEach((card) => {
        card.addEventListener('mouseenter', (e) => setHoverData(e as MouseEvent, card))
        card.addEventListener('mousemove', (e) => setHoverData(e as MouseEvent, card))
        card.addEventListener('mouseleave', () => {
            card.style.setProperty('--rotate-x', '0deg')
            card.style.setProperty('--rotate-y', '0deg')
        })
    })
})
</script>

<template>
    <div class="skills-wrapper" :class="{ visible: isVisible }">
        <div class="skills-container">
            <!-- Section Header -->
            <div class="section-header reveal delay-1">
                <span class="section-label">
                    <span class="label-line"></span>
                    {{ store.isFrench ? 'Expertise' : 'Expertise' }}
                </span>
                <h2 class="section-title">
                    {{ store.isFrench ? 'Compétences techniques' : 'Technical skills' }}
                </h2>
                <p class="section-description">
                    {{
                        store.isFrench
                            ? 'Les technologies et méthodes que j’utilise pour livrer des produits complets, du front à la prod.'
                            : 'The technologies and methods I use to ship complete products, from front-end to production.'
                    }}
                </p>
            </div>

            <!-- Skills Grid -->
            <div class="skills-grid">
                <div
                    v-for="(skillGroup, index) in skillsData"
                    :key="index"
                    class="skill-category"
                    :style="{ '--index': index }"
                >
                    <div class="category-header">
                        <span class="category-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <template v-if="skillGroup.icon === 'server'">
                                    <rect x="2" y="3" width="20" height="8" rx="2" /><rect x="2" y="13" width="20" height="8" rx="2" /><path d="M6 7h.01M6 17h.01" />
                                </template>
                                <template v-else-if="skillGroup.icon === 'layout'">
                                    <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M9 21V9" />
                                </template>
                                <template v-else-if="skillGroup.icon === 'check'">
                                    <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                                </template>
                                <template v-else-if="skillGroup.icon === 'terminal'">
                                    <path d="M4 17l6-6-6-6M12 19h8" />
                                </template>
                                <template v-else-if="skillGroup.icon === 'users'">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                                </template>
                                <template v-else-if="skillGroup.icon === 'mobile'">
                                    <rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" />
                                </template>
                                <template v-else>
                                    <path d="M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4" />
                                </template>
                            </svg>
                        </span>
                        <h3 class="category-title">{{ skillGroup.category }}</h3>
                        <span class="category-count">{{ skillGroup.skills.length }}</span>
                    </div>

                    <div class="skills-chips">
                        <span
                            v-for="(skill, skillIndex) in skillGroup.skills"
                            :key="skillIndex"
                            class="skill-chip"
                            :style="{ '--skill-index': skillIndex }"
                        >
                            {{ skill }}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.skills-wrapper {
    position: relative;
    width: 100%;
    padding: var(--space-xl) var(--space-lg);
    z-index: 1;
}

.skills-container {
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
    color: var(--accent-tertiary);
    margin-bottom: var(--space-sm);
}

.label-line {
    width: 30px;
    height: 2px;
    background: var(--accent-tertiary);
}

.section-title {
    font-family: var(--font-display);
    font-size: clamp(2.25rem, 5.5vw, 3.5rem);
    font-weight: 700;
    color: var(--bg-primary);
    margin-bottom: var(--space-sm);
}

.section-description {
    font-size: 1.0625rem;
    line-height: 1.7;
    color: var(--bg-secondary);
    max-width: 640px;
    margin: 0 auto;
}

/* Skills Grid */
.skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: var(--space-md);
}

.skill-category {
    background: rgba(254, 252, 248, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(254, 252, 248, 0.12);
    border-radius: 18px;
    padding: var(--space-md);
    transition:
        transform 0.4s var(--ease-smooth),
        background 0.4s var(--ease-smooth),
        border-color 0.4s var(--ease-smooth),
        box-shadow 0.4s var(--ease-smooth);
    --x: 50%;
    --y: 50%;
    --rotate-x: 0deg;
    --rotate-y: 0deg;
}

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
    .skill-category:hover {
        background: radial-gradient(circle at var(--x) var(--y), rgba(254, 252, 248, 0.16), rgba(254, 252, 248, 0.05) 60%);
        border-color: rgba(254, 252, 248, 0.24);
        transform: perspective(1000px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)) translateY(-4px);
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.22);
    }
}

/* Category Header */
.category-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid rgba(254, 252, 248, 0.1);
}

.category-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    flex-shrink: 0;
    background: rgba(254, 252, 248, 0.1);
    border-radius: 10px;
    color: var(--accent-tertiary);
    transition:
        background 0.3s var(--ease-smooth),
        color 0.3s var(--ease-smooth),
        transform 0.3s var(--ease-smooth);
}

.category-icon svg {
    width: 18px;
    height: 18px;
}

.skill-category:hover .category-icon {
    background: var(--accent-tertiary);
    color: var(--accent-strong);
    transform: rotate(-4deg);
}

.category-title {
    font-family: var(--font-display);
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--bg-primary);
    margin: 0;
    flex: 1;
    min-width: 0;
}

.category-count {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    color: var(--accent-tertiary);
    background: rgba(254, 252, 248, 0.08);
    border: 1px solid rgba(254, 252, 248, 0.14);
    border-radius: 100px;
    padding: 0.15rem 0.5rem;
    flex-shrink: 0;
}

/* Skills chips */
.skills-chips {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
}

.skill-chip {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    line-height: 1.2;
    padding: 0.4rem 0.75rem;
    background: rgba(254, 252, 248, 0.07);
    border: 1px solid rgba(254, 252, 248, 0.14);
    border-radius: 100px;
    color: var(--bg-secondary);
    transition:
        background 0.25s var(--ease-smooth),
        border-color 0.25s var(--ease-smooth),
        color 0.25s var(--ease-smooth),
        transform 0.25s var(--ease-smooth);
}

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
    .skill-chip:hover {
        background: rgba(254, 252, 248, 0.18);
        border-color: rgba(254, 252, 248, 0.32);
        color: var(--bg-primary);
        transform: translateY(-2px);
    }
}

/* Reveal Animation */
.reveal {
    opacity: 0;
    transform: translateY(40px);
    transition: all 0.8s var(--ease-out);
}

.visible .reveal {
    opacity: 1;
    transform: translateY(0);
}

.delay-1 {
    transition-delay: 0.1s;
}

.visible .skill-category {
    animation: category-reveal 0.6s var(--ease-out) forwards;
    animation-delay: calc(0.2s + var(--index) * 0.08s);
    opacity: 0;
}

@keyframes category-reveal {
    from {
        opacity: 0;
        transform: translateY(28px) scale(0.97);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Responsive */
@media (max-width: 768px) {
    .skills-wrapper {
        padding: var(--space-lg) var(--space-md);
    }
    .section-header {
        margin-bottom: var(--space-md);
    }
    .skills-grid {
        grid-template-columns: 1fr;
        gap: var(--space-sm);
    }
    .category-title {
        font-size: 1.125rem;
    }
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
    .reveal,
    .visible .skill-category {
        opacity: 1 !important;
        transform: none !important;
        animation: none !important;
    }
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
</style>
