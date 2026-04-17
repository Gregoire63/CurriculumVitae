<script setup lang="ts">
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()

const currentYear = new Date().getFullYear()

const socialLinks = [
    {
        name: 'GitHub',
        url: 'https://github.com/Gregoire63',
        icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
    },
    {
        name: 'LinkedIn',
        url: 'https://www.linkedin.com/in/grégoire-raturat-b671091aa/',
        icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z',
    },
]
</script>

<template>
    <footer class="portfolio-footer">
        <div class="footer-container">
            <!-- Footer top -->
            <div class="footer-top">
                <!-- Brand -->
                <div class="footer-brand">
                    <svg viewBox="0 0 240 219" xmlns="http://www.w3.org/2000/svg" class="footer-logo">
                        <g transform="translate(0, 219) scale(0.1, -0.1)">
                            <path
                                d="M5 2178 c-3 -7 -4 -497 -3 -1088 l3 -1075 79 -3 79 -3 625 623 c344 343 668 667 721 721 l95 98 -54 54 -54 55 -438 0 -439 0 3 -147 3 -148 173 -3 c129 -2 172 -6 172 -15 0 -12 -632 -638 -651 -645 -5 -2 -8 261 -7 635 l3 638 418 1 c230 1 421 4 424 8 4 4 -60 74 -142 156 l-150 150 -428 0 c-333 0 -429 -3 -432 -12z"
                            />
                            <path
                                d="M1330 2183 c0 -5 162 -170 361 -369 316 -316 360 -364 351 -380 -6 -11 -324 -331 -706 -713 -383 -381 -693 -697 -690 -702 3 -5 93 -9 200 -9 188 1 195 2 221 24 16 13 138 135 273 271 135 135 253 251 264 257 16 9 56 -27 300 -271 l282 -282 99 3 100 3 3 110 2 110 -275 275 c-151 151 -275 280 -275 285 0 6 124 134 275 285 l275 274 0 96 0 95 -323 323 -322 322 -208 0 c-114 0 -207 -3 -207 -7z"
                            />
                        </g>
                    </svg>
                    <div class="footer-text">
                        <h3 class="footer-name">Grégoire Raturat</h3>
                        <p class="footer-tagline">
                            {{ store.isFrench ? 'Développeur Full Stack' : 'Full Stack Developer' }}
                        </p>
                    </div>
                </div>

                <!-- Quick links -->
                <div class="footer-links">
                    <h4 class="footer-heading">
                        {{ store.isFrench ? 'Navigation' : 'Navigation' }}
                    </h4>
                    <nav class="footer-nav">
                        <button @click="store.navigateToSection('hero')">
                            {{ store.isFrench ? 'Accueil' : 'Home' }}
                        </button>
                        <button @click="store.navigateToSection('about')">
                            {{ store.isFrench ? 'À propos' : 'About' }}
                        </button>
                        <button @click="store.navigateToSection('skills')">
                            {{ store.isFrench ? 'Compétences' : 'Skills' }}
                        </button>
                        <button @click="store.navigateToSection('portfolio')">Portfolio</button>
                        <button @click="store.navigateToSection('contact')">Contact</button>
                    </nav>
                </div>

                <!-- Legal -->
                <div class="footer-links">
                    <h4 class="footer-heading">{{ store.isFrench ? 'Légal' : 'Legal' }}</h4>
                    <nav class="footer-nav">
                        <button @click="store.setPrivacyPolicyOpen(true)">
                            {{ store.isFrench ? 'Politique de confidentialité' : 'Privacy Policy' }}
                        </button>
                        <button @click="store.setPrivacyPolicyOpen(true)">
                            {{ store.isFrench ? 'Mentions légales' : 'Legal Notice' }}
                        </button>
                        <a href="/cv/CV_Gregoire_Raturat.pdf" target="_blank">
                            {{ store.isFrench ? 'Télécharger CV' : 'Download Resume' }}
                        </a>
                    </nav>
                </div>

                <!-- Social -->
                <div class="footer-links">
                    <h4 class="footer-heading">{{ store.isFrench ? 'Suivez-moi' : 'Follow me' }}</h4>
                    <div class="footer-social">
                        <a
                            v-for="social in socialLinks"
                            :key="social.name"
                            :href="social.url"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="social-icon"
                            :aria-label="social.name"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path :d="social.icon" />
                            </svg>
                        </a>
                    </div>
                </div>
            </div>

            <!-- Footer bottom -->
            <div class="footer-bottom">
                <p class="copyright">
                    © {{ currentYear }} Grégoire Raturat.
                    {{ store.isFrench ? 'Tous droits réservés.' : 'All rights reserved.' }}
                </p>
            </div>
        </div>
    </footer>
