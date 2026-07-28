<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')
const { gtag } = useGtag()

const headerRef = ref<HTMLElement | null>(null)
const photoRef = ref<HTMLElement | null>(null)
const actionsRef = ref<HTMLElement | null>(null)
const statsRef = ref<HTMLElement | null>(null)

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

    const fadeScale = {
        initial: prefersReducedMotion.value ? { opacity: 0 } : { opacity: 0, scale: 0.95 },
        visibleOnce: prefersReducedMotion.value
            ? { opacity: 1 }
            : {
                  opacity: 1,
                  scale: 1,
                  transition: {
                      type: 'spring',
                      stiffness: 100,
                      damping: 22,
                  },
              },
    }

    useMotion(photoRef, {
        ...fadeScale,
        visibleOnce: { ...fadeScale.visibleOnce, transition: { ...fadeScale.visibleOnce.transition, delay: 0.2 } },
    })
    useMotion(headerRef, {
        ...fadeUp,
        visibleOnce: { ...fadeUp.visibleOnce, transition: { ...fadeUp.visibleOnce.transition, delay: 0.3 } },
    })
    useMotion(actionsRef, {
        ...fadeUp,
        visibleOnce: { ...fadeUp.visibleOnce, transition: { ...fadeUp.visibleOnce.transition, delay: 0.5 } },
    })
    useMotion(statsRef, {
        ...fadeUp,
        visibleOnce: { ...fadeUp.visibleOnce, transition: { ...fadeUp.visibleOnce.transition, delay: 0.6 } },
    })
}
const handleNavigate = (section: SectionName) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'navigation', {
            event_category: 'engagement',
            event_label: section,
        })
    }
    store.navigateToSection(section)
}
</script>

<template>
    <div class="hero-wrapper">
        <div class="hero-grid">
            <!-- Photo Profile -->
            <div ref="photoRef" class="hero-photo">
                <div class="photo-frame">
                    <NuxtImg src="/photoCV.webp" alt="Grégoire Raturat" class="profile-image" loading="eager" fetchpriority="high" sizes="sm:200px md:300px lg:400px" format="webp" quality="80" />
                    <div class="photo-overlay"></div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="hero-content">
                <div ref="headerRef">
                    <div class="hero-label">
                        <span class="label-line"></span>
                        <span class="label-text">{{ store.isFrench ? 'Développeur Full-Stack' : 'Full-Stack Developer' }}</span>
                    </div>

                    <h1 class="hero-title">
                        <span class="title-line">Grégoire</span>
                        <span class="title-line">Raturat</span>
                    </h1>

                    <p class="hero-description">
                        {{
                            store.isFrench
                                ? 'Je conçois et développe des applications web et mobile, de la conception à la mise en production.'
                                : 'I design and build web and mobile applications, from concept to production.'
                        }}
                    </p>

                    <p class="hero-location">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path
                                d="M12 21s-7-5.686-7-11a7 7 0 1 1 14 0c0 5.314-7 11-7 11z"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <circle cx="12" cy="10" r="2.5" stroke="currentColor" stroke-width="2" />
                        </svg>
                        {{ store.isFrench ? 'Basé à Lyon · Remote OK' : 'Based in Lyon, France · Remote OK' }}
                    </p>
                </div>

                <div ref="actionsRef" class="hero-actions">
                    <button class="cta-primary" @click="handleNavigate('cases')">
                        {{ store.isFrench ? 'Voir mes projets' : 'View my work' }}
                    </button>

                    <button class="cta-secondary" @click="handleNavigate('contact')">
                        {{ store.isFrench ? 'Me contacter' : 'Contact me' }}
                    </button>
                </div>

                <!-- Stats -->
                <div ref="statsRef" class="hero-stats">
                    <div class="stat-item">
                        <div class="stat-number">5+</div>
                        <div class="stat-label">
                            {{ store.isFrench ? "Années d'expérience" : 'Years of experience' }}
                        </div>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <div class="stat-number">6+</div>
                        <div class="stat-label">{{ store.isFrench ? 'Projets réalisés' : 'Projects completed' }}</div>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <div class="stat-number">2</div>
                        <div class="stat-label">{{ store.isFrench ? 'Apps en production' : 'Apps in production' }}</div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Decorative Elements -->
        <div class="hero-decoration">
            <div class="decoration-circle circle-1"></div>
            <div class="decoration-circle circle-2"></div>
            <div class="decoration-line line-1"></div>
            <div class="decoration-line line-2"></div>
        </div>
    </div>
</template>

<style scoped>
.hero-wrapper {
    position: relative;
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
    padding: var(--space-xl) var(--space-lg);
    z-index: 1;
}

.hero-grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: var(--space-xl);
    align-items: center;
}

/* Photo */
.hero-photo {
    position: relative;
    z-index: 2;
}

.photo-frame {
    position: relative;
    width: 100%;
    max-width: 400px;
    aspect-ratio: 3 / 4;
    border-radius: 30px;
    overflow: hidden;
    background: var(--accent-tertiary);
    box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.1),
        0 0 0 1px rgba(139, 111, 92, 0.1);
}

.profile-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.6, 1);
}

