<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

useSEO({
    title: 'Accueil',
    description: 'Portfolio de Grégoire Raturat, développeur Full Stack à Lyon',
    keywords: ['développeur', 'full stack', 'vue.js', 'nuxt', 'lyon'],
})

const store = usePortfolioStore()

// Refs pour les sections
const heroSection = ref<HTMLElement>()
const aboutSection = ref<HTMLElement>()
const skillsSection = ref<HTMLElement>()
const portfolioSection = ref<HTMLElement>()
const contactSection = ref<HTMLElement>()
const cvSection = ref<HTMLElement>()

// Gestion du scroll
const scrollY = ref(0)
const viewportHeight = ref(0)

const handleScroll = () => {
    scrollY.value = window.scrollY

    const sections = [
        { id: 'hero', el: heroSection.value },
        { id: 'about', el: aboutSection.value },
        { id: 'cv', el: cvSection.value },
        { id: 'skills', el: skillsSection.value },
        { id: 'portfolio', el: portfolioSection.value },
        { id: 'contact', el: contactSection.value },
    ].filter((s) => s.el)

    const current = sections.reverse().find((s) => scrollY.value >= s.el!.offsetTop - 120)

    if (current) {
        store.setSection(current.id as any)
    }

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight
    store.setScrollProgress((scrollY.value / maxScroll) * 100)
}

const updateViewportHeight = () => {
    viewportHeight.value = window.innerHeight
}

onMounted(() => {
    updateViewportHeight()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', updateViewportHeight)
    handleScroll()
})

onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll)
    window.removeEventListener('resize', updateViewportHeight)
})

// Parallax effects
const heroParallax = computed(() => {
    const offset = Math.min(scrollY.value * 0.5, 200)
    return `translateY(${offset}px)`
})

// const aboutParallax = computed(() => {
//     const start = viewportHeight.value * 0.5
//     const offset = Math.max(0, (scrollY.value - start) * 0.3)
//     return `translateY(${offset}px)`
// })
</script>

<template>
    <div class="portfolio-wrapper">
        <!-- Navigation -->
        <PortfolioNavigation />

        <!-- Hero Section -->
        <section id="hero" ref="heroSection" class="section hero-section">
            <div class="hero-content" :style="{ transform: heroParallax }">
                <PortfolioHero />
            </div>

            <div class="scroll-indicator" :class="{ hidden: scrollY > 100 }">
                <div class="scroll-icon">
                    <span></span>
                </div>
                <p>{{ store.isFrench ? 'Défiler pour découvrir' : 'Scroll to explore' }}</p>
            </div>
        </section>

        <!-- About Section -->
        <section id="about" ref="aboutSection" class="section about-section">
            <div class="section-background">
                <div class="geometric-shape shape-1"></div>
                <div class="geometric-shape shape-2"></div>
            </div>
            <PortfolioAbout />
        </section>
        <section id="cv" ref="cvSection" class="section cv-section">
            <PortfolioCv />
        </section>
        <!-- Skills Section -->
        <section id="skills" ref="skillsSection" class="section skills-section">
            <div class="section-background dark">
                <div class="noise-overlay"></div>
            </div>
            <PortfolioSkills />
        </section>
        <!-- Portfolio Section -->
        <section id="portfolio" ref="portfolioSection" class="section portfolio-section">
            <div class="section-background light">
                <div class="grid-pattern"></div>
            </div>
            <PortfolioProjects />
        </section>

        <!-- Contact Section -->
        <section id="contact" ref="contactSection" class="section contact-section">
            <div class="section-background gradient">
                <div class="gradient-orb orb-1"></div>
                <div class="gradient-orb orb-2"></div>
            </div>
            <PortfolioContact />
        </section>

        <PortfolioPrivacyPolicy />

        <!-- Menu Modal -->
        <PortfolioMenu />

        <!-- Project Modal -->
        <PortfolioProjectModal />

        <!-- Scroll Progress -->
        <div class="scroll-progress">
            <div class="scroll-progress-bar" :style="{ width: `${store.scrollProgress}%` }"></div>
        </div>
        <PortfolioFooter />
    </div>
</template>

