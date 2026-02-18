<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const isVisible = ref(false)

interface Skill {
    category: string
    skills: string[]
}

const skillsData = computed<Skill[]>(() => [
    {
        category: 'Backend',
        skills: [
            'Node.js (Express)',
            'REST API Design',
            'PostgreSQL',
            'MongoDB',
            '.NET',
            'API Integration',
            'Authentication & RBAC',
        ],
    },
    {
        category: 'Frontend',
        skills: [
            'Vue.js / Nuxt',
            'React / Next.js',
            'TypeScript',
            'HTML5/CSS3',
            'Component Architecture',
            'Performance Optimization',
            'HTML5 / CSS3',
            'OpenLayers',
        ],
    },
    {
        category: store.isFrench ? 'Testing' : 'Testing',
        skills: [
            store.isFrench ? 'Vitest (unitaires, intégration)' : 'Vitest (unit, integration)',
            'Cypress (E2E)',
            store.isFrench ? 'Stratégie de tests' : 'Testing Strategy',
        ],
    },
    {
        category: 'DevOps & Tools',
        skills: [
            'Git (workflow, code review)',
            'GitLab CI/CD',
            'GitLab Runner',
            'Docker',
            'Nginx',
            'Private npm Packages',
            'CLI Tooling (Node.js)',
            'Versioning & Release Management',
            'Linux',
        ],
    },
    {
        category: store.isFrench ? 'Architecture & Engineering' : 'Architecture & Engineering',
        skills: [
            store.isFrench ? 'Refactoring & réduction de dette technique' : 'Refactoring & Technical Debt Reduction',
            store.isFrench ? 'Architecture modulaire' : 'Modular Architecture',
            store.isFrench ? 'Industrialisation des projets' : 'Project Industrialization',
            store.isFrench ? 'Standardisation des structures projets' : 'Project Structure Standardization',
            store.isFrench ? 'Automatisation & Scaffolding' : 'Automation & Scaffolding',
        ],
    },
    {
        category: store.isFrench ? 'Méthodologie & Soft Skills' : 'Methodology & Soft Skills',
        skills: [
            'Agile (Scrum/Kanban)',
            store.isFrench ? 'Communication technique claire' : 'Clear Technical Communication',
            store.isFrench ? 'Résolution de problèmes complexes' : 'Complex Problem Solving',
            store.isFrench ? 'Esprit analytique' : 'Analytical Mindset',
            store.isFrench ? 'Collaboration inter-équipes' : 'Cross-team Collaboration',
            store.isFrench ? 'Proactivité' : 'Proactiveness',
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
        { threshold: 0.15 },
    )

    const section = document.querySelector('.skills-wrapper')
    if (section) {
        observer.observe(section)
    } else {
        isVisible.value = true
    }

    // Animation 3D au hover (comme les diplômes)
    const skillCards = document.querySelectorAll('.skill-category')
    const setHoverData = (e: MouseEvent, card: Element) => {
        const rect = card.getBoundingClientRect()
        const xPercentage = ((e.clientX - rect.left) / rect.width) * 100
        const yPercentage = ((e.clientY - rect.top) / rect.height) * 100

        const rotateX = (yPercentage - 50) / 20
        const rotateY = (50 - xPercentage) / 20

        const htmlCard = card as HTMLElement
        htmlCard.style.setProperty('--x', `${xPercentage}%`)
        htmlCard.style.setProperty('--y', `${yPercentage}%`)
        htmlCard.style.setProperty('--rotate-x', `${rotateX}deg`)
        htmlCard.style.setProperty('--rotate-y', `${rotateY}deg`)
    }

    skillCards.forEach((card) => {
        card.addEventListener('mouseenter', (e) => {
            setHoverData(e as MouseEvent, card)
        })

        card.addEventListener('mousemove', (e) => {
            setHoverData(e as MouseEvent, card)
        })

        card.addEventListener('mouseleave', () => {
            const htmlCard = card as HTMLElement
            htmlCard.style.setProperty('--rotate-x', '0deg')
            htmlCard.style.setProperty('--rotate-y', '0deg')
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
                    {{ store.isFrench ? 'Compétences Techniques' : 'Technical Skills' }}
                </h2>
                <p class="section-description">
                    {{
                        store.isFrench
                            ? 'Un ensemble de technologies et méthodologies maîtrisées pour créer des solutions complètes et performantes.'
                            : 'A set of mastered technologies and methodologies to create complete and efficient solutions.'
                    }}
                </p>
            </div>

            <!-- Skills Grid -->
            <div class="skills-grid">
                <div
                    v-for="(skillGroup, index) in skillsData"
                    :key="index"
                    class="skill-category reveal"
                    :style="{ '--index': index }"
                >
                    <div class="category-header">
                        <div class="category-icon">
                            <div class="icon-dot"></div>
                        </div>
                        <h3 class="category-title">{{ skillGroup.category }}</h3>
                    </div>

                    <div class="skills-list">
                        <div
                            v-for="(skill, skillIndex) in skillGroup.skills"
                            :key="skillIndex"
                            class="skill-item"
                            :style="{ '--skill-index': skillIndex }"
                        >
                            <div class="skill-marker"></div>
                            <span class="skill-name">{{ skill }}</span>
                        </div>
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
    color: var(--bg-accent);
    margin-bottom: var(--space-sm);
}

.label-line {
    width: 30px;
    height: 2px;
    background: var(--bg-accent);
}

.section-title {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 700;
    color: var(--bg-primary);
    margin-bottom: var(--space-md);
}

.section-description {
    font-size: 1.125rem;
    line-height: 1.8;
    color: var(--bg-secondary);
    max-width: 700px;
    margin: 0 auto;
}

/* Skills Grid */
.skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: var(--space-lg);
}

.skill-category {
    background: rgba(254, 252, 248, 0.05);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(254, 252, 248, 0.1);
    border-radius: 20px;
    padding: var(--space-lg);
    transition: all 0.4s var(--ease-smooth);
    --x: 50%;
    --y: 50%;
    --rotate-x: 0deg;
    --rotate-y: 0deg;
}

.skill-category:hover {
    background: radial-gradient(circle at var(--x) var(--y), rgba(254, 252, 248, 0.15), rgba(254, 252, 248, 0.05) 60%);
    border-color: rgba(254, 252, 248, 0.2);
    transform: perspective(1000px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)) translateY(-4px);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
}

/* Category Header */
.category-header {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid rgba(254, 252, 248, 0.1);
}

.category-icon {
    width: 40px;
    height: 40px;
    background: rgba(254, 252, 248, 0.1);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s var(--ease-smooth);
}

.skill-category:hover .category-icon {
    background: var(--accent-secondary);
    transform: rotate(5deg) scale(1.05);
}

.icon-dot {
    width: 12px;
    height: 12px;
    background: var(--bg-primary);
    border-radius: 50%;
    transition: all 0.3s var(--ease-smooth);
}

.skill-category:hover .icon-dot {
    background: var(--accent-primary);
    transform: scale(1.2);
}

.category-title {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--bg-primary);
    margin: 0;
}

/* Skills List */
.skills-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.skill-item {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-xs) 0;
    opacity: 0;
    transform: translateX(-20px);
    animation: skill-appear 0.5s var(--ease-out) forwards;
    animation-delay: calc(0.6s + var(--index) * 0.2s + var(--skill-index) * 0.05s);
}

@keyframes skill-appear {
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

.skill-marker {
    width: 6px;
    height: 6px;
    background: var(--accent-secondary);
    border-radius: 50%;
    flex-shrink: 0;
    transition: all 0.3s var(--ease-smooth);
}

.skill-item:hover .skill-marker {
    background: var(--bg-primary);
    transform: scale(1.5);
}

.skill-name {
    font-size: 1rem;
    color: var(--bg-secondary);
    transition: color 0.3s var(--ease-smooth);
}

.skill-item:hover .skill-name {
    color: var(--bg-primary);
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
    animation-delay: calc(0.3s + var(--index) * 0.1s);
    opacity: 0;
}

@keyframes category-reveal {
    from {
        opacity: 0;
        transform: translateY(30px) scale(0.95);
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
        gap: var(--space-md);
    }

    .skill-category {
        padding: var(--space-sm);
        opacity: 1 !important; 
        transform: none !important;
    }
    .category-header {
        margin-bottom: var(--space-sm);
        padding-bottom: var(--space-sm);
    }
    .category-title {
        font-size: 1.25rem;
    }
}
</style>
