<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { usePortfolioStore, type SectionName } from '~/stores/portfolio'

const store = usePortfolioStore()
const prefersReducedMotion = usePreferredReducedMotion()
const { gtag } = useGtag()

const handleNavigate = (section: SectionName) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'navigation', {
            event_category: 'engagement',
            event_label: section,
        })
    }
    store.navigateToSection(section)
}

const openPrivacyPolicy = () => {
    store.setPrivacyPolicyOpen(true)
    store.setMenuOpen(false)
}
</script>

<template>
    <Transition name="menu">
        <div v-if="store.isMenuOpen" class="menu-overlay" @click="store.setMenuOpen(false)">
            <div class="menu-panel" @click.stop>
                <!-- Menu Header -->
                <div class="menu-header">
                    <div class="menu-logo">
                        <span class="logo-initial">GR</span>
                    </div>
                    <button class="menu-close" aria-label="Close menu" @click="store.setMenuOpen(false)">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M18 6L6 18M6 6L18 18"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                            />
                        </svg>
                    </button>
                </div>

                <!-- Menu Navigation avec animations stagger -->
                <nav class="menu-nav">
                    <button
                        v-for="(section, index) in store.sections"
                        :key="section.id"
                        v-motion
                        :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -30 }"
                        :enter="
                            prefersReducedMotion
                                ? { opacity: 1 }
                                : {
                                      opacity: 1,
                                      x: 0,
                                      transition: {
                                          type: 'spring',
                                          stiffness: 100,
                                          damping: 20,
                                          delay: 0.1 + index * 0.08,
                                      },
                                  }
                        "
                        class="menu-link"
                        :class="{ active: store.currentSection === section.id }"
                        @click="handleNavigate(section.id)"
                    >
                        <span class="menu-number">{{ section.number }}</span>
                        <span class="menu-label">{{ section.label }}</span>
                        <svg class="menu-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M5 12H19M19 12L12 5M19 12L12 19"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>

                    <!-- Privacy Policy Button -->
                    <button
                        v-motion
                        :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -30 }"
                        :enter="
                            prefersReducedMotion
                                ? { opacity: 1 }
                                : {
                                      opacity: 1,
                                      x: 0,
                                      transition: {
                                          type: 'spring',
                                          stiffness: 100,
                                          damping: 20,
                                          delay: 0.1 + store.sections.length * 0.08,
                                      },
                                  }
                        "
                        class="menu-link"
                        @click="openPrivacyPolicy"
                    >
                        <span class="menu-number">06</span>
                        <span class="menu-label">{{ store.isFrench ? 'Confidentialité' : 'Privacy' }}</span>
                        <svg class="menu-arrow" width="24" height="24" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M5 12H19M19 12L12 5M19 12L12 19"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </button>
                </nav>

                <!-- Menu Footer -->
                <div class="menu-footer">
                    <p class="menu-tagline">
                        {{
                            store.isFrench
                                ? 'Transformons vos idées en réalité'
                                : "Let's transform your ideas into reality"
                        }}
                    </p>

                    <button class="lang-switcher" @click="store.toggleLanguage">
                        <span class="current-lang">{{ store.language.toUpperCase() }}</span>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
                                stroke="currentColor"
                                stroke-width="2"
                            />
                            <path
                                d="M2 12H22M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z"
                                stroke="currentColor"
                                stroke-width="2"
                            />
                        </svg>
                        <span class="next-lang">{{ store.language === 'fr' ? 'EN' : 'FR' }}</span>
                    </button>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
/* Menu Overlay */
.menu-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    background: rgba(42, 40, 38, 0.95);
    backdrop-filter: blur(20px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-md);
    overflow: hidden;
}

.menu-panel {
    position: relative;
    max-width: 600px;
    width: 100%;
    max-height: calc(100dvh - 2rem);
    background: var(--bg-primary);
    border-radius: 32px;
    padding: clamp(1rem, 4vw, 3rem);
    display: flex;
    flex-direction: column;
    gap: clamp(0.5rem, 2vw, 2rem);
    overflow: hidden;
}

/* Menu Header */
.menu-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: var(--space-sm);
    border-bottom: 1px solid var(--bg-accent);
    flex-shrink: 0;
}

