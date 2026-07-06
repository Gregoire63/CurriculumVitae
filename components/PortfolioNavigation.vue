<script setup lang="ts">
import { computed } from 'vue'
import { usePortfolioStore, type SectionName } from '~/stores/portfolio'

const store = usePortfolioStore()

const handleNavClick = (section: SectionName) => {
    store.navigateToSection(section)
}
</script>

<template>
    <nav class="portfolio-nav" :class="{ scrolled: store.scrollProgress > 5 }">
        <div class="nav-container">
            <!-- Logo -->
            <button class="nav-logo" aria-label="Retour à l'accueil" @click="handleNavClick('hero')">
                <svg viewBox="0 0 240 219" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
                    <g transform="translate(0, 219) scale(0.1, -0.1)">
                        <path
                            d="M5 2178 c-3 -7 -4 -497 -3 -1088 l3 -1075 79 -3 79 -3 625 623 c344 343 668 667 721 721 l95 98 -54 54 -54 55 -438 0 -439 0 3 -147 3 -148 173 -3 c129 -2 172 -6 172 -15 0 -12 -632 -638 -651 -645 -5 -2 -8 261 -7 635 l3 638 418 1 c230 1 421 4 424 8 4 4 -60 74 -142 156 l-150 150 -428 0 c-333 0 -429 -3 -432 -12z"
                        />
                        <path
                            d="M1330 2183 c0 -5 162 -170 361 -369 316 -316 360 -364 351 -380 -6 -11 -324 -331 -706 -713 -383 -381 -693 -697 -690 -702 3 -5 93 -9 200 -9 188 1 195 2 221 24 16 13 138 135 273 271 135 135 253 251 264 257 16 9 56 -27 300 -271 l282 -282 99 3 100 3 3 110 2 110 -275 275 c-151 151 -275 280 -275 285 0 6 124 134 275 285 l275 274 0 96 0 95 -323 323 -322 322 -208 0 c-114 0 -207 -3 -207 -7z"
                        />
                    </g>
                </svg>
            </button>

            <!-- Desktop Navigation -->
            <div class="nav-links desktop-only">
                <button
                    v-for="section in store.navSections"
                    :key="section.id"
                    class="nav-link"
                    :class="{ active: store.currentSection === section.id }"
                    @click="handleNavClick(section.id)"
                >
                    {{ section.label }}
                    <span class="nav-link-underline"></span>
                </button>
            </div>

            <!-- Language Toggle & Menu Button -->
            <div class="nav-actions">
                <button
                    class="lang-toggle"
                    :aria-label="store.isFrench ? 'Switch to English' : 'Passer en Français'"
                    @click="store.toggleLanguage"
                >
                    <Transition name="lang-flip" mode="out-in">
                        <span :key="store.language" class="lang-code">{{ store.language.toUpperCase() }}</span>
                    </Transition>
                </button>

                <button
                    class="menu-toggle"
                    :class="{ active: store.isMenuOpen }"
                    aria-label="Toggle menu"
                    @click="store.toggleMenu"
                >
                    <span class="menu-line"></span>
                    <span class="menu-line"></span>
                    <span class="menu-line"></span>
                </button>
            </div>
        </div>
    </nav>
</template>

<style scoped>
.portfolio-nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    padding: var(--space-md) var(--space-lg);
    transition: all 0.4s var(--ease-smooth);
    backdrop-filter: blur(0px);
}

.portfolio-nav.scrolled {
    background: rgba(254, 252, 248, 0.9);
    backdrop-filter: blur(20px);
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    padding: var(--space-sm) var(--space-lg);
}

.nav-container {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-md);
}

/* Logo */
.nav-logo {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    background: none;
    border: none;
    padding: var(--space-xs);
    transition: transform 0.3s var(--ease-bounce);
}

.nav-logo:hover {
    transform: scale(1.05);
}

.logo-svg {
    width: 40px;
    height: 36px;
    fill: var(--accent-primary);
    transition: fill 0.3s var(--ease-smooth);
}

.nav-logo:hover .logo-svg {
    fill: var(--text-primary);
}

.logo-text {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    letter-spacing: -0.02em;
}

/* Desktop Links */
.nav-links {
    display: flex;
    gap: var(--space-md);
}

.nav-link {
    position: relative;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-secondary);
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs) var(--space-sm);
    transition: color 0.3s var(--ease-smooth);
}

.nav-link:hover {
    color: var(--text-primary);
}

.nav-link-underline {
    position: absolute;
    bottom: 0;
    left: 50%;
    width: 0;
    height: 2px;
    background: var(--accent-primary);
    transform: translateX(-50%);
    transition: width 0.3s var(--ease-out);
}

.nav-link:hover .nav-link-underline,
.nav-link.active .nav-link-underline {
    width: 100%;
}

.nav-link.active {
    color: var(--text-primary);
}

/* Actions */
.nav-actions {
    display: flex;
    align-items: center;
    gap: var(--space-md);
}

.lang-toggle {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-primary);
    background: var(--bg-accent);
    border: none;
    border-radius: 20px;
    padding: var(--space-xs) var(--space-sm);
    cursor: pointer;
    transition: all 0.3s var(--ease-smooth);
    perspective: 400px;
    overflow: hidden;
}

.lang-toggle:hover {
    background: var(--accent-primary);
    color: var(--bg-primary);
    transform: scale(1.05);
}

.lang-toggle:active {
    transform: scale(0.92);
    transition-duration: 0.1s;
}

.lang-code {
    display: block;
    transform-origin: center;
    will-change: transform, opacity;
}

/* Flip animation on language change */
.lang-flip-enter-active,
.lang-flip-leave-active {
    transition:
        transform 0.4s var(--ease-bounce),
        opacity 0.25s var(--ease-smooth);
}

.lang-flip-enter-from {
    opacity: 0;
    transform: rotateX(-90deg) translateY(-6px);
}

.lang-flip-leave-to {
    opacity: 0;
    transform: rotateX(90deg) translateY(6px);
}

@media (prefers-reduced-motion: reduce) {
    .lang-flip-enter-active,
    .lang-flip-leave-active {
        transition: opacity 0.15s linear;
    }
    .lang-flip-enter-from,
    .lang-flip-leave-to {
        transform: none;
    }
    .lang-toggle:active {
        transform: none;
    }
}

/* Menu Toggle */
.menu-toggle {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    width: 40px;
    height: 40px;
    background: none;
    border: none;
    cursor: pointer;
    padding: var(--space-xs);
}

.menu-line {
    width: 100%;
    height: 2px;
    background: var(--accent-primary);
    border-radius: 2px;
    transition: all 0.3s var(--ease-smooth);
}

.menu-toggle:hover .menu-line {
    background: var(--text-primary);
}

.menu-toggle.active .menu-line:nth-child(1) {
    transform: translateY(8px) rotate(45deg);
}

.menu-toggle.active .menu-line:nth-child(2) {
    opacity: 0;
    transform: scaleX(0);
}

.menu-toggle.active .menu-line:nth-child(3) {
    transform: translateY(-8px) rotate(-45deg);
}

/* Responsive */
@media (max-width: 768px) {
    .desktop-only {
        display: none;
    }

    .portfolio-nav {
        padding: var(--space-sm) var(--space-md);
    }

    .portfolio-nav.scrolled {
        padding: var(--space-xs) var(--space-md);
    }

    .logo-text {
        font-size: 1.25rem;
    }

    .logo-svg {
        width: 32px;
        height: 29px;
    }
}

@media (max-width: 480px) {
    .nav-actions {
        gap: var(--space-sm);
    }
}
</style>