<style scoped>
.portfolio-wrapper {
    position: relative;
    width: 100%;
}

.section {
    position: relative;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.section-background {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
}

/* Hero Section */
.hero-section {
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}

.hero-content {
    transition: transform 0.1s linear;
    will-change: transform;
}

/* Scroll Indicator */
.scroll-indicator {
    position: absolute;
    bottom: var(--space-lg);
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-sm);
    opacity: 1;
    transition: opacity 0.5s var(--ease-smooth);
    z-index: 10;
}

.scroll-indicator.hidden {
    opacity: 0;
    pointer-events: none;
}

.scroll-icon {
    width: 30px;
    height: 50px;
    border: 2px solid var(--accent-primary);
    border-radius: 20px;
    position: relative;
    animation: bounce 2s infinite;
}

.scroll-icon span {
    position: absolute;
    width: 6px;
    height: 10px;
    background: var(--accent-primary);
    border-radius: 3px;
    top: 8px;
    left: 50%;
    transform: translateX(-50%);
    animation: scroll-down 2s infinite;
}

.scroll-indicator p {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--text-secondary);
}

@keyframes bounce {
    0%,
    100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(10px);
    }
}

@keyframes scroll-down {
    0% {
        opacity: 0;
        top: 8px;
    }
    50% {
        opacity: 1;
    }
    100% {
        opacity: 0;
        top: 28px;
    }
}

/* About Section */
.about-section {
    background: var(--bg-primary);
}

.geometric-shape {
    position: absolute;
    background: var(--accent-tertiary);
    opacity: 0.3;
    border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
    animation: morph 20s infinite alternate;
}

.shape-1 {
    width: 500px;
    height: 500px;
    top: -100px;
    right: -100px;
    animation-delay: 0s;
}

.shape-2 {
    width: 400px;
    height: 400px;
    bottom: -50px;
    left: -50px;
    animation-delay: 2s;
}

@keyframes morph {
    0%,
    100% {
        border-radius: 30% 70% 70% 30% / 30% 30% 70% 70%;
    }
    50% {
        border-radius: 70% 30% 30% 70% / 70% 70% 30% 30%;
    }
}

/* Skills Section */
.skills-section {
    background: var(--accent-primary);
}

.cv-section {
    background: var(--bg-secondary);
}

.section-background.dark {
    background: linear-gradient(180deg, var(--accent-primary) 0%, #6d5745 100%);
}

.noise-overlay {
    width: 100%;
    height: 100%;
    opacity: 0.05;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}

/* Portfolio Section */
.portfolio-section {
    background: var(--bg-secondary);
}

.grid-pattern {
    width: 100%;
    height: 100%;
    opacity: 0.03;
    background-image:
        linear-gradient(var(--accent-primary) 1px, transparent 1px),
        linear-gradient(90deg, var(--accent-primary) 1px, transparent 1px);
    background-size: 50px 50px;
}

/* Contact Section */
.contact-section {
    background: var(--bg-primary);
    min-height: 100vh;
}

.section-background.gradient {
    background:
        radial-gradient(ellipse at top left, var(--accent-tertiary) 0%, transparent 50%),
        radial-gradient(ellipse at bottom right, var(--bg-accent) 0%, transparent 50%);
}

.gradient-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(100px);
    opacity: 0.3;
    animation: float 20s infinite alternate;
}

.orb-1 {
    width: 600px;
    height: 600px;
    background: var(--accent-secondary);
    top: -200px;
    left: -200px;
}

.orb-2 {
    width: 500px;
    height: 500px;
    background: var(--accent-tertiary);
    bottom: -150px;
    right: -150px;
    animation-delay: 3s;
}

@keyframes float {
    0%,
    100% {
        transform: translate(0, 0) scale(1);
    }
    50% {
        transform: translate(50px, 50px) scale(1.1);
    }
}

/* Scroll Progress */
.scroll-progress {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: var(--bg-accent);
    z-index: 9999;
}

.scroll-progress-bar {
    height: 100%;
    background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
    transition: width 0.1s linear;
}

@media (max-width: 768px) {
    .geometric-shape {
        display: none;
    }

    .scroll-indicator {
        bottom: var(--space-md);
    }
}
</style>
