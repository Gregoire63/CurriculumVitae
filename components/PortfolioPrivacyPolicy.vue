<script setup lang="ts">
import { computed } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()

const isOpen = computed(() => store.isPrivacyPolicyOpen)

const closePolicy = () => {
    store.setPrivacyPolicyOpen(false)
}

const lastUpdate = '17/02/2026'
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
                            vos données personnelles conformément au Règlement Général sur la Protection des Données
                            (RGPD UE 2016/679) et à la loi Informatique et Libertés du 6 janvier 1978 modifiée. Cette
                            politique vous informe sur la manière dont je collecte, utilise et protège vos informations
                            lorsque vous visitez ce site.
                        </p>
                        <p v-else>
                            Welcome to my personal portfolio. I respect your privacy and am committed to protecting your
                            personal data in accordance with the General Data Protection Regulation (GDPR EU 2016/679)
                            and French Data Protection Law of January 6, 1978 as amended. This policy informs you about
                            how I collect, use and protect your information when you visit this site.
                        </p>
                    </section>

                    <!-- Mentions légales -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '2. Mentions légales' : '2. Legal Notice' }}</h2>

                        <p v-if="store.isFrench">
                            Conformément aux dispositions de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans
                            l'économie numérique, il est précisé aux utilisateurs du site l'identité des différents
                            intervenants dans le cadre de sa réalisation et de son suivi.
                        </p>
                        <p v-else>
                            In accordance with the provisions of Law No. 2004-575 of June 21, 2004 for confidence in the
                            digital economy, users of the site are informed of the identity of the various parties
                            involved in its creation and monitoring.
                        </p>

                        <h3>{{ store.isFrench ? 'Éditeur et responsable de publication' : 'Publisher' }}</h3>
                        <ul>
                            <li>
                                <strong>{{ store.isFrench ? 'Nom' : 'Name' }}</strong> : Raturat Grégoire
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? 'Statut' : 'Status' }}</strong> :
                                {{
                                    store.isFrench
                                        ? 'Personne physique - Portfolio professionnel'
                                        : 'Individual - Professional portfolio'
                                }}
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? 'Localisation' : 'Location' }}</strong> : Lyon, France
                            </li>
                            <li>
                                <strong>Email</strong> :
                                {{ store.isFrench ? 'via le formulaire de contact' : 'via the contact form' }}
                            </li>
                        </ul>

                        <h3>{{ store.isFrench ? 'Hébergement du site' : 'Website Hosting' }}</h3>
                        <ul>
                            <li>
                                <strong>{{ store.isFrench ? 'Hébergeur' : 'Host' }}</strong> : Netlify, Inc.
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? 'Adresse' : 'Address' }}</strong> : 44 Montgomery Street,
                                Suite 300, San Francisco, CA 94104, USA
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? 'Site web' : 'Website' }}</strong> : www.netlify.com
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? 'Type de serveur' : 'Server type' }}</strong> :
                                {{ store.isFrench ? 'CDN global (Edge Network)' : 'Global CDN (Edge Network)' }}
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? 'Localisation des données' : 'Data location' }}</strong> :
                                {{
                                    store.isFrench
                                        ? 'Serveurs Netlify (USA) avec CDN mondial'
                                        : 'Netlify servers (USA) with global CDN'
                                }}
                            </li>
                        </ul>

                        <h3>{{ store.isFrench ? 'Directeur de publication' : 'Publication Director' }}</h3>
                        <p v-if="store.isFrench">
                            Le directeur de la publication du site est Raturat Grégoire, en sa qualité de
                            propriétaire/éditeur du site.
                        </p>
                        <p v-else>
                            The publication director of the site is Raturat Grégoire, in his capacity as owner/editor of
                            the site.
                        </p>

                        <h3>{{ store.isFrench ? 'Propriété intellectuelle' : 'Intellectual Property' }}</h3>
                        <p v-if="store.isFrench">
                            L'ensemble de ce site relève de la législation française et internationale sur le droit
                            d'auteur et la propriété intellectuelle. Tous les droits de reproduction sont réservés, y
                            compris pour les documents téléchargeables et les représentations iconographiques et
                            photographiques.
                        </p>
                        <p v-else>
                            The entire site is subject to French and international legislation on copyright and
                            intellectual property. All reproduction rights are reserved, including downloadable
                            documents and iconographic and photographic representations.
                        </p>
                    </section>

                    <!-- Responsable du traitement -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '3. Responsable du traitement' : '3. Data Controller' }}</h2>

                        <p v-if="store.isFrench">
                            Le responsable du traitement des données personnelles collectées sur ce site est Raturat
                            Grégoire, éditeur du site.
                        </p>
                        <p v-else>
                            The data controller for personal data collected on this website is Raturat Grégoire, site
                            editor.
                        </p>

                        <p v-if="store.isFrench">
                            <strong>Délégué à la Protection des Données (DPO) :</strong> Ce site ne dispose pas de DPO
                            désigné car il ne traite pas de données sensibles à grande échelle. Pour toute question
                            relative à vos données personnelles, contactez-moi directement via le formulaire de contact.
                        </p>
                        <p v-else>
                            <strong>Data Protection Officer (DPO):</strong> This site does not have a designated DPO as
                            it does not process sensitive data on a large scale. For any questions regarding your
                            personal data, contact me directly via the contact form.
                        </p>
                    </section>

                    <!-- Données collectées -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '4. Données collectées' : '4. Data Collected' }}</h2>

                        <h3>{{ store.isFrench ? '4.1 Formulaire de contact' : '4.1 Contact Form' }}</h3>
                        <p v-if="store.isFrench">
                            Lorsque vous utilisez le formulaire de contact, les informations suivantes sont collectées
                            et traitées par Netlify Forms :
                        </p>
                        <p v-else>
                            When you use the contact form, the following information is collected and processed by
                            Netlify Forms:
                        </p>
                        <ul>
                            <li>{{ store.isFrench ? 'Votre nom et prénom' : 'Your name' }}</li>
                            <li>{{ store.isFrench ? 'Votre adresse email' : 'Your email address' }}</li>
                            <li>
                                {{ store.isFrench ? 'Le contenu de votre message' : 'The content of your message' }}
                            </li>
                            <li>
                                {{ store.isFrench ? 'Date et heure de soumission' : 'Date and time of submission' }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Adresse IP (conservée par Netlify pour sécurité)'
                                        : 'IP address (kept by Netlify for security)'
                                }}
                            </li>
                        </ul>
                        <p v-if="store.isFrench">
                            <strong>Finalité :</strong> Répondre à vos demandes de contact et gérer la relation avec les
                            visiteurs.
                        </p>
                        <p v-else>
                            <strong>Purpose:</strong> Respond to your contact requests and manage visitor relations.
                        </p>

                        <h3>
                            {{
                                store.isFrench
                                    ? '4.2 Données analytiques (Google Analytics 4)'
                                    : '4.2 Analytics Data (Google Analytics 4)'
                            }}
                        </h3>
                        <p v-if="store.isFrench">
                            Ce site utilise Google Analytics 4 (avec anonymisation IP activée) pour analyser
                            l'utilisation et améliorer l'expérience utilisateur. Les données collectées incluent :
                        </p>
                        <p v-else>
                            This site uses Google Analytics 4 (with IP anonymization enabled) to analyze usage and
                            improve user experience. Collected data includes:
                        </p>
                        <ul>
                            <li>
                                {{
                                    store.isFrench
                                        ? "Informations techniques : type de navigateur, système d'exploitation, résolution d'écran"
                                        : 'Technical information: browser type, operating system, screen resolution'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Données de navigation : pages visitées, durée de visite, parcours de navigation'
                                        : 'Browsing data: pages visited, visit duration, browsing path'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Localisation approximative (pays, région) - adresse IP anonymisée'
                                        : 'Approximate location (country, region) - anonymized IP address'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Source de trafic (moteur de recherche, lien direct, réseaux sociaux)'
                                        : 'Traffic source (search engine, direct link, social media)'
                                }}
                            </li>
                        </ul>
                        <p v-if="store.isFrench">
                            <strong>Finalité :</strong> Comprendre l'utilisation du site, améliorer le contenu et
                            l'ergonomie.
                        </p>
                        <p v-else>
                            <strong>Purpose:</strong> Understand site usage, improve content and user experience.
                        </p>

                        <h3>
                            {{ store.isFrench ? '4.3 Données techniques (Netlify)' : '4.3 Technical Data (Netlify)' }}
                        </h3>
                        <p v-if="store.isFrench">
                            Netlify, en tant qu'hébergeur, collecte automatiquement des données techniques pour assurer
                            le bon fonctionnement et la sécurité du site :
                        </p>
                        <p v-else>
                            Netlify, as the hosting provider, automatically collects technical data to ensure proper
                            site operation and security:
                        </p>
                        <ul>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Logs de serveur (adresses IP, user-agent, requêtes HTTP)'
                                        : 'Server logs (IP addresses, user-agent, HTTP requests)'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Données de performance (temps de chargement, bande passante)'
                                        : 'Performance data (load times, bandwidth)'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Données de sécurité (tentatives de connexion, attaques DDoS)'
                                        : 'Security data (connection attempts, DDoS attacks)'
                                }}
                            </li>
                        </ul>
                        <p v-if="store.isFrench">
                            <strong>Durée de conservation Netlify :</strong> 30 jours maximum pour les logs techniques.
                        </p>
                        <p v-else><strong>Netlify retention period:</strong> Maximum 30 days for technical logs.</p>
                    </section>

                    <!-- Services tiers -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '5. Services tiers utilisés' : '5. Third-party Services' }}</h2>

                        <div class="service-card">
                            <h3>Google Analytics 4</h3>
                            <p v-if="store.isFrench">
                                Service d'analyse web de Google avec anonymisation IP. Configuration conforme RGPD.
                            </p>
                            <p v-else>
                                Google's web analytics service with IP anonymization. GDPR-compliant configuration.
                            </p>
                            <ul>
                                <li>
                                    <strong>{{ store.isFrench ? 'Finalité' : 'Purpose' }}</strong> :
                                    {{
                                        store.isFrench
                                            ? 'Analyse du trafic et amélioration du site'
                                            : 'Traffic analysis and site improvement'
                                    }}
                                </li>
                                <li>
                                    <strong>{{ store.isFrench ? 'Base légale' : 'Legal basis' }}</strong> :
                                    {{
                                        store.isFrench
                                            ? 'Intérêt légitime (article 6.1.f RGPD)'
                                            : 'Legitimate interest (Article 6.1.f GDPR)'
                                    }}
                                </li>
                                <li>
                                    <strong>{{
                                        store.isFrench ? 'Transfert hors UE' : 'Data transfer outside EU'
                                    }}</strong>
                                    :
                                    {{
                                        store.isFrench
                                            ? 'USA (clauses contractuelles types)'
                                            : 'USA (standard contractual clauses)'
                                    }}
                                </li>
                            </ul>
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
                            <h3>Netlify (Hébergement & Forms)</h3>
                            <p v-if="store.isFrench">Plateforme d'hébergement et service de gestion de formulaires.</p>
                            <p v-else>Hosting platform and form management service.</p>
                            <ul>
                                <li>
                                    <strong>{{ store.isFrench ? 'Finalité' : 'Purpose' }}</strong> :
                                    {{
                                        store.isFrench
                                            ? 'Hébergement du site, gestion des formulaires, sécurité'
                                            : 'Site hosting, form management, security'
                                    }}
                                </li>
                                <li>
                                    <strong>{{ store.isFrench ? 'Base légale' : 'Legal basis' }}</strong> :
                                    {{
                                        store.isFrench
                                            ? 'Exécution du contrat (article 6.1.b RGPD)'
                                            : 'Contract execution (Article 6.1.b GDPR)'
                                    }}
                                </li>
                                <li>
                                    <strong>{{
                                        store.isFrench ? 'Transfert hors UE' : 'Data transfer outside EU'
                                    }}</strong>
                                    :
                                    {{
                                        store.isFrench
                                            ? 'USA (certification Privacy Shield alternative)'
                                            : 'USA (Privacy Shield alternative certification)'
                                    }}
                                </li>
                            </ul>
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

                        <div class="service-card">
                            <h3>Google Fonts</h3>
                            <p v-if="store.isFrench">
                                Service de polices web de Google (auto-hébergées pour respecter le RGPD).
                            </p>
                            <p v-else>Google's web font service (self-hosted to comply with GDPR).</p>
                            <ul>
                                <li>
                                    <strong>{{ store.isFrench ? 'Note' : 'Note' }}</strong> :
                                    {{
                                        store.isFrench
                                            ? 'Les polices sont téléchargées et hébergées sur Netlify, aucune donnée envoyée à Google'
                                            : 'Fonts are downloaded and hosted on Netlify, no data sent to Google'
                                    }}
                                </li>
                            </ul>
                        </div>
                    </section>

                    <!-- Base légale -->
                    <section class="privacy-section">
                        <h2>
                            {{
                                store.isFrench
                                    ? '6. Base légale et durée de conservation'
                                    : '6. Legal Basis & Data Retention'
                            }}
                        </h2>

                        <p v-if="store.isFrench">
                            Le traitement de vos données personnelles repose sur les bases légales suivantes
                            (conformément à l'article 6 du RGPD) :
                        </p>
                        <p v-else>
                            The processing of your personal data is based on the following legal grounds (in accordance
                            with Article 6 of GDPR):
                        </p>

                        <ul>
                            <li>
                                <strong>{{ store.isFrench ? 'Formulaire de contact' : 'Contact form' }}</strong> :
                                {{
                                    store.isFrench
                                        ? 'Consentement explicite (article 6.1.a) et exécution de mesures précontractuelles (article 6.1.b)'
                                        : 'Explicit consent (Article 6.1.a) and pre-contractual measures (Article 6.1.b)'
                                }}
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? 'Google Analytics' : 'Google Analytics' }}</strong> :
                                {{
                                    store.isFrench
                                        ? 'Intérêt légitime à améliorer le site (article 6.1.f)'
                                        : 'Legitimate interest to improve the site (Article 6.1.f)'
                                }}
                            </li>
                            <li>
                                <strong>{{ store.isFrench ? 'Netlify (hébergement)' : 'Netlify (hosting)' }}</strong> :
                                {{
                                    store.isFrench
                                        ? 'Intérêt légitime à assurer la sécurité et le fonctionnement du site (article 6.1.f)'
                                        : 'Legitimate interest to ensure site security and operation (Article 6.1.f)'
                                }}
                            </li>
                        </ul>

                        <h3>{{ store.isFrench ? 'Durée de conservation' : 'Retention Period' }}</h3>
                        <ul>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Données du formulaire de contact : 12 mois maximum après le dernier contact'
                                        : 'Contact form data: Maximum 12 months after last contact'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Données Google Analytics : 14 mois (configuration par défaut GA4)'
                                        : 'Google Analytics data: 14 months (GA4 default configuration)'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench ? 'Logs Netlify : 30 jours maximum' : 'Netlify logs: Maximum 30 days'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Cookies analytiques : 13 mois maximum'
                                        : 'Analytics cookies: Maximum 13 months'
                                }}
                            </li>
                        </ul>
                    </section>

                    <!-- Vos droits -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '7. Vos droits (RGPD)' : '7. Your Rights (GDPR)' }}</h2>
                        <p v-if="store.isFrench">
                            Conformément au RGPD et à la loi Informatique et Libertés, vous disposez des droits suivants
                            :
                        </p>
                        <p v-else>
                            In accordance with GDPR and French Data Protection Law, you have the following rights:
                        </p>
                        <ul>
                            <li>
                                <strong>{{
                                    store.isFrench ? "Droit d'accès (article 15)" : 'Right of access (Article 15)'
                                }}</strong>
                                :
                                {{ store.isFrench ? 'obtenir une copie de vos données' : 'obtain a copy of your data' }}
                            </li>
                            <li>
                                <strong>{{
                                    store.isFrench
                                        ? 'Droit de rectification (article 16)'
                                        : 'Right to rectification (Article 16)'
                                }}</strong>
                                : {{ store.isFrench ? 'corriger vos données inexactes' : 'correct inaccurate data' }}
                            </li>
                            <li>
                                <strong>{{
                                    store.isFrench
                                        ? "Droit à l'effacement (article 17)"
                                        : 'Right to erasure (Article 17)'
                                }}</strong>
                                :
                                {{
                                    store.isFrench ? 'demander la suppression de vos données' : 'request data deletion'
                                }}
                            </li>
                            <li>
                                <strong>{{
                                    store.isFrench
                                        ? 'Droit à la limitation du traitement (article 18)'
                                        : 'Right to restriction (Article 18)'
                                }}</strong>
                                :
                                {{ store.isFrench ? 'limiter le traitement de vos données' : 'limit data processing' }}
                            </li>
                            <li>
                                <strong>{{
                                    store.isFrench
                                        ? 'Droit à la portabilité (article 20)'
                                        : 'Right to portability (Article 20)'
                                }}</strong>
                                :
                                {{
                                    store.isFrench
                                        ? 'recevoir vos données dans un format structuré'
                                        : 'receive your data in structured format'
                                }}
                            </li>
                            <li>
                                <strong>{{
                                    store.isFrench ? "Droit d'opposition (article 21)" : 'Right to object (Article 21)'
                                }}</strong>
                                :
                                {{
                                    store.isFrench
                                        ? 'vous opposer au traitement pour motifs légitimes'
                                        : 'object to processing for legitimate reasons'
                                }}
                            </li>
                            <li>
                                <strong>{{
                                    store.isFrench ? 'Droit de retirer votre consentement' : 'Right to withdraw consent'
                                }}</strong>
                                :
                                {{
                                    store.isFrench
                                        ? 'à tout moment sans justification'
                                        : 'at any time without justification'
                                }}
                            </li>
                        </ul>

                        <p v-if="store.isFrench">
                            <strong>Comment exercer vos droits :</strong> Contactez-moi via le
                            <a href="#" @click.prevent="(closePolicy(), store.navigateToSection('contact'))">
                                formulaire de contact
                            </a>
                            en précisant votre demande. Vous devrez fournir une preuve d'identité. Délai de réponse : 1
                            mois maximum (article 12 RGPD).
                        </p>
                        <p v-else>
                            <strong>How to exercise your rights:</strong> Contact me via the
                            <a href="#" @click.prevent="(closePolicy(), store.navigateToSection('contact'))">
                                contact form
                            </a>
                            specifying your request. You must provide proof of identity. Response time: Maximum 1 month
                            (Article 12 GDPR).
                        </p>

                        <p v-if="store.isFrench">
                            <strong>Droit de réclamation auprès de la CNIL :</strong> Si vous estimez que vos droits ne
                            sont pas respectés, vous pouvez introduire une réclamation auprès de la Commission Nationale
                            de l'Informatique et des Libertés (CNIL) :
                            <a href="https://www.cnil.fr/fr/plaintes" target="_blank" rel="noopener">www.cnil.fr</a>
                        </p>
                        <p v-else>
                            <strong>Right to lodge a complaint:</strong> If you believe your rights are not respected,
                            you can file a complaint with the French Data Protection Authority (CNIL):
                            <a href="https://www.cnil.fr/en/home" target="_blank" rel="noopener">www.cnil.fr</a>
                        </p>
                    </section>

                    <!-- Cookies -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '8. Gestion des cookies' : '8. Cookie Management' }}</h2>

                        <p v-if="store.isFrench">
                            Ce site utilise des cookies conformément à l'article 82 de la loi Informatique et Libertés
                            et aux recommandations de la CNIL.
                        </p>
                        <p v-else>
                            This site uses cookies in accordance with Article 82 of the French Data Protection Law and
                            CNIL recommendations.
                        </p>

                        <h3>{{ store.isFrench ? 'Types de cookies utilisés' : 'Types of Cookies Used' }}</h3>

                        <div class="cookie-table">
                            <div class="cookie-row">
                                <strong>{{ store.isFrench ? 'Cookie' : 'Cookie' }}</strong>
                                <strong>{{ store.isFrench ? 'Finalité' : 'Purpose' }}</strong>
                                <strong>{{ store.isFrench ? 'Durée' : 'Duration' }}</strong>
                                <strong>{{ store.isFrench ? 'Type' : 'Type' }}</strong>
                            </div>
                            <div class="cookie-row">
                                <span>_ga</span>
                                <span>{{
                                    store.isFrench ? 'Identifier les visiteurs uniques' : 'Identify unique visitors'
                                }}</span>
                                <span>{{ store.isFrench ? '13 mois' : '13 months' }}</span>
                                <span>{{ store.isFrench ? 'Analytique' : 'Analytics' }}</span>
                            </div>
                            <div class="cookie-row">
                                <span>_ga_*</span>
                                <span>{{
                                    store.isFrench ? "Maintenir l'état de session" : 'Maintain session state'
                                }}</span>
                                <span>{{ store.isFrench ? '13 mois' : '13 months' }}</span>
                                <span>{{ store.isFrench ? 'Analytique' : 'Analytics' }}</span>
                            </div>
                            <div class="cookie-row">
                                <span>portfolio-lang</span>
                                <span>{{
                                    store.isFrench ? 'Mémoriser la langue choisie' : 'Remember chosen language'
                                }}</span>
                                <span>{{ store.isFrench ? 'Permanente' : 'Permanent' }}</span>
                                <span>{{ store.isFrench ? 'Fonctionnel' : 'Functional' }}</span>
                            </div>
                        </div>

                        <h3>{{ store.isFrench ? 'Comment gérer les cookies' : 'How to Manage Cookies' }}</h3>
                        <p v-if="store.isFrench">
                            Vous pouvez à tout moment désactiver les cookies dans les paramètres de votre navigateur :
                        </p>
                        <p v-else>You can disable cookies at any time in your browser settings:</p>
                        <ul>
                            <li>
                                <strong>Chrome</strong> :
                                <a href="https://support.google.com/chrome/answer/95647" target="_blank" rel="noopener">
                                    {{ store.isFrench ? 'Instructions' : 'Instructions' }}
                                </a>
                            </li>
                            <li>
                                <strong>Firefox</strong> :
                                <a
                                    href="https://support.mozilla.org/fr/kb/cookies-informations-sites-enregistrent"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    {{ store.isFrench ? 'Instructions' : 'Instructions' }}
                                </a>
                            </li>
                            <li>
                                <strong>Safari</strong> :
                                <a
                                    href="https://support.apple.com/fr-fr/guide/safari/sfri11471/mac"
                                    target="_blank"
                                    rel="noopener"
                                >
                                    {{ store.isFrench ? 'Instructions' : 'Instructions' }}
                                </a>
                            </li>
                        </ul>

                        <p v-if="store.isFrench">
                            Vous pouvez également utiliser des extensions de navigateur telles que
                            <strong>uBlock Origin</strong> ou <strong>Privacy Badger</strong> pour bloquer les trackers.
                        </p>
                        <p v-else>
                            You can also use browser extensions such as <strong>uBlock Origin</strong> or
                            <strong>Privacy Badger</strong> to block trackers.
                        </p>
                    </section>

                    <!-- Sécurité -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '9. Sécurité des données' : '9. Data Security' }}</h2>

                        <p v-if="store.isFrench">
                            Je mets en œuvre les mesures techniques et organisationnelles appropriées pour protéger vos
                            données personnelles contre la destruction, la perte, l'altération, la divulgation non
                            autorisée ou l'accès non autorisé :
                        </p>
                        <p v-else>
                            I implement appropriate technical and organizational measures to protect your personal data
                            against destruction, loss, alteration, unauthorized disclosure or unauthorized access:
                        </p>

                        <ul>
                            <li>{{ store.isFrench ? 'HTTPS obligatoire (TLS 1.3)' : 'Mandatory HTTPS (TLS 1.3)' }}</li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Hébergement sur infrastructure Netlify (certifiée SOC 2 Type II)'
                                        : 'Hosting on Netlify infrastructure (SOC 2 Type II certified)'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Anonymisation des adresses IP dans Google Analytics'
                                        : 'IP address anonymization in Google Analytics'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? "Limitation d'accès aux données aux seuls services nécessaires"
                                        : 'Access to data limited to necessary services only'
                                }}
                            </li>
                            <li>
                                {{
                                    store.isFrench
                                        ? 'Mise à jour régulière des dépendances de sécurité'
                                        : 'Regular security dependency updates'
                                }}
                            </li>
                        </ul>
                    </section>

                    <!-- Contact -->
                    <section class="privacy-section">
                        <h2>{{ store.isFrench ? '10. Contact et modifications' : '10. Contact and Updates' }}</h2>

                        <p v-if="store.isFrench">
                            Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits
                            RGPD, contactez-moi via le
                            <a href="#" @click.prevent="(closePolicy(), store.navigateToSection('contact'))">
                                formulaire de contact
                            </a>
                            .
                        </p>
                        <p v-else>
                            For any questions regarding this privacy policy or to exercise your GDPR rights, contact me
                            via the
                            <a href="#" @click.prevent="(closePolicy(), store.navigateToSection('contact'))">
                                contact form
                            </a>
                            .
                        </p>

                        <p v-if="store.isFrench">
                            <strong>Modifications de la politique :</strong> Cette politique peut être mise à jour pour
                            refléter les changements dans mes pratiques de traitement des données. La date de dernière
                            mise à jour est indiquée en haut de ce document. Les modifications importantes seront
                            communiquées via une notification visible sur le site.
                        </p>
                        <p v-else>
                            <strong>Policy updates:</strong> This policy may be updated to reflect changes in my data
                            processing practices. The last update date is indicated at the top of this document.
                            Significant changes will be communicated via a visible notification on the site.
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

.service-card ul {
    margin-top: var(--space-sm);
}

/* Cookie table */
.cookie-table {
    display: grid;
    grid-template-columns: 1fr 2fr 1fr 1fr;
    gap: var(--space-xs);
    background: var(--bg-primary);
    border-radius: 8px;
    padding: var(--space-sm);
    margin: var(--space-md) 0;
}

.cookie-row {
    display: contents;
}

.cookie-row > * {
    padding: var(--space-xs);
    border-bottom: 1px solid var(--bg-accent);
}

.cookie-row:first-child > * {
    font-weight: 600;
    color: var(--accent-primary);
    background: var(--bg-secondary);
    border-radius: 4px;
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
    }

    .privacy-content {
        padding: var(--space-md);
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

    .cookie-table {
        grid-template-columns: 1fr;
        gap: var(--space-sm);
    }

    .cookie-row > * {
        border-bottom: none;
        padding: var(--space-xs) 0;
    }

    .cookie-row:not(:first-child) {
        border-bottom: 1px solid var(--bg-accent);
        padding-bottom: var(--space-sm);
        margin-bottom: var(--space-sm);
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
