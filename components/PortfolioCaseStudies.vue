<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { computed, nextTick, ref } from 'vue'

// Langue de rendu alignée sur le HTML prérendu jusqu'au montage (section hydratée en différé)
const lang = useLang()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')
const { gtag } = useGtag()

const DISHRANK_APP_STORE_URL = 'https://apps.apple.com/fr/app/dishrank/id6761752556'
const DISHRANK_PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.dishrank.app'
const DISHRANK_WEB_URL = 'https://dishrank.fr'

interface CaseStudy {
    id: string
    status: string
    statusKind: 'live' | 'study' | 'oss'
    // Nature du projet, affichée dans l'onglet du carrousel
    tabLabel: string
    meta: string
    title: string
    tagline: string
    summary: string
    tech: string[]
    hasStoreBadges?: boolean
    // Liens affichés sous le résumé quand il n'y a pas de badges de stores
    links?: Array<{ label: string; url: string; track: string }>
    screenshots?: Array<{ src: string; alt: string }>
}

// Toutes les captures sont au format téléphone 440×952 ; les dimensions réservent la place avant chargement
const SHOT_WIDTH = 440
const SHOT_HEIGHT = 952

const BABYNAMED_SHOTS_FR = [
    { src: '/projects/babynamed/choisir-a-deux.webp', alt: 'babyNamed — choisir un prénom à deux' },
    { src: '/projects/babynamed/catalogue.webp', alt: 'babyNamed — catalogue de prénoms' },
    { src: '/projects/babynamed/fiche-prenom.webp', alt: 'babyNamed — fiche du prénom Louise' },
]
const BABYNAMED_SHOTS_EN = [
    { src: '/projects/babynamed/choisir-a-deux.webp', alt: 'babyNamed — choosing a name together' },
    { src: '/projects/babynamed/catalogue.webp', alt: 'babyNamed — name catalogue' },
    { src: '/projects/babynamed/fiche-prenom.webp', alt: 'babyNamed — page for the name Louise' },
]
const DAMNCLAUDE_SHOTS_FR = [
    { src: '/projects/damnclaude/accueil.webp', alt: 'Damn Claude — tableau de bord du jour' },
    { src: '/projects/damnclaude/seance.webp', alt: 'Damn Claude — séance en cours' },
    { src: '/projects/damnclaude/propositions.webp', alt: 'Damn Claude — propositions de Claude à valider' },
]
const DAMNCLAUDE_SHOTS_EN = [
    { src: '/projects/damnclaude/accueil.webp', alt: 'Damn Claude — today dashboard' },
    { src: '/projects/damnclaude/seance.webp', alt: 'Damn Claude — workout in progress' },
    { src: '/projects/damnclaude/propositions.webp', alt: 'Damn Claude — suggestions from Claude awaiting approval' },
]

