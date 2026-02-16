<script setup lang="ts">
import { computed } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()

const isOpen = computed(() => store.isPrivacyPolicyOpen)

const closePolicy = () => {
    store.setPrivacyPolicyOpen(false)
}

const lastUpdate = '08/02/2026'
</script>

<template>
    <Transition name="privacy-modal">
        <div v-if="isOpen" class="privacy-overlay" @click="closePolicy">
            <div class="privacy-card" @click.stop>
                <!-- Close button -->
                <button class="close-button" aria-label="Close" @click="closePolicy">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                    </svg>
                </button>

                <!-- Header -->
                <div class="privacy-header">
                    <span class="section-label">
                        <span class="label-line"></span>
                        {{ store.isFrench ? 'Informations légales' : 'Legal Information' }}
                    </span>
                    <h1 class="section-title">
                        {{ store.isFrench ? 'Politique de Confidentialité' : 'Privacy Policy' }}
                    </h1>
                    <p class="last-update">
                        {{ store.isFrench ? `Dernière mise à jour : ${lastUpdate}` : `Last updated: ${lastUpdate}` }}
                    </p>
                </div>

                <!-- Content -->
                <div class="privacy-content">
                    <!-- Introduction -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '1. Introduction' : '1. Introduction' }}</h2>
                        <p v-if="store.isFrench">
                            Bienvenue sur mon portfolio personnel. Je respecte votre vie privée et m'engage à protéger
                            vos données personnelles. Cette politique de confidentialité vous informe sur la manière
                            dont je collecte, utilise et protège vos informations lorsque vous visitez ce site.
                        </p>
                        <p v-else>
                            Welcome to my personal portfolio. I respect your privacy and am committed to protecting your
                            personal data. This privacy policy informs you about how I collect, use and protect your
                            information when you visit this site.
                        </p>
                    </section>
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '2. Mentions légales' : '2. Legal Notice' }}</h2>

                        <p v-if="store.isFrench">
                            Ce site est édité par un particulier dans le cadre d’un portfolio professionnel.
                        </p>
                        <p v-else>This website is published by an individual as part of a professional portfolio.</p>

                        <ul>
                            <li>
                                <strong>{{ store.isFrench ? 'Éditeur du site' : 'Website owner' }}</strong> :
                                {{ store.isFrench ? 'Raturat Grégoire' : 'Raturat Grégoire' }}
                            </li>
                            <li>
                                <strong>Email</strong> :
                                {{ store.isFrench ? 'via le formulaire de contact' : 'via the contact form' }}
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? 'Hébergement' : 'Hosting' }}</strong> : Netlify, Inc. – San
                                Francisco (USA)
                            </li>
                        </ul>
                    </section>
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '3. Responsable du traitement' : '3. Data Controller' }}</h2>

                        <p v-if="store.isFrench">
                            Le responsable du traitement des données personnelles collectées sur ce site est l’éditeur
                            du site.
                        </p>
                        <p v-else>The data controller for personal data collected on this website is the site owner.</p>
                    </section>
                    <!-- Données collectées -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '4. Données collectées' : '4. Data Collected' }}</h2>

                        <h3>{{ store.isFrench ? '4.1 Formulaire de contact' : '4.1 Contact Form' }}</h3>
                        <p v-if="store.isFrench">
                            Lorsque vous utilisez le formulaire de contact, je collecte les informations suivantes :
                        </p>
                        <p v-else>When you use the contact form, I collect the following information:</p>
                        <ul>
                            <li>{{ store.isFrench ? 'Votre adresse email' : 'Your email address' }}</li>
                            <li>
                                {{ store.isFrench ? 'Le contenu de votre message' : 'The content of your message' }}
                            </li>
                            <li>
                                {{ store.isFrench ? 'Date et heure de soumission' : 'Date and time of submission' }}
                            </li>
                        </ul>

                        <h3>
                            {{
                                store.isFrench
                                    ? '4.2 Données analytiques (Google Analytics)'
                                    : '4.2 Analytics Data (Google Analytics)'
                            }}
                        </h3>
                        <p v-if="store.isFrench">
                            Ce site utilise Google Analytics pour analyser l'utilisation et améliorer l'expérience
                            utilisateur.
                        </p>
                        <p v-else>This site uses Google Analytics to analyze usage and improve user experience.</p>
                        <ul>
                            <li>
                                {{
                                    store.isFrench
                                        ? "Informations techniques : navigateur, système d'exploitation"
                                        : 'Technical information: browser, operating system'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Données de navigation : pages visitées, temps passé'
                                        : 'Browsing data: pages visited, time spent'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Localisation approximative (pays, région)'
                                        : 'Approximate location (country, region)'
                                }}
                            </li>
                        </ul>
                    </section>

                    <!-- Services tiers -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '5. Services tiers utilisés' : '5. Third-party Services' }}</h2>

                        <div class="service-card">
                            <h3>Google Analytics</h3>
                            <p v-if="store.isFrench">Service d'analyse web de Google.</p>
                            <p v-else>Google's web analytics service.</p>
                            <a href="https://policies.google.com/privacy" target="_blank" rel="noopener">
                                {{ store.isFrench ? 'Politique Google' : 'Google Policy' }}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M18 13V19C18 20.1046 17.1046 21 16 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H11M15 3H21M21 3V9M21 3L10 14"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                    />
                                </svg>
                            </a>
                        </div>

                        <div class="service-card">
                            <h3>Netlify Forms</h3>
                            <p v-if="store.isFrench">Service de gestion de formulaires.</p>
                            <p v-else>Form management service.</p>
                            <a href="https://www.netlify.com/privacy/" target="_blank" rel="noopener">
                                {{ store.isFrench ? 'Politique Netlify' : 'Netlify Policy' }}
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M18 13V19C18 20.1046 17.1046 21 16 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H11M15 3H21M21 3V9M21 3L10 14"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                    />
                                </svg>
                            </a>
                        </div>
                    </section>
                    <section class="privacy-section">
                        <h2>
                            {{
                                store.isFrench
                                    ? '6. Base légale et durée de conservation'
                                    : '6. Legal Basis & Data Retention'
                            }}
                        </h2>

                        <p v-if="store.isFrench">
                            Les données personnelles sont collectées sur la base de votre consentement explicite,
                            conformément à l’article 6 du RGPD.
                        </p>
                        <p v-else>
                            Personal data is collected based on your explicit consent, in accordance with Article 6 of
                            the GDPR.
                        </p>

                        <ul>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Données du formulaire : conservées 12 mois maximum'
                                        : 'Contact form data: stored for up to 12 months'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Données analytiques : conservées selon la politique Google Analytics'
                                        : 'Analytics data: retained according to Google Analytics policy'
                                }}
                            </li>
                        </ul>
                    </section>

                    <!-- Vos droits -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '7. Vos droits (RGPD)' : '7. Your Rights (GDPR)' }}</h2>
                        <p v-if="store.isFrench">Conformément au RGPD, vous disposez des droits suivants :</p>
                        <p v-else>In accordance with GDPR, you have the following rights:</p>
                        <ul>
                            <li>
                                <strong>{{ store.isFrench ? "Droit d'accès" : 'Right of access' }}</strong> :
                                {{ store.isFrench ? 'obtenir une copie de vos données' : 'obtain a copy of your data' }}
                            </li>
                            <li>
                                <strong>{{
                                    store.isFrench ? 'Droit de rectification' : 'Right to rectification'
                                }}</strong>
                                : {{ store.isFrench ? 'corriger vos données' : 'correct your data' }}
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? "Droit à l'effacement" : 'Right to erasure' }}</strong> :
                                {{ store.isFrench ? 'demander la suppression' : 'request deletion' }}
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? "Droit d'opposition" : 'Right to object' }}</strong> :
                                {{ store.isFrench ? 'vous opposer au traitement' : 'object to processing' }}
                            </li>
                        </ul>

                        <p v-if="store.isFrench">
                            Pour exercer ces droits, contactez-moi via le
                            <a href="#" @click.prevent="(closePolicy(), store.navigateToSection('contact'))">
                                formulaire de contact
                            </a>
                            .
                        </p>
                        <p v-else>
                            To exercise these rights, contact me via the
                            <a href="#" @click.prevent="(closePolicy(), store.navigateToSection('contact'))">
                                contact form
                            </a>
                            .
                        </p>
                    </section>

                    <!-- Cookies -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '8. Cookies' : '8. Cookies' }}</h2>
                        <p v-if="store.isFrench">
                            Ce site utilise des cookies pour Google Analytics. Vous pouvez les désactiver via les
                            paramètres de votre navigateur ou en utilisant des extensions (uBlock Origin, Privacy
                            Badger).
                        </p>
                        <p v-else>
                            This site uses cookies for Google Analytics. You can disable them via your browser settings
                            or using extensions (uBlock Origin, Privacy Badger).
                        </p>
                    </section>

                    <!-- Contact -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '9. Contact' : '9. Contact' }}</h2>
                        <p v-if="store.isFrench">
                            Pour toute question, contactez-moi via le
                            <a href="#" @click.prevent="(closePolicy(), store.navigateToSection('contact'))">
                                formulaire de contact
                            </a>
                            .
                        </p>
                        <p v-else>
                            For any questions, contact me via the
                            <a href="#" @click.prevent="(closePolicy(), store.navigateToSection('contact'))">
                                contact form
                            </a>
                            .
                        </p>
                    </section>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