.menu-logo {
    width: clamp(40px, 8vw, 50px);
    height: clamp(40px, 8vw, 50px);
    background: var(--accent-primary);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.logo-initial {
    font-family: var(--font-display);
    font-size: clamp(1.25rem, 3vw, 1.5rem);
    font-weight: 700;
    color: var(--bg-primary);
}

.menu-close {
    width: 40px;
    height: 40px;
    background: var(--bg-secondary);
    border: none;
    border-radius: 50%;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.3s ease;
    flex-shrink: 0;
}

@media (prefers-reduced-motion: no-preference) {
    .menu-close:hover {
        background: var(--accent-primary);
        color: var(--bg-primary);
        transform: rotate(90deg) scale(1.05);
    }
}

/* Menu Navigation */
.menu-nav {
    display: flex;
    flex-direction: column;
    gap: clamp(0.25rem, 1vw, 0.5rem);
    flex: 1;
    min-height: 0;
    justify-content: center;
}

.menu-link {
    display: flex;
    align-items: center;
    gap: clamp(0.5rem, 2vw, 1rem);
    padding: clamp(0.5rem, 2vw, 1rem) clamp(0.75rem, 3vw, 1.5rem);
    background: transparent;
    border: none;
    border-radius: 16px;
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.3s ease;
    text-align: left;
    flex-shrink: 0;
}

@media (prefers-reduced-motion: no-preference) {
    .menu-link:hover,
    .menu-link.active {
        background: var(--bg-secondary);
    }

    .menu-link.active {
        background: var(--accent-tertiary);
    }
}

.menu-number {
    font-family: var(--font-mono);
    font-size: clamp(0.75rem, 1.5vw, 0.875rem);
    font-weight: 700;
    color: var(--accent-primary);
    min-width: clamp(24px, 5vw, 30px);
    flex-shrink: 0;
}

.menu-label {
    font-family: var(--font-display);
    font-size: clamp(1.25rem, 3.5vw, 1.75rem);
    font-weight: 600;
    color: var(--text-primary);
    flex: 1;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

@media (prefers-reduced-motion: no-preference) {
    .menu-link:hover .menu-label {
        transform: translateX(8px);
    }
}

.menu-arrow {
    color: var(--accent-primary);
    opacity: 0;
    transform: translateX(-10px);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    flex-shrink: 0;
    width: 24px;
    height: 24px;
}

@media (prefers-reduced-motion: no-preference) {
    .menu-link:hover .menu-arrow,
    .menu-link.active .menu-arrow {
        opacity: 1;
        transform: translateX(0);
    }
}

/* Menu Footer */
.menu-footer {
    padding-top: var(--space-sm);
    border-top: 1px solid var(--bg-accent);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-sm);
    flex-shrink: 0;
    flex-wrap: wrap;
}

.menu-tagline {
    font-family: var(--font-mono);
    font-size: clamp(0.7rem, 1.5vw, 0.875rem);
    color: var(--text-secondary);
    margin: 0;
    flex: 1 1 auto;
    min-width: 0;
}

.lang-switcher {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    padding: var(--space-xs) var(--space-md);
    background: var(--bg-secondary);
    border: 1px solid var(--bg-accent);
    border-radius: 20px;
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-primary);
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.3s ease,
        border-color 0.3s ease;
    flex-shrink: 0;
}

@media (prefers-reduced-motion: no-preference) {
    .lang-switcher:hover {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
        color: var(--bg-primary);
        transform: scale(1.05);
    }

    .lang-switcher:hover .current-lang {
        color: var(--bg-primary);
    }
}

.lang-switcher svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.current-lang {
    color: var(--accent-primary);
    transition: color 0.3s ease;
}

.next-lang {
    opacity: 0.5;
}

/* Transitions */
.menu-enter-active,
.menu-leave-active {
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}

.menu-enter-active .menu-panel,
.menu-leave-active .menu-panel {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.menu-enter-from,
.menu-leave-to {
    opacity: 0;
}

.menu-enter-from .menu-panel {
    opacity: 0;
    transform: scale(0.95) translateY(-20px);
}

.menu-leave-to .menu-panel {
    opacity: 0;
    transform: scale(0.95) translateY(20px);
}

/* Responsive */
@media (max-width: 768px) {
    .menu-overlay {
        padding: var(--space-sm);
    }

    .menu-panel {
        padding: clamp(1rem, 3vw, 1.5rem);
        border-radius: 24px;
        max-height: calc(100dvh - 1rem);
    }
}

@media (max-width: 480px) {
    .menu-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-xs);
    }
}

@media (max-height: 600px) {
    .menu-panel {
        gap: 0.5rem;
    }

    .menu-link {
        padding: 0.375rem 0.75rem;
    }

    .menu-header,
    .menu-footer {
        padding-bottom: 0.5rem;
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
