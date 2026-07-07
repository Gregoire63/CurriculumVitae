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
    {
        name: 'Malt',
        url: 'https://www.malt.fr/profile/gregoireraturat',
        icon: 'M20.195 8.581c-.069 0-.285.026-.484.113-.432.181-.597.311-.597.58v5.023c0 .277.26.355.735.355.467 0 .649-.087.649-.355V8.858c0-.173-.113-.277-.303-.277zm3.502 4.903c-.345.087-.45.113-.57.113-.147 0-.2-.044-.2-.2v-2.161h.788c.207 0 .285-.078.285-.285 0-.173-.078-.26-.285-.26h-.787v-.839c0-.259-.087-.363-.268-.363-.173 0-.415.156-.934.597-.528.45-.83.744-.83.951 0 .121.086.199.224.199h.424v2.335c0 .683.337 1.08.925 1.08.39 0 .675-.146 1.012-.406.311-.242.51-.432.51-.596 0-.139-.103-.217-.294-.165zm-15.21-3.078c-.13 0-.285.026-.484.112-.433.19-.597.312-.597.58v3.2c0 .276.26.354.735.354.467 0 .649-.087.649-.355v-3.614c0-.173-.113-.277-.303-.277Zm1.816 0c-.355 0-.675.121-.986.363-.173.138-.32.294-.32.424 0 .112.078.173.19.173.19 0 .251-.078.416-.078.164 0 .25.173.25.476v2.533c0 .277.26.355.735.355.467 0 .649-.087.649-.355v-2.776c0-.657-.39-1.115-.934-1.115zm2.43 0c-.337 0-.692.121-1.003.363-.173.138-.32.294-.32.424 0 .112.078.173.19.173.19 0 .25-.078.432-.078s.268.173.268.476v2.533c0 .277.26.355.735.355.467 0 .649-.087.649-.355v-2.776c0-.657-.39-1.115-.951-1.115zm5.335 0a1.29 1.29 0 0 0-.484.112c-.26.113-.398.2-.467.312-.26-.303-.597-.398-.977-.398-1.116 0-1.911.942-1.911 2.283 0 1.124.605 1.954 1.461 1.954.26 0 .493-.104.77-.363.216-.2.32-.329.32-.45a.14.14 0 0 0-.147-.147c-.121 0-.251.104-.416.104-.354 0-.596-.545-.596-1.35 0-.803.32-1.348.804-1.348.32 0 .562.242.562.657v2.525c0 .277.26.355.735.355.467 0 .649-.087.649-.355v-3.614c0-.173-.113-.277-.303-.277ZM3.499 13.563l-.21.21.619.618c.304.304.79.598 1.244.144.339-.34.26-.695.073-.98-.06.004-1.726.008-1.726.008zm-.963-2.325.21-.21-.608-.607c-.304-.303-.765-.621-1.243-.143-.351.35-.273.692-.087.97Zm2.86.416c-.037.043-1.511 1.524-1.511 1.524h1.154c.43 0 .981-.101.981-.777 0-.496-.296-.683-.624-.747zm-3.244-.031H.981c-.43 0-.981.135-.981.778 0 .479.307.676.641.745.04-.046 1.511-1.523 1.511-1.523zm1.484 3.04-.618-.618-.608.607a2.613 2.613 0 0 1-.137.128c.07.333.266.639.745.639s.676-.307.745-.641c-.043-.037-.085-.073-.127-.115zM2.41 10.15l.608.607.618-.618a2.25 2.25 0 0 1 .128-.118c-.065-.327-.251-.623-.747-.623s-.682.297-.746.625c.046.04.092.08.14.127zm2.742.117c-.455-.454-.94-.16-1.244.144l-2.87 2.87c-.303.303-.621.765-.143 1.243.478.478.94.16 1.243-.143l2.87-2.87c.304-.304.598-.79.144-1.244Z',
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
                        <p class="footer-tagline">Product Engineer Full-Stack</p>
                    </div>
                </div>

                <!-- Quick links -->
                <div class="footer-links">
                    <h4 class="footer-heading">
                        {{ store.isFrench ? 'Navigation' : 'Navigation' }}
                    </h4>
                    <nav class="footer-nav">
                        <button
                            v-for="section in store.sections"
                            :key="section.id"
                            @click="store.navigateToSection(section.id)"
                        >
                            {{ section.label }}
                        </button>
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