/* Modal overlay */
.privacy-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    background: rgba(42, 40, 38, 0.95);
    backdrop-filter: blur(20px);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    overflow: hidden;
}

/* Privacy card - slide from bottom */
.privacy-card {
    width: 100%;
    position: relative;
    max-width: 1000px;
    max-height: 90vh;
    background: var(--bg-primary);
    border-radius: 32px 32px 0 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* Scrollbar */
.privacy-card::-webkit-scrollbar {
    width: 8px;
}

.privacy-card::-webkit-scrollbar-track {
    background: transparent;
}

.privacy-card::-webkit-scrollbar-thumb {
    background: var(--accent-secondary);
    border-radius: 4px;
}

.privacy-card::-webkit-scrollbar-thumb:hover {
    background: var(--accent-primary);
}

/* Close button */
.close-button {
    position: absolute;
    top: var(--space-md);
    right: var(--space-md);
    width: 44px;
    height: 44px;
    background: var(--bg-secondary);
    border: 1px solid var(--bg-accent);
    border-radius: 50%;
    color: var(--text-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    z-index: 10;
}

@media (prefers-reduced-motion: no-preference) {
    .close-button:hover {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
        color: var(--bg-primary);
        transform: rotate(90deg) scale(1.08);
    }
}

/* Header */
.privacy-header {
    padding: var(--space-lg);
    padding-block: 10px;
    border-bottom: 2px solid var(--accent-tertiary);
    background: var(--bg-primary);
    flex-shrink: 0;
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
    font-size: clamp(1rem, 4vw, 2rem);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--space-sm);
}

.last-update {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--text-muted);
}