@media (prefers-reduced-motion: no-preference) {
    .photo-frame:hover .profile-image {
        transform: scale(1.05);
    }
}

.photo-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 60%, rgba(139, 111, 92, 0.3) 100%);
    pointer-events: none;
}

/* Content */
.hero-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.hero-label {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
}

.label-line {
    width: 40px;
    height: 2px;
    background: var(--accent-primary);
}

.label-text {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--accent-primary);
}

.hero-title {
    font-family: var(--font-display);
    font-size: clamp(3rem, 8vw, 5rem);
    font-weight: 700;
    line-height: 1.1;
    color: var(--text-primary);
    margin: 0;
}

.title-line {
    display: block;
    overflow: visible;
}

.hero-description {
    font-size: 1.125rem;
    line-height: 1.8;
    color: var(--text-secondary);
    max-width: 600px;
}

.hero-location {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    margin-top: var(--space-sm);
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
}

.hero-location svg {
    flex-shrink: 0;
    color: var(--accent-primary);
}

/* Actions */
.hero-actions {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-sm);
}

.cta-primary,
.cta-secondary {
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 400;
    padding: var(--space-sm) var(--space-md);
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    align-items: center;
    gap: var(--space-xs);
}

.cta-primary {
    background: var(--accent-primary);
    color: var(--bg-primary);
    border: 2px solid var(--accent-primary);
}

@media (prefers-reduced-motion: no-preference)  and (pointer: fine) {
    .cta-primary:hover {
        background: var(--text-primary);
        border-color: var(--text-primary);
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(139, 111, 92, 0.3);
    }

    .cta-primary svg {
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .cta-primary:hover svg {
        transform: translate(3px, -3px);
    }
}

.cta-secondary {
    background: transparent;
    color: var(--text-primary);
    border: 2px solid var(--accent-secondary);
}

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
    .cta-secondary:hover {
        background: var(--accent-tertiary);
        border-color: var(--accent-primary);
        transform: translateY(-2px);
    }
}

/* Stats */
.hero-stats {
    display: flex;
    gap: var(--space-md);
    margin-top: var(--space-md);
    padding-top: var(--space-md);
    border-top: 1px solid var(--bg-accent);
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
}

.stat-number {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--accent-primary);
    line-height: 1;
}

.stat-label {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
}

.stat-divider {
    width: 1px;
    background: var(--bg-accent);
}

/* Decorative Elements */
.hero-decoration {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
}

.decoration-circle {
    position: absolute;
    border-radius: 50%;
    border: 1px solid var(--accent-tertiary);
    opacity: 0.3;
}

@media (prefers-reduced-motion: no-preference) {
    .circle-1 {
        width: 300px;
        height: 300px;
        top: -100px;
        right: 10%;
        animation: rotate-slow 30s linear infinite;
    }

    .circle-2 {
        width: 200px;
        height: 200px;
        bottom: 10%;
        left: 5%;
        animation: rotate-slow 25s linear infinite reverse;
    }

    @keyframes rotate-slow {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
}

.decoration-line {
    position: absolute;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent-tertiary), transparent);
    opacity: 0.3;
}

.line-1 {
    width: 300px;
    top: 20%;
    right: 0;
    transform: rotate(-15deg);
}

.line-2 {
    width: 250px;
    bottom: 30%;
    left: 0;
    transform: rotate(15deg);
}

/* Responsive */
@media (max-width: 1024px) {
    .hero-grid {
        grid-template-columns: 1fr;
        gap: var(--space-lg);
    }

    .hero-photo {
        max-width: 350px;
        margin: 0 auto;
    }

    .hero-content {
        text-align: center;
        align-items: center;
    }

    .hero-label {
        justify-content: center;
    }

    .hero-description {
        max-width: 500px;
    }

    .hero-location {
        justify-content: center;
    }

    .hero-actions {
        justify-content: center;
    }

    .hero-stats {
        justify-content: center;
    }
}

@media (max-width: 768px) {
    .hero-wrapper {
        padding: var(--space-lg) var(--space-md);
    }

    .hero-title {
        font-size: clamp(2.5rem, 10vw, 4rem);
    }
    .hero-grid {
        gap: var(--space-sm)
    }
    .hero-description {
        font-size: 1rem;
        line-height: 1.6;
    }
    .hero-actions {
        flex-direction: column;
        width: 100%;
        max-width: 340px;
        gap: var(--space-sm);
        margin-top: 0;
    }
    /* Photo réduite pour garder le CTA au-dessus de la ligne de flottaison */
    .hero-photo {
        max-width: 150px;
    }
    .cta-primary,
    .cta-secondary {
        width: 100%;
        justify-content: center;
        text-align: center;
    }

    .hero-stats {
        flex-wrap: wrap;
        gap: var(--space-sm);
    }

    .stat-divider {
        display: none;
    }
}

@media (max-width: 480px) {
    .photo-frame {
        max-width: 280px;
    }

    /* Garde le label sur une seule ligne */
    .label-text {
        font-size: 0.75rem;
    }

    .stat-number {
        font-size: 1.5rem;
    }

    .decoration-circle,
    .decoration-line {
        display: none;
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