const content = computed<{ label: string; title: string; description: string; cases: CaseStudy[] }>(() =>
    lang.isFrench
        ? {
              label: 'Sélection',
              title: 'Réalisations',
              description: 'Des produits conçus, développés et mis en production en autonomie.',
              cases: [
                  {
                      id: 'dishrank',
                      status: 'En production',
                      statusKind: 'live',
                      tabLabel: 'App mobile',
                      meta: '2026 · Développé en solo',
                      title: 'DishRank',
                      tagline: 'Noter les plats, pas les restaurants',
                      summary:
                          'Application iOS, Android et web pour noter les plats et retrouver les meilleures assiettes autour de soi. Conçue, développée et publiée en autonomie, de la maquette à la mise en ligne, sur une base de code commune React Native / Next.js avec Supabase côté données.',
                      tech: ['React Native', 'Next.js', 'Supabase', 'TypeScript'],
                      hasStoreBadges: true,
                      screenshots: [
                          { src: '/projects/dishrank/home-sm.webp', alt: 'DishRank — écran d’accueil' },
                          { src: '/projects/dishrank/map-sm.webp', alt: 'DishRank — carte des plats' },
                          { src: '/projects/dishrank/profil-sm.webp', alt: 'DishRank — profil' },
                      ],
                  },
                  {
                      id: 'babynamed',
                      status: 'En production',
                      statusKind: 'live',
                      tabLabel: 'App web',
                      meta: '2026 · Développé en solo',
                      title: 'babyNamed',
                      tagline: 'Choisir le prénom de bébé à deux, à l’aveugle',
                      summary:
                          'Chacun trie les prénoms de son côté, sans voir les réponses de l’autre, et l’application ne montre que ceux que tout le monde aime. Derrière, 21 197 prénoms issus des naissances INSEE, enrichis de leur sens et de leur origine via Wikidata et le Wiktionnaire. Disponible en huit langues, avec connexion sans mot de passe et paiement intégré ; une coquille Expo prépare les versions iOS et Android.',
                      tech: ['Nuxt', 'Cloudflare D1', 'Python', 'Expo'],
                      links: [{ label: 'babynamed.fr', url: 'https://babynamed.fr', track: 'babynamed_web' }],
                      screenshots: BABYNAMED_SHOTS_FR,
                  },
                  {
                      id: 'damnclaude',
                      status: 'Open source',
                      statusKind: 'oss',
                      tabLabel: 'Open source',
                      meta: '2026 · Projet personnel',
                      title: 'Damn Claude',
                      tagline: 'Un carnet de sport et de nutrition que Claude sait lire',
                      summary:
                          'Programme et séances, minuteur de repos, repas, recettes et courses, poids suivi avec une balance connectée : tout vit sur le téléphone, qui reste la source de vérité. Un serveur MCP laisse Claude consulter ces données et proposer des ajustements, acceptés ou refusés un par un : rien ne s’écrit sans validation. Open source, couvert par plus de 1 400 tests, chacun peut héberger sa propre instance.',
                      tech: ['Nuxt 4', 'TypeScript', 'MCP', 'Passkeys'],
                      links: [{ label: 'Code source', url: 'https://github.com/Gregoire63/damn-claude', track: 'damnclaude_github' }],
                      screenshots: DAMNCLAUDE_SHOTS_FR,
                  },
              ],
          }
        : {
              label: 'Selection',
              title: 'Selected work',
              description: 'Products designed, built and shipped to production on my own.',
              cases: [
                  {
                      id: 'dishrank',
                      status: 'Live in production',
                      statusKind: 'live',
                      tabLabel: 'Mobile app',
                      meta: '2026 · Built solo',
                      title: 'DishRank',
                      tagline: 'Rate dishes, not restaurants',
                      summary:
                          'An iOS, Android and web app to rate dishes and find the best plates around you. Designed, built and published on my own, from mockup to release, on a shared React Native / Next.js codebase with Supabase for the data.',
                      tech: ['React Native', 'Next.js', 'Supabase', 'TypeScript'],
                      hasStoreBadges: true,
                      screenshots: [
                          { src: '/projects/dishrank/home-sm.webp', alt: 'DishRank — home screen' },
                          { src: '/projects/dishrank/map-sm.webp', alt: 'DishRank — dish map' },
                          { src: '/projects/dishrank/profil-sm.webp', alt: 'DishRank — profile' },
                      ],
                  },
                  {
                      id: 'babynamed',
                      status: 'Live in production',
                      statusKind: 'live',
                      tabLabel: 'Web app',
                      meta: '2026 · Built solo',
                      title: 'babyNamed',
                      tagline: 'Pick a baby name together, blind',
                      summary:
                          'Each partner sorts names on their own without seeing the other’s answers, and the app only shows the names everyone likes. Behind it: 21,197 first names from French INSEE birth data, enriched with meaning and origin from Wikidata and Wiktionary. Available in eight languages, with passwordless sign-in and built-in payments; an Expo shell is getting the iOS and Android versions ready.',
                      tech: ['Nuxt', 'Cloudflare D1', 'Python', 'Expo'],
                      links: [{ label: 'babynamed.fr', url: 'https://babynamed.fr', track: 'babynamed_web' }],
                      screenshots: BABYNAMED_SHOTS_EN,
                  },
                  {
                      id: 'damnclaude',
                      status: 'Open source',
                      statusKind: 'oss',
                      tabLabel: 'Open source',
                      meta: '2026 · Personal project',
                      title: 'Damn Claude',
                      tagline: 'A training and nutrition log that Claude can read',
                      summary:
                          'Programmes and sessions, rest timer, meals, recipes and shopping lists, weight tracked with a connected scale: everything lives on the phone, which stays the source of truth. An MCP server lets Claude read that data and suggest adjustments, accepted or rejected one by one: nothing is written without approval. Open source, covered by 1,400+ tests, and anyone can host their own instance.',
                      tech: ['Nuxt 4', 'TypeScript', 'MCP', 'Passkeys'],
                      links: [{ label: 'Source code', url: 'https://github.com/Gregoire63/damn-claude', track: 'damnclaude_github' }],
                      screenshots: DAMNCLAUDE_SHOTS_EN,
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

// ─────────────────────────────────────────────────────────────
// Carrousel à onglets : les quatre noms restent visibles, une seule fiche est
// affichée. Les autres sont masquées (v-show) mais restent dans le HTML prérendu,
// donc indexées. Pas de défilement automatique.
// ─────────────────────────────────────────────────────────────
const activeIndex = ref(0)
const caseCount = computed(() => content.value.cases.length)
// Sens du dernier changement : la nouvelle fiche arrive de ce côté, l'ancienne part de l'autre
const direction = ref<'next' | 'prev'>('next')
const tablistRef = ref<HTMLElement | null>(null)
const tabEls: HTMLElement[] = []

const setTabRef = (el: unknown, index: number) => {
    if (el instanceof HTMLElement) tabEls[index] = el
}

// Sur mobile, la bande d'onglets défile horizontalement : on y garde l'onglet actif
// visible, sans faire défiler la page.
const scrollTabIntoStrip = (index: number) => {
    const strip = tablistRef.value
    const tab = tabEls[index]
    if (!strip || !tab || strip.scrollWidth <= strip.clientWidth) return
    strip.scrollTo({ left: tab.offsetLeft - 16, behavior: prefersReducedMotion.value ? 'auto' : 'smooth' })
}

// Les fiches n'ont pas toutes la même hauteur : après un changement par les flèches
// du bas ou un glissement, on remonte au haut du carrousel s'il est sorti de l'écran.
const revealCarousel = () => {
    const top = tablistRef.value?.getBoundingClientRect().top
    if (top === undefined || top >= 90) return
    window.scrollTo({ top: window.scrollY + top - 110, behavior: prefersReducedMotion.value ? 'auto' : 'smooth' })
}

// `dir` est imposé par les flèches et le glissement (qui bouclent : « suivant »
// depuis la dernière fiche revient à la première, en arrivant par la droite) ;
// pour un onglet, le sens découle de sa position par rapport à l'onglet actif.
const selectCase = (
    index: number,
    { focus = false, reveal = false, dir }: { focus?: boolean; reveal?: boolean; dir?: 'next' | 'prev' } = {},
) => {
    const n = caseCount.value
    const next = ((index % n) + n) % n
    if (next !== activeIndex.value) {
        direction.value = dir ?? (next > activeIndex.value ? 'next' : 'prev')
        activeIndex.value = next
        if (typeof gtag !== 'undefined') {
            gtag('event', 'select_content', {
                content_type: 'case_study',
                item_id: content.value.cases[next]?.id,
            })
        }
    }
    nextTick(() => {
        scrollTabIntoStrip(next)
        if (focus) tabEls[next]?.focus()
        if (reveal) revealCarousel()
    })
}

// Clavier sur les onglets, selon le motif « tabs » du WAI-ARIA : flèches, Début, Fin
const onTabKeydown = (e: KeyboardEvent, index: number) => {
    const targets: Record<string, [number, 'next' | 'prev' | undefined]> = {
        ArrowRight: [index + 1, 'next'],
        ArrowLeft: [index - 1, 'prev'],
        Home: [0, undefined],
        End: [caseCount.value - 1, undefined],
    }
    const target = targets[e.key]
    if (!target) return
    e.preventDefault()
    selectCase(target[0], { focus: true, dir: target[1] })
}

// Glissement horizontal du doigt. Ignoré sur la bande de captures, qui défile elle-même.
let touchStart: { x: number; y: number } | null = null

const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0]
    const onShots = (e.target as HTMLElement | null)?.closest('.case-shots')
    touchStart = t && !onShots ? { x: t.clientX, y: t.clientY } : null
}

const onTouchEnd = (e: TouchEvent) => {
    const t = e.changedTouches[0]
    if (!touchStart || !t) return
    const dx = t.clientX - touchStart.x
    const dy = t.clientY - touchStart.y
    touchStart = null
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        selectCase(activeIndex.value + (dx < 0 ? 1 : -1), { reveal: true, dir: dx < 0 ? 'next' : 'prev' })
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

            <!-- Carrousel à onglets -->
            <div
                v-motion
                :initial="prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 40 }"
                :visibleOnce="
                    prefersReducedMotion
                        ? { opacity: 1 }
                        : {
                              opacity: 1,
                              y: 0,
                              transition: { type: 'spring', stiffness: 80, damping: 20, delay: 0.15 },
                          }
                "
                class="cases-carousel"
            >
                <div ref="tablistRef" class="case-tabs" role="tablist" :aria-label="content.title">
                    <button
                        v-for="(cs, index) in content.cases"
                        :id="`case-tab-${cs.id}`"
                        :key="cs.id"
                        :ref="(el) => setTabRef(el, index)"
                        type="button"
                        role="tab"
                        class="case-tab"
                        :class="{ active: index === activeIndex }"
                        :aria-selected="index === activeIndex"
                        :aria-controls="`case-panel-${cs.id}`"
                        :aria-label="`${cs.title}, ${cs.tabLabel}`"
                        :tabindex="index === activeIndex ? 0 : -1"
                        @click="selectCase(index)"
                        @keydown="onTabKeydown($event, index)"
                    >
                        <span class="case-tab-index">{{ String(index + 1).padStart(2, '0') }}</span>
                        <span class="case-tab-title">{{ cs.title }}</span>
                        <span class="case-tab-kind">{{ cs.tabLabel }}</span>
                    </button>
                </div>

                <div class="cases-stage" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
                    <Transition v-for="(cs, index) in content.cases" :key="cs.id" :name="`case-slide-${direction}`">
                        <article
                            v-show="index === activeIndex"
                            :id="`case-panel-${cs.id}`"
                            class="case-study"
                            role="tabpanel"
                            :aria-labelledby="`case-tab-${cs.id}`"
                        >
                            <!-- Meta column -->
                            <div class="case-meta">
                                <div class="case-badges">
                                    <span class="case-status" :class="cs.statusKind">{{ cs.status }}</span>
                                    <span class="case-date">{{ cs.meta }}</span>
                                </div>
                                <h3 class="case-title">{{ cs.title }}</h3>
                                <p class="case-tagline">{{ cs.tagline }}</p>
                                <div class="case-tech">
                                    <span v-for="tech in cs.tech" :key="tech" class="tech-tag">{{ tech }}</span>
                                </div>
                            </div>

                            <!-- Narrative column -->
                            <div class="case-body">
                                <div class="case-block">
                                    <p class="case-summary">{{ cs.summary }}</p>

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
                                                <small>{{ lang.isFrench ? 'Télécharger dans' : 'Download on the' }}</small>
                                                <strong>{{ lang.isFrench ? "l'App Store" : 'App Store' }}</strong>
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
                                                <small>{{ lang.isFrench ? 'Disponible sur' : 'Get it on' }}</small>
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

                                    <!-- Liens (projets sans badges de stores) -->
                                    <div v-else-if="cs.links" class="store-badges">
                                        <a
                                            v-for="link in cs.links"
                                            :key="link.url"
                                            :href="link.url"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            class="web-link"
                                            @click="trackOutbound(link.track)"
                                        >
                                            {{ link.label }}
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

                                    <!-- Captures d'écran -->
                                    <div v-if="cs.screenshots" class="case-shots">
                                        <img
                                            v-for="shot in cs.screenshots"
                                            :key="shot.src"
                                            :src="shot.src"
                                            :alt="shot.alt"
                                            :width="SHOT_WIDTH"
                                            :height="SHOT_HEIGHT"
                                            loading="lazy"
                                            class="case-shot"
                                        />
                                    </div>
                                </div>
                            </div>
                        </article>
                    </Transition>
                </div>

                <!-- Flèches et position -->
                <div class="case-controls">
                    <button
                        type="button"
                        class="case-arrow"
                        :aria-label="lang.isFrench ? 'Projet précédent' : 'Previous project'"
                        @click="selectCase(activeIndex - 1, { reveal: true, dir: 'prev' })"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </button>
                    <span class="case-counter" aria-live="polite">
                        {{ String(activeIndex + 1).padStart(2, '0') }} / {{ String(caseCount).padStart(2, '0') }}
                        <span class="sr-only">· {{ content.cases[activeIndex]?.title }}</span>
                    </span>
                    <button
                        type="button"
                        class="case-arrow"
                        :aria-label="lang.isFrench ? 'Projet suivant' : 'Next project'"
                        @click="selectCase(activeIndex + 1, { reveal: true, dir: 'next' })"
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </button>
                </div>
            </div>
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
    margin-bottom: var(--space-lg);
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
}

.case-meta,
.case-body {
    min-width: 0;
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

.case-status.oss {
    color: var(--accent-strong);
    background: var(--accent-tertiary);
    border: 1px solid var(--accent-secondary);
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

.case-summary {
    font-size: 1rem;
    line-height: 1.8;
    color: var(--text-secondary);
    margin: 0;
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

/* ---------- Carrousel à onglets ---------- */
.case-tabs {
    position: relative;
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    gap: var(--space-sm);
    margin-bottom: var(--space-md);
}

.case-tab {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
    min-width: 0;
    padding: 0.85rem 1.1rem;
    font: inherit;
    text-align: left;
    color: var(--text-secondary);
    background: transparent;
    border: 1px solid var(--bg-accent);
    border-radius: 16px;
    cursor: pointer;
    transition:
        background 0.25s var(--ease-smooth),
        border-color 0.25s var(--ease-smooth),
        color 0.25s var(--ease-smooth),
        box-shadow 0.25s var(--ease-smooth);
}

@media (hover: hover) and (pointer: fine) {
    .case-tab:not(.active):hover {
        color: var(--text-primary);
        border-color: var(--accent-secondary);
    }
}

.case-tab.active {
    color: var(--text-primary);
    background: var(--bg-primary);
    border-color: var(--accent-primary);
    box-shadow: 0 12px 30px rgba(139, 111, 92, 0.14);
}

.case-tab-index {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    letter-spacing: 0.12em;
    color: var(--accent-strong);
}

.case-tab-title {
    max-width: 100%;
    font-family: var(--font-display);
    font-size: 1.125rem;
    font-weight: 700;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.case-tab-kind {
    font-family: var(--font-mono);
    font-size: 0.6875rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-secondary);
}

/* Une fiche à la fois. Pendant un changement, l'ancienne et la nouvelle partagent
   la même cellule de grille : elles se croisent sans pousser le reste de la page.
   La nouvelle arrive du côté où l'on va, l'ancienne s'efface de l'autre côté. */
.cases-stage {
    display: grid;
}

.cases-stage > .case-study {
    grid-area: 1 / 1;
}

.case-slide-next-enter-active,
.case-slide-next-leave-active,
.case-slide-prev-enter-active,
.case-slide-prev-leave-active {
    transition:
        opacity 0.45s var(--ease-smooth),
        transform 0.55s var(--ease-out);
}

.case-slide-next-leave-active,
.case-slide-prev-leave-active {
    pointer-events: none;
}

.case-slide-next-enter-from,
.case-slide-prev-leave-to {
    opacity: 0;
    transform: translateX(80px);
}

.case-slide-next-leave-to,
.case-slide-prev-enter-from {
    opacity: 0;
    transform: translateX(-80px);
}

/* Moins d'animations : un simple fondu, sans déplacement */
@media (prefers-reduced-motion: reduce) {
    .case-slide-next-enter-from,
    .case-slide-prev-leave-to,
    .case-slide-next-leave-to,
    .case-slide-prev-enter-from {
        transform: none;
    }
}

.case-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-sm);
    margin-top: var(--space-md);
}

.case-arrow {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    color: var(--accent-strong);
    background: var(--bg-primary);
    border: 1px solid var(--accent-secondary);
    border-radius: 50%;
    cursor: pointer;
    transition:
        background 0.25s var(--ease-smooth),
        color 0.25s var(--ease-smooth),
        border-color 0.25s var(--ease-smooth);
}

@media (hover: hover) and (pointer: fine) {
    .case-arrow:hover {
        color: var(--bg-primary);
        background: var(--accent-primary);
        border-color: var(--accent-primary);
    }
}

.case-counter {
    min-width: 8ch;
    font-family: var(--font-mono);
    font-size: 0.8125rem;
    letter-spacing: 0.12em;
    text-align: center;
    color: var(--text-secondary);
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

    .case-title {
        font-size: 1.5rem;
    }

    /* Onglets : bande qui défile horizontalement, bord à bord */
    .case-tabs {
        display: flex;
        overflow-x: auto;
        scroll-snap-type: x mandatory;
        scroll-padding-left: var(--space-md);
        gap: var(--space-xs);
        margin: 0 calc(-1 * var(--space-md)) var(--space-sm);
        padding: 0.25rem var(--space-md) 0.75rem;
        scrollbar-width: none;
    }

    .case-tabs::-webkit-scrollbar {
        display: none;
    }

    .case-tab {
        flex: 0 0 auto;
        max-width: 70vw;
        padding: 0.7rem 0.95rem;
        scroll-snap-align: start;
    }

    .case-tab-title {
        font-size: 1rem;
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