/* Content */
.privacy-content {
    padding: var(--space-xl);
    overflow-y: auto;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
}

.privacy-section {
    background: var(--bg-secondary);
    border-radius: 16px;
    padding: var(--space-lg);
    border: 1px solid var(--bg-accent);
}

.privacy-section h2 {
    font-family: var(--font-display);
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--space-md);
    padding-bottom: var(--space-sm);
    border-bottom: 2px solid var(--accent-tertiary);
}

.privacy-section h3 {
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: var(--space-md) 0 var(--space-sm) 0;
}

.privacy-section p {
    font-size: 1rem;
    line-height: 1.8;
    color: var(--text-secondary);
    margin-bottom: var(--space-sm);
}

.privacy-section ul {
    list-style: none;
    padding: 0;
    margin: var(--space-md) 0;
}

.privacy-section li {
    position: relative;
    padding-left: var(--space-md);
    margin-bottom: var(--space-xs);
    color: var(--text-secondary);
    line-height: 1.8;
}

.privacy-section li::before {
    content: '▸';
    position: absolute;
    left: 0;
    color: var(--accent-primary);
    font-weight: bold;
}

.privacy-section a {
    color: var(--accent-primary);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.3s ease;
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.privacy-section a:hover {
    color: var(--text-primary);
    text-decoration: underline;
}

/* Service cards */
.service-card {
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 12px;
    padding: var(--space-md);
    margin: var(--space-sm) 0;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: no-preference) {
    .service-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
        border-color: var(--accent-secondary);
    }
}

.service-card h3 {
    margin-top: 0;
    color: var(--accent-primary);
}

/* Transitions */
.privacy-modal-enter-active,
.privacy-modal-leave-active {
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}

.privacy-modal-enter-active .privacy-card,
.privacy-modal-leave-active .privacy-card {
    transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.privacy-modal-enter-from,
.privacy-modal-leave-to {
    opacity: 0;
}

.privacy-modal-enter-from .privacy-card {
    transform: translateY(100%);
}

.privacy-modal-leave-to .privacy-card {
    transform: translateY(100%);
}

/* Responsive */
@media (max-width: 768px) {
    .privacy-card {
        max-height: 95vh;
        border-radius: 24px 24px 0 0;
        padding: var(--space-lg);
        padding-top: calc(var(--space-lg) + 44px + var(--space-sm));
    }

    .close-button {
        top: var(--space-sm);
        right: var(--space-sm);
    }

    .privacy-section {
        padding: var(--space-md);
    }

    .privacy-section h2 {
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