</template>

<style scoped>
.portfolio-footer {
    position: relative;
    width: 100%;
    background: linear-gradient(135deg, var(--text-primary) 0%, #2a2826 100%);
    color: var(--bg-primary);
    padding: var(--space-xl) var(--space-lg) var(--space-lg);
}

.footer-container {
    max-width: 1400px;
    margin: 0 auto;
}

/* Footer top */
.footer-top {
    display: grid;
    grid-template-columns: 2fr repeat(3, 1fr);
    gap: var(--space-xl);
    padding-bottom: var(--space-xl);
    border-bottom: 1px solid rgba(254, 252, 248, 0.1);
    margin-bottom: var(--space-lg);
}

/* Brand */
.footer-brand {
    display: flex;
    align-items: flex-start;
    gap: var(--space-md);
}

.footer-logo {
    width: 50px;
    height: 45px;
    fill: var(--accent-primary);
    flex-shrink: 0;
    transition: fill 0.3s ease;
}

.footer-brand:hover .footer-logo {
    fill: var(--bg-primary);
}

.footer-text {
    flex: 1;
}

.footer-name {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--bg-primary);
    margin: 0 0 var(--space-xs) 0;
}

.footer-tagline {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--bg-secondary);
    margin: 0;
}

/* Links */
.footer-links {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.footer-heading {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--accent-primary);
    font-weight: 700;
    margin: 0;
}

.footer-nav {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.footer-nav button,
.footer-nav a {
    font-family: var(--font-body);
    font-size: 0.9375rem;
    color: var(--bg-secondary);
    background: none;
    border: none;
    padding: 0;
    text-align: left;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: inline-block;
    width: fit-content;
}

@media (prefers-reduced-motion: no-preference) {
    .footer-nav button:hover,
    .footer-nav a:hover {
        color: var(--bg-primary);
        transform: translateX(4px);
    }
}

/* Social */
.footer-social {
    display: flex;
    gap: var(--space-sm);
}

.social-icon {
    width: 40px;
    height: 40px;
    background: rgba(254, 252, 248, 0.1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--bg-secondary);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    text-decoration: none;
}

.social-icon svg {
    width: 20px;
    height: 20px;
}

@media (prefers-reduced-motion: no-preference) {
    .social-icon:hover {
        background: var(--accent-primary);
        color: var(--bg-primary);
        transform: translateY(-4px) scale(1.05);
    }
}

/* Footer bottom */
.footer-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-md);
}

.copyright,
.made-with {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--bg-secondary);
    margin: 0;
}

.made-with {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
}

.heart {
    color: #ef4444;
}

@media (prefers-reduced-motion: no-preference) {
    .heart {
        animation: heartbeat 1.5s ease-in-out infinite;
    }

    @keyframes heartbeat {
        0%,
        100% {
            transform: scale(1);
        }
        10%,
        30% {
            transform: scale(1.1);
        }
        20%,
        40% {
            transform: scale(1);
        }
    }
}

/* Responsive */
@media (max-width: 1024px) {
    .footer-top {
        grid-template-columns: 1fr 1fr;
        gap: var(--space-lg);
    }

    .footer-brand {
        grid-column: 1 / -1;
    }
}

@media (max-width: 768px) {
    .portfolio-footer {
        padding: var(--space-lg) var(--space-md);
    }

    .footer-top {
        grid-template-columns: 1fr;
        gap: var(--space-lg);
    }

    .footer-bottom {
        flex-direction: column;
        text-align: center;
        gap: var(--space-xs);
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
