<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')
const { gtag } = useGtag()

// TODO(Grégoire) : remplacer par les liens directs App Store / Google Play de DishRank
const DISHRANK_APP_STORE_URL = 'https://dishrank.fr'
const DISHRANK_PLAY_STORE_URL = 'https://dishrank.fr'
const DISHRANK_WEB_URL = 'https://dishrank.fr'

interface ArchNode {
    title: string
    sub: string
}

interface CaseStudy {
    id: string
    status: string
    statusKind: 'live' | 'study'
    meta: string
    title: string
    tagline: string
    disclaimer?: string
    problemTitle: string
    problem: string
    solutionTitle: string
    solution: string
    archItems: Array<{ k: string; v: string }>
    diagramLabel: string
    diagram: Array<ArchNode[]>
    resultsTitle: string
    results: string
    tech: string[]
    hasStoreBadges?: boolean
    screenshots?: Array<{ src: string; alt: string }>
}

const content = computed<{ label: string; title: string; description: string; cases: CaseStudy[] }>(() =>
    store.isFrench
        ? {
              label: 'Sélection',
              title: 'Études de cas',
              description:
                  'Deux projets racontés comme je travaille : un problème concret, une architecture, des résultats.',
              cases: [
                  {
                      id: 'dishrank',
                      status: 'En production',
                      statusKind: 'live',
                      meta: '2026 · Développé en solo',
                      title: 'DishRank',
                      tagline: 'Noter les plats, pas les restaurants',
                      problemTitle: 'Problème',
                      problem:
                          "Les avis en ligne notent les restaurants, jamais les plats. Un 4,5 étoiles ne répond pas à la vraie question une fois à table : qu'est-ce qu'on commande ?",
                      solutionTitle: 'Solution & architecture',
                      solution:
                          'Une application multi-plateforme (iOS, Android, web) pour noter les plats et découvrir les meilleures assiettes autour de soi. Conçue, développée et publiée entièrement en solo, de la maquette à la prod.',
                      archItems: [
                          {
                              k: 'React Native + Next.js',
                              v: 'une seule base de code produit pour iOS, Android et le web',
                          },
                          {
                              k: 'Supabase / Postgres',
                              v: 'données, temps réel et stockage des médias',
                          },
                          {
                              k: 'Auth anonyme par tokens HMAC',
                              v: "zéro friction d'inscription : on note un plat en dix secondes",
                          },
                          {
                              k: 'Images Open Graph dynamiques',
                              v: 'chaque plat partagé génère sa propre carte visuelle, pensée pour le partage viral',
                          },
                      ],
                      diagramLabel:
                          'Schéma d’architecture : clients iOS, Android et web vers l’API Next.js, elle-même connectée à Supabase (Postgres, Auth, Storage)',
                      diagram: [
                          [
                              { title: 'iOS · Android', sub: 'React Native' },
                              { title: 'Web', sub: 'Next.js' },
                          ],
                          [{ title: 'API', sub: 'Next.js · OG dynamiques' }],
                          [{ title: 'Supabase', sub: 'Postgres · Auth · Storage' }],
                      ],
                      resultsTitle: 'Résultats',
                      results:
                          "Publiée sur l'App Store et Google Play, avec la version web en accès direct — un produit complet livré de bout en bout.",
                      tech: ['React Native', 'Next.js', 'Supabase', 'TypeScript'],
                      hasStoreBadges: true,
                      screenshots: [
                          { src: '/projects/dishrank/home-sm.webp', alt: 'DishRank — écran d’accueil' },
                          { src: '/projects/dishrank/map-sm.webp', alt: 'DishRank — carte des plats' },
                          { src: '/projects/dishrank/profil-sm.webp', alt: 'DishRank — profil' },
                      ],
                  },
                  {
                      id: 'inbox-ia',
                      status: 'En production',
                      statusKind: 'live',
                      meta: '2026 · Produit SaaS',
                      title: 'Messagerie omnicanale IA',
                      tagline: 'Une inbox unifiée avec IA pour les tatoueurs',
                      problemTitle: 'Problème',
                      problem:
                          'Les tatoueurs jonglent entre WhatsApp, Instagram, Messenger et email. Résultat : des conversations éparpillées, des devis oubliés et des clients perdus faute de réponse rapide.',
                      solutionTitle: 'Solution & architecture',
                      solution:
                          "Une inbox unifiée, bâtie sur Chatwoot, qui centralise tous les canaux et propose des réponses assistées par IA dans le ton de l'artiste — avec retour à l'humain dès que la conversation le demande (handover bot → humain).",
                      archItems: [
                          {
                              k: 'Chatwoot — hub omnicanal',
                              v: 'connecte WhatsApp, Instagram, Messenger et email dans une seule inbox open-source',
                          },
                          {
                              k: 'Pipeline RAG — pgvector + API Claude',
                              v: "réponses ancrées dans le contexte de l'artiste : tarifs, styles, disponibilités",
                          },
                          {
                              k: 'Bot agent branché sur Chatwoot',
                              v: "brouillons de réponse dans le ton de l'artiste, validés puis envoyés en un clic",
                          },
                          {
                              k: 'Files de traitement BullMQ',
                              v: 'traitement asynchrone des messages entrants, retries et priorités',
                          },
                          {
                              k: "Coût d'infrastructure maîtrisé : ~85–145 €/mois",
                              v: 'pour 50 à 200 professionnels, coûts IA compris',
                          },
                      ],
                      diagramLabel:
                          'Schéma d’architecture : canaux WhatsApp, Instagram, Messenger et email centralisés par Chatwoot, enrichis par le pipeline IA (RAG pgvector + Claude via BullMQ), avec handover vers l’artiste',
                      diagram: [
                          [{ title: 'Canaux', sub: 'WhatsApp · Instagram · Messenger · Email' }],
                          [{ title: 'Chatwoot', sub: 'Inbox omnicanale' }],
                          [{ title: 'IA', sub: 'RAG pgvector · API Claude · BullMQ' }],
                          [{ title: 'Artiste', sub: 'Validation & handover' }],
                      ],
                      resultsTitle: 'Résultats',
                      results:
                          "En production pour des tatoueurs : messages centralisés, réponses assistées par IA validées par l'artiste et handover humain fluide. Toute la stack — Chatwoot, RAG, files, IA — tient sous 150 €/mois.",
                      tech: ['Chatwoot', 'API Claude', 'pgvector', 'BullMQ', 'Postgres'],
                  },
              ],
          }
        : {
              label: 'Selected work',
              title: 'Case studies',
              description: 'Two projects told the way I work: a concrete problem, an architecture, results.',
              cases: [
                  {
                      id: 'dishrank',
                      status: 'Live in production',
                      statusKind: 'live',
                      meta: '2026 · Built solo',
                      title: 'DishRank',
                      tagline: 'Rate dishes, not restaurants',
                      problemTitle: 'Problem',
                      problem:
                          "Online reviews rate restaurants, never dishes. A 4.5-star rating doesn't answer the real question once you're seated: what should you order?",
                      solutionTitle: 'Solution & architecture',
                      solution:
                          'A multi-platform app (iOS, Android, web) to rate dishes and discover the best plates around you. Designed, built and shipped entirely solo, from mockup to production.',
                      archItems: [
                          {
                              k: 'React Native + Next.js',
                              v: 'a single product codebase for iOS, Android and the web',
                          },
                          {
                              k: 'Supabase / Postgres',
                              v: 'data, realtime and media storage',
                          },
                          {
                              k: 'Anonymous auth with HMAC tokens',
                              v: 'zero signup friction: rate a dish in ten seconds',
                          },
                          {
                              k: 'Dynamic Open Graph images',
                              v: 'every shared dish generates its own visual card, built for viral sharing',
                          },
                      ],
                      diagramLabel:
                          'Architecture diagram: iOS, Android and web clients to the Next.js API, connected to Supabase (Postgres, Auth, Storage)',
                      diagram: [
                          [
                              { title: 'iOS · Android', sub: 'React Native' },
                              { title: 'Web', sub: 'Next.js' },
                          ],
                          [{ title: 'API', sub: 'Next.js · dynamic OG' }],
                          [{ title: 'Supabase', sub: 'Postgres · Auth · Storage' }],
                      ],
                      resultsTitle: 'Results',
                      results:
                          'Published on the App Store and Google Play, with the web version directly accessible — a complete product shipped end to end.',
                      tech: ['React Native', 'Next.js', 'Supabase', 'TypeScript'],
                      hasStoreBadges: true,
                      screenshots: [
                          { src: '/projects/dishrank/home-sm.webp', alt: 'DishRank — home screen' },
                          { src: '/projects/dishrank/map-sm.webp', alt: 'DishRank — dish map' },
                          { src: '/projects/dishrank/profil-sm.webp', alt: 'DishRank — profile' },
                      ],
                  },
                  {
                      id: 'inbox-ia',
                      status: 'Live in production',
                      statusKind: 'live',
                      meta: '2026 · SaaS product',
                      title: 'Omnichannel AI messaging',
                      tagline: 'A unified AI-assisted inbox for tattoo artists',
                      problemTitle: 'Problem',
                      problem:
                          'Tattoo artists juggle WhatsApp, Instagram, Messenger and email. The result: scattered conversations, forgotten quotes and clients lost for lack of a quick reply.',
                      solutionTitle: 'Solution & architecture',
                      solution:
                          "A unified inbox, built on Chatwoot, that centralizes every channel and suggests AI-assisted replies in the artist's tone — handing the conversation back to a human whenever it matters (bot → human handover).",
                      archItems: [
                          {
                              k: 'Chatwoot — omnichannel hub',
                              v: 'connects WhatsApp, Instagram, Messenger and email into a single open-source inbox',
                          },
                          {
                              k: 'RAG pipeline — pgvector + Claude API',
                              v: "replies grounded in the artist's context: pricing, styles, availability",
                          },
                          {
                              k: 'Agent bot wired into Chatwoot',
                              v: "draft replies in the artist's tone, reviewed and sent in one click",
                          },
                          {
                              k: 'BullMQ processing queues',
                              v: 'asynchronous processing of incoming messages, retries and priorities',
                          },
                          {
                              k: 'Infrastructure under control: ~€85–145/month',
                              v: 'for 50 to 200 professionals, AI costs included',
                          },
                      ],
                      diagramLabel:
                          'Architecture diagram: WhatsApp, Instagram, Messenger and email channels centralized by Chatwoot, enriched by the AI pipeline (RAG pgvector + Claude via BullMQ), with handover to the artist',
                      diagram: [
                          [{ title: 'Channels', sub: 'WhatsApp · Instagram · Messenger · Email' }],
                          [{ title: 'Chatwoot', sub: 'Omnichannel inbox' }],
                          [{ title: 'AI', sub: 'RAG pgvector · Claude API · BullMQ' }],
                          [{ title: 'Artist', sub: 'Review & handover' }],
                      ],
                      resultsTitle: 'Results',
                      results:
                          'Live for tattoo artists: centralized messages, AI-assisted replies reviewed by the artist and smooth human handover. The whole stack — Chatwoot, RAG, queues, AI — stays under €150/month.',
                      tech: ['Chatwoot', 'Claude API', 'pgvector', 'BullMQ', 'Postgres'],
                  },
              ],
          },
)

const headerRef = ref<HTMLElement | null>(null)

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

    useMotion(headerRef, fadeUp)
}

const trackOutbound = (label: string) => {
    if (typeof gtag !== 'undefined') {
        gtag('event', 'outbound_click', {
            event_category: 'case_study',
            event_label: label,
        })
    }
}
</script>

<template>
    <div class="cases-wrapper">
        <div class="cases-container">
            <!-- Section Header -->
            <div ref="headerRef" class="section-header">
                <span class="section-label">
                    <span class="label-line"></span>
                    {{ content.label }}
                </span>
                <h2 class="section-title">{{ content.title }}</h2>
                <p class="section-description">{{ content.description }}</p>
            </div>

            <!-- Case studies -->
            <article
                v-for="(cs, index) in content.cases"
                :key="cs.id"
                v-motion
                :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 }"
                :visibleOnce="
                    prefersReducedMotion
                        ? { opacity: 1 }
                        : {
                              opacity: 1,
                              y: 0,
                              transition: { type: 'spring', stiffness: 80, damping: 20, delay: 0.15 + index * 0.1 },
                          }
                "
                class="case-study"
            >
                <!-- Meta column -->
                <div class="case-meta">
                    <div class="case-badges">
                        <span class="case-status" :class="cs.statusKind">{{ cs.status }}</span>
                        <span class="case-date">{{ cs.meta }}</span>
                    </div>
                    <h3 class="case-title">{{ cs.title }}</h3>
                    <p class="case-tagline">{{ cs.tagline }}</p>
                    <p v-if="cs.disclaimer" class="case-disclaimer">{{ cs.disclaimer }}</p>
                    <div class="case-tech">
                        <span v-for="tech in cs.tech" :key="tech" class="tech-tag">{{ tech }}</span>
                    </div>
                </div>

                <!-- Narrative column -->
                <div class="case-body">
                    <div class="case-block">
                        <h4 class="case-block-title">{{ cs.problemTitle }}</h4>
                        <p>{{ cs.problem }}</p>
                    </div>

                    <div class="case-block">
                        <h4 class="case-block-title">{{ cs.solutionTitle }}</h4>
                        <p>{{ cs.solution }}</p>
                        <ul class="arch-list">
                            <li v-for="item in cs.archItems" :key="item.k">
                                <strong>{{ item.k }}</strong> — {{ item.v }}
                            </li>
                        </ul>

                        <!-- Architecture diagram -->
                        <div class="arch-diagram" role="img" :aria-label="cs.diagramLabel">
                            <template v-for="(col, colIndex) in cs.diagram" :key="colIndex">
                                <span v-if="colIndex > 0" class="arch-arrow" aria-hidden="true">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M5 12h14m0 0-6-6m6 6-6 6"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                </span>
                                <div class="arch-col">
                                    <div v-for="node in col" :key="node.title" class="arch-node">
                                        <span class="arch-node-title">{{ node.title }}</span>
                                        <span class="arch-node-sub">{{ node.sub }}</span>
                                    </div>
                                </div>
                            </template>
                        </div>
                    </div>

                    <div class="case-block">
                        <h4 class="case-block-title">{{ cs.resultsTitle }}</h4>
                        <p>{{ cs.results }}</p>

                        <!-- Store badges (DishRank) -->
                        <div v-if="cs.hasStoreBadges" class="store-badges">
                            <a
                                :href="DISHRANK_APP_STORE_URL"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="store-badge"
                                @click="trackOutbound('dishrank_app_store')"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path
                                        d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.702"
                                    />
                                </svg>
                                <span class="store-text">
                                    <small>{{ store.isFrench ? 'Télécharger dans' : 'Download on the' }}</small>
                                    <strong>{{ store.isFrench ? "l'App Store" : 'App Store' }}</strong>
                                </span>
                            </a>
                            <a
                                :href="DISHRANK_PLAY_STORE_URL"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="store-badge"
                                @click="trackOutbound('dishrank_play_store')"
                            >
                                <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                                    <path
                                        d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.179l11.04 10.973zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z"
                                    />
                                </svg>
                                <span class="store-text">
                                    <small>{{ store.isFrench ? 'Disponible sur' : 'Get it on' }}</small>
                                    <strong>Google Play</strong>
                                </span>
                            </a>
                            <a
                                :href="DISHRANK_WEB_URL"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="web-link"
                                @click="trackOutbound('dishrank_web')"
                            >
                                dishrank.fr
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                                    <path
                                        d="M7 17L17 7M17 7H7M17 7V17"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </a>
                        </div>

                        <!-- Screenshots (DishRank) -->
                        <div v-if="cs.screenshots" class="case-shots">
                            <img
                                v-for="shot in cs.screenshots"
                                :key="shot.src"
                                :src="shot.src"
                                :alt="shot.alt"
                                width="440"
                                height="921"
                                loading="lazy"
                                class="case-shot"
                            />
                        </div>
                    </div>
                </div>
            </article>
        </div>
    </div>
</template>

<style scoped>
.cases-wrapper {
    position: relative;
    width: 100%;
    padding: var(--space-xl) var(--space-lg);
    z-index: 1;
}

.cases-container {
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
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--space-md);
}

.section-description {
    font-size: 1.125rem;
    line-height: 1.8;
    color: var(--text-secondary);
    max-width: 700px;
    margin: 0 auto;
}

/* Case study card */
.case-study {
    display: grid;
    /* minmax(0, 1fr) : empêche le min-content des enfants (bande de screenshots) d'élargir la grille */
    grid-template-columns: minmax(0, 1fr);
    gap: var(--space-md);
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 24px;
    padding: var(--space-md);
    margin-bottom: var(--space-lg);
}

.case-meta,
.case-body {
    min-width: 0;
}

.case-study:last-child {
    margin-bottom: 0;
}

/* Meta column */
.case-badges {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: var(--space-sm);
    margin-bottom: var(--space-sm);
}

.case-status {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 0.3rem 0.7rem;
    border-radius: 20px;
}

.case-status.live {
    color: #166534;
    background: #dcfce7;
    border: 1px solid #86efac;
}

.case-status.study {
    color: #854d0e;
    background: #fef9c3;
    border: 1px solid #fde047;
}

.case-date {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--text-secondary);
}

.case-title {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 var(--space-xs) 0;
}

.case-tagline {
    font-size: 1.0625rem;
    line-height: 1.6;
    color: var(--text-secondary);
    margin-bottom: var(--space-sm);
}

.case-disclaimer {
    font-size: 0.875rem;
    line-height: 1.6;
    color: var(--text-secondary);
    font-style: italic;
    padding: var(--space-xs) var(--space-sm);
    border-left: 3px solid var(--accent-secondary);
    background: var(--bg-secondary);
    border-radius: 0 8px 8px 0;
    margin-bottom: var(--space-sm);
}

.case-tech {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-xs);
}

.tech-tag {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    padding: var(--space-xs) var(--space-sm);
    background: var(--bg-accent);
    color: var(--accent-strong);
    border-radius: 20px;
}

/* Narrative column */
.case-body {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.case-block-title {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--accent-primary);
    margin: 0 0 var(--space-xs) 0;
}

.case-block p {
    font-size: 0.9375rem;
    line-height: 1.7;
    color: var(--text-secondary);
}

.arch-list {
    margin: var(--space-sm) 0 0 0;
    padding-left: 1.2rem;
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
}

.arch-list li {
    font-size: 0.9375rem;
    line-height: 1.6;
    color: var(--text-secondary);
}

.arch-list li::marker {
    color: var(--accent-primary);
}

.arch-list strong {
    color: var(--text-primary);
    font-weight: 700;
}

/* Architecture diagram */
.arch-diagram {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-xs);
    margin-top: var(--space-md);
    padding: var(--space-sm);
    background: var(--bg-secondary);
    border: 1px dashed var(--accent-secondary);
    border-radius: 16px;
}

.arch-col {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: var(--space-xs);
    flex: 1;
    min-width: 0;
}

.arch-node {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 12px;
    padding: 0.6rem 0.75rem;
    text-align: center;
}

.arch-node-title {
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--text-primary);
}

.arch-node-sub {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    color: var(--text-secondary);
    overflow-wrap: break-word;
}

.arch-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--accent-primary);
    transform: rotate(90deg);
}

@media (min-width: 768px) {
    .arch-diagram {
        flex-direction: row;
        align-items: stretch;
        padding: var(--space-sm) var(--space-md);
    }

    .arch-arrow {
        transform: none;
        flex-shrink: 0;
    }
}

/* Store badges */
.store-badges {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-sm);
    margin-top: var(--space-sm);
}

.store-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    background: var(--text-primary);
    color: var(--bg-primary);
    border-radius: 12px;
    padding: 0.5rem 0.9rem;
    text-decoration: none;
    transition:
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        box-shadow 0.3s ease;
}

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
    .store-badge:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(42, 40, 38, 0.3);
    }
}

.store-badge svg {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
}

.store-text {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
}

.store-text small {
    font-size: 0.625rem;
    opacity: 0.8;
}

.store-text strong {
    font-family: var(--font-body);
    font-size: 0.9375rem;
}

.web-link {
    display: inline-flex;
    align-items: center;
    gap: var(--space-xs);
    min-height: 44px;
    padding: 0 var(--space-xs);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--accent-primary);
    text-decoration: none;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    transition: color 0.3s ease;
}

@media (pointer: fine) {
    .web-link:hover {
        color: var(--text-primary);
    }
}

/* Screenshots */
.case-shots {
    display: flex;
    gap: var(--space-sm);
    margin-top: var(--space-md);
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: var(--space-xs);
}

.case-shot {
    width: 140px;
    flex-shrink: 0;
    border-radius: 16px;
    border: 1px solid var(--bg-accent);
}

/* Desktop layout */
@media (min-width: 1024px) {
    .case-study {
        grid-template-columns: 320px minmax(0, 1fr);
        gap: var(--space-lg);
        padding: var(--space-lg);
    }

    .case-shot {
        width: 180px;
    }
}

/* Mobile */
@media (max-width: 768px) {
    .cases-wrapper {
        padding: var(--space-lg) var(--space-md);
    }

    .section-header {
        margin-bottom: var(--space-md);
    }

    .case-study {
        margin-bottom: var(--space-md);
    }

    .case-title {
        font-size: 1.5rem;
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
