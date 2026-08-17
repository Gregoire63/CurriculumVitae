<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { PROGRAM } from '~/data/sportProgram'
import { gearFor, variantName, variantsOf } from '~/data/exerciseVariants'
import type { Session, Exercise } from '~/data/sportProgram'
import { useWorkout } from '~/composables/useWorkout'
import type { SessionRecord } from '~/composables/useWorkout'
import { useRestTimer } from '~/composables/useRestTimer'
import { useProfile } from '~/composables/useProfile'
import { useWithings } from '~/composables/useWithings'
import { usePhotos } from '~/composables/usePhotos'
import { useVault } from '~/composables/useVault'
import { useSnapshot } from '~/composables/useSnapshot'
import { WARMUP_REST, fmtRest, restFor } from '~/lib/rest'
import { warmupLoad, EFFORT_OPTIONS, isEffort, isoOf, shiftIso } from '~/utils/sportStats'
import type { Effort, PrKind } from '~/utils/sportStats'
import '~/assets/css/sport.css'
import '~/assets/css/nutrition.css'

useHead({
  title: 'Suivi Séances — Grégoire Raturat',
  meta: [
    { name: 'theme-color', content: '#fefcf8' },
    // apple-mobile-web-app-capable est déprécié, mais reste nécessaire pour les
    // anciennes versions d'iOS : on déclare les deux.
    { name: 'mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
    { name: 'apple-mobile-web-app-title', content: 'Séances' },
    { name: 'robots', content: 'noindex' },
  ],
  link: [
    // Même `key` que le manifest global (nuxt.config) → sur /sport, ce manifest
    // le remplace, donc l'app installée depuis /sport démarre sur /sport.
    { rel: 'manifest', href: '/sport/manifest.webmanifest', key: 'manifest' },
    { rel: 'apple-touch-icon', href: '/sport/icon-192.png', key: 'apple-touch-icon' },
  ],
})

const {
  bodyWeight, bodyWeightAt, lastPerf, lastOn, ratioFor, lastEffort, recordSession, updateSession, suggestWeight, sessionLog, seedDemo, fatigue,
} = useWorkout()
const { start: startRest, secondsLeft: restLeft, stop: stopRest, addTime: addRest } = useRestTimer()
const restFmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const { weekPlan, sessionIdFor, isPlanMoved, hydrate: hydrateProfile } = useProfile()

// ─────────── Muscles ───────────
// Libellés COMPACTS pour les pastilles des cartes de séance (les 3 faisceaux
// d'épaule y sont regroupés, sinon la carte déborde). L'analyse de volume, elle,
// les distingue — cf. MUSCLE_LABELS dans utils/sportStats.
const MUSCLE_LABELS: Record<string, string> = {
  pecs: 'Pecs', 'epaules-av': 'Épaules', 'epaules-lat': 'Épaules', 'epaules-ar': 'Épaules',
  triceps: 'Triceps', biceps: 'Biceps', 'avant-bras': 'Avant-bras', abdos: 'Abdos',
  dos: 'Dos', lombaires: 'Lombaires', quadris: 'Quadris', ischios: 'Ischios', fessiers: 'Fessiers', mollets: 'Mollets',
}
function sessionMuscles(s: Session): string[] {
  const seen: string[] = []
  for (const e of s.exercises) for (const m of e.muscles) {
    const l = MUSCLE_LABELS[m] || m
    if (!seen.includes(l)) seen.push(l)
  }
  return seen.slice(0, 4)
}
function exMuscles(e: Exercise): string[] {
  const seen: string[] = []
  for (const m of e.muscles) { const l = MUSCLE_LABELS[m] || m; if (!seen.includes(l)) seen.push(l) }
  return seen.slice(0, 4)
}

// ─────────── Semaine (planning adaptatif) ───────────
// Libellés courts de la semaine : calqués sur le nom de chaque séance pour éviter
// toute confusion (« Push » / « Bras » étaient ambigus entre les 2 jours pecs).
const SHORT: Record<string, string> = { s1: 'Pecs/Ép', s2: 'Dos/Bic', s3: 'Jambes', s4: 'Pecs/Bras' }
const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const sessionById = (id: string | null) => (id ? PROGRAM.find(p => p.id === id) || null : null)

// ─────────── Jour actuel (client) ───────────
const todayDow = ref<number | null>(null)
const todayISO = ref<string | null>(null)
const todayIndex = computed(() => (todayDow.value === null ? null : (todayDow.value + 6) % 7))

/**
 * La semaine affichée est celle des DATES en cours, pas la semaine type.
 *
 * Une séance déplacée depuis le calendrier — « vendredi je ne peux pas, je la fais
 * samedi » — doit apparaître le samedi, ici comme dans la journée du jour. Tant que
 * la bande lisait `weekPlan` directement, elle continuait d'annoncer un vendredi
 * salle et un samedi repos, en contradiction avec les calories déjà ajustées.
 *
 * Avant que la date du client soit connue (rendu initial), on retombe sur la semaine
 * type : c'est le bon défaut, et il ne peut pas être faux plus d'un instant.
 */
const weekIsos = computed<(string | null)[]>(() => {
  if (!todayISO.value || todayIndex.value === null) return [null, null, null, null, null, null, null]
  const monday = shiftIso(todayISO.value, -todayIndex.value)
  return Array.from({ length: 7 }, (_, i) => shiftIso(monday, i))
})
const weekDays = computed(() => weekIsos.value.map((iso, i) => {
  const s = sessionById(iso ? sessionIdFor(iso) : weekPlan.value[i])
  return { dow: DOW[i], session: s, short: s ? SHORT[s.id] : '', sprint: !!s?.sprint, moved: !!iso && isPlanMoved(iso) }
}))
const todayEntry = computed(() => (todayIndex.value === null ? null : weekDays.value[todayIndex.value]))
const todaySession = computed(() => todayEntry.value?.session ?? null)
const nextSession = computed(() => {
  if (todayIndex.value === null) return null
  for (let i = 1; i <= 7; i++) { const e = weekDays.value[(todayIndex.value + i) % 7]; if (e.session) return e }
  return null
})
const otherSessions = computed(() => { const id = todaySession.value?.id; return PROGRAM.filter(s => s.id !== id) })
const doneToday = computed(() => (todayISO.value ? sessionLog().filter(s => s.at.slice(0, 10) === todayISO.value) : []))
// Séance du jour déjà enregistrée (→ bouton « Modifier » au lieu de « Démarrer »)
const todayRecord = computed(() => {
  if (!todaySession.value) return null
  return doneToday.value.find(s => s.sessionId === todaySession.value!.id) ?? null
})

// ─────────── État UI ───────────
type View = 'home' | 'history' | 'rapport' | 'nutrition' | 'profil'
const view = ref<View>('home')
// Message d'échec du retour OAuth Withings (affiché une fois, en haut de l'onglet).
const withingsError = ref<string | null>(null)
const activeSession = ref<Session | null>(null)
const openEx = ref<string | null>(null)
const flash = ref('')
// L'écran de chargement est géré par Nuxt (spa-loading-template.html) : /sport est
// rendu 100 % client (ssr:false), donc plus de « gel » d'hydratation à masquer ici.
const draft = reactive<Record<string, { w: string; r: string; done: boolean; warm: boolean; w2: string; r2: string }[]>>({})
// Ressenti déclaré par exercice (facile / correct / dur / échec) : c'est lui qui
// permet d'auto-réguler la charge conseillée à la séance suivante.
const draftEffort = reactive<Record<string, Effort>>({})
// Matériel différent de la fois d'avant : la charge n'est plus comparable, les
// records et la stagnation repartent d'ici. Cf. `sinceSwap` dans utils/sportStats.
const draftSwap = reactive<Record<string, true>>({})
// Note libre de la séance (douleur, sommeil, machine occupée…) : c'est ce qui
// explique une mauvaise séance quand on la relit des semaines plus tard.
const sessionNote = ref('')
// Commentaire PAR exercice. La note de séance répond à « comment allait la
// journée » ; celle-ci répond à « pourquoi ce mouvement-là a bougé » — et c'est
// cette réponse-là qu'on veut relire la fois suivante, au moment de recharger la
// barre, pas trois semaines plus tard en bas d'une séance.
const draftNote = reactive<Record<string, string>>({})
// Machine réellement utilisée, par exercice. Vide = celle du programme.
//
// C'est ce qui remplace « la charge n'est plus comparable » : au lieu de couper
// l'historique en deux le jour où le rack est pris, on déclare SUR QUOI on a
// travaillé, et les comparaisons se font en équivalent référence.
const draftVariant = reactive<Record<string, string>>({})
// L'exercice dont la feuille « choisir une machine » est ouverte.
const picking = ref<string | null>(null)
const pickingEx = computed(() => activeSession.value?.exercises.find(e => e.id === picking.value) ?? null)
/**
 * L'exercice dont le commentaire est en cours d'écriture.
 *
 * Le champ était déplié DANS la carte, tout en bas, sous les séries et les
 * sensations. Écrire trois mots demandait donc d'ouvrir la carte, de la faire
 * défiler jusqu'au bout, puis d'écrire dans un écran qui bougeait sous le clavier
 * — pour une phrase qu'on tape entre deux séries, une main sur la barre.
 *
 * En fenêtre, le geste tient en deux touches : 💬, on écrit, terminé. La carte
 * n'a plus besoin d'être ouverte, et le champ est au milieu de l'écran, seul.
 */
const noting = ref<string | null>(null)
const notingEx = computed(() => activeSession.value?.exercises.find(e => e.id === noting.value) ?? null)
/** La fenêtre s'anime en se fermant : on passe par elle plutôt que de couper le `v-if`. */
const notePopup = ref<{ dismiss: () => void } | null>(null)
const closeNote = () => (notePopup.value ? notePopup.value.dismiss() : (noting.value = null))
function clearNote(id: string) {
  delete draftNote[id]
  closeNote()
}
/** Ce qui avait été noté la dernière fois sur cet exercice. */
const previousNote = (id: string) => lastPerf(id)?.note ?? null
const sessionStart = ref(0)
// Édition d'une séance déjà enregistrée (au lieu d'en démarrer une neuve)
const editingRecord = ref<SessionRecord | null>(null)
const editReturn = ref<View>('home')
// Aperçu en lecture seule (quand une séance est déjà en cours et qu'on clique une autre)
const previewSession = ref<Session | null>(null)
// Brouillon de la séance active, sauvegardé en continu (survit à un refresh)
const DRAFT_KEY = 'gr-active-draft-v1'
const sprintMode = ref<'exterieur' | 'tapis'>('exterieur')
const sprintOpen = ref(false)
const sprintInfoOpen = ref(false)
// Saisie des efforts de course : ex. « 3 × 20 s @ 16 km/h »
interface SprintRow { kind: 'echauffement' | 'sprint'; count: string; duration: string; intensity: string }
const sprintDraft = ref<SprintRow[]>([])
function newSprintRows(): SprintRow[] {
  return [
    { kind: 'echauffement', count: '1', duration: '', intensity: '' },
    { kind: 'sprint', count: '', duration: '', intensity: '' },
  ]
}
function addSprintRow(kind: 'echauffement' | 'sprint') { sprintDraft.value.push({ kind, count: '', duration: '', intensity: '' }) }
function removeSprintRow(i: number) { sprintDraft.value.splice(i, 1) }
/**
 * Chrono flottant : visible dès que le VRAI chrono ne l'est plus.
 *
 * Il se déclenchait sur un défilement de 150 px, ce qui n'a rien à voir avec la
 * question posée — le chrono de la colonne d'outils peut très bien être hors champ
 * sans qu'on ait bougé d'un pixel, selon l'exercice qu'on est en train de remplir.
 * On validait alors une série et il ne se passait rien de visible : il fallait
 * faire défiler la page POUR VOIR qu'un décompte avait démarré.
 *
 * On observe donc directement l'élément : présent à l'écran, pas de doublon ;
 * absent, le flottant prend le relais.
 */
const timerBox = ref<HTMLElement | null>(null)
const timerVisible = ref(true)
let timerObserver: IntersectionObserver | null = null
// Position du chrono flottant calée sur le viewport VISIBLE (reste visible clavier ouvert sur iOS)
// Décalé sous l'en-tête collant de la feuille (gap haut ~26 px + en-tête ~56 px).
const floatTop = ref(92)
const keyboardOpen = ref(false)
function onViewport() {
  const vv = import.meta.client ? window.visualViewport : null
  floatTop.value = (vv ? Math.round(vv.offsetTop) : 0) + 92
  keyboardOpen.value = vv ? window.innerHeight - vv.height > 120 : false
}

const titles: Record<View, string> = {
  home: 'Mes séances',
  history: 'Historique', rapport: 'Ma progression',
  nutrition: 'Nutrition', profil: 'Profil',
}
const pageTitle = computed(() => titles[view.value])
// Le Journal juste après l'accueil : c'est le deuxième écran ouvert dans la journée,
// il n'a rien à faire au milieu des vues d'analyse.
const TABS: { id: View; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Accueil' },
  { id: 'history', icon: '🗓', label: 'Journal' },
  { id: 'nutrition', icon: '🍽', label: 'Nutrition' },
  { id: 'rapport', icon: '📈', label: 'Progrès' },
  { id: 'profil', icon: '⚙️', label: 'Profil' },
]

function showFlash(msg: string) { flash.value = msg; setTimeout(() => { flash.value = '' }, 3000) }
const go = (v: View) => { view.value = v }

// ─────────── Chrono séance ───────────
// La durée tourne tant qu'une séance est active (même réduite en mini-feuille),
// pour l'afficher en direct dans la barre « séance en cours ».
const elapsed = ref(0)
let elapsedInt: ReturnType<typeof setInterval> | null = null
const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
watch(() => activeSession.value, (s) => {
  if (elapsedInt) { clearInterval(elapsedInt); elapsedInt = null }
  if (!s) return
  // Édition d'une ancienne séance : le chrono ne redémarre PAS. On affiche
  // simplement la durée enregistrée (figée).
  if (editingRecord.value) {
    elapsed.value = (editingRecord.value.durationMin ?? 0) * 60
    return
  }
  elapsed.value = Math.floor((Date.now() - sessionStart.value) / 1000)
  elapsedInt = setInterval(() => { elapsed.value = Math.floor((Date.now() - sessionStart.value) / 1000) }, 1000)
}, { immediate: true })
onUnmounted(() => { if (elapsedInt) clearInterval(elapsedInt) })

// ─────────── Feuille de séance animée (vrai bottom-sheet, superposé à l'app) ───
// La feuille est un CALQUE au-dessus de l'onglet courant (qui reste rendu
// derrière, avec un voile) : quand on la fait glisser vers le bas, on voit
// l'écran de l'app derrière. sheetOpen est indépendant de `view`.
const sheetOpen = ref(false)
const dragY = ref(0)            // translation verticale courante (px)
const dragging = ref(false)     // doigt en train de glisser → transition figée
const sheetClosing = ref(false) // la feuille descend puis se démonte
let dragStartY = 0
let dragMoved = false
const sheetVisible = computed(() => !!activeSession.value && (sheetOpen.value || sheetClosing.value))
const sheetStyle = computed(() => {
  const t = `translateY(${dragY.value}px)`
  return dragging.value ? { transform: t, transition: 'none' } : { transform: t }
})
// Voile derrière la feuille : opaque à fond, s'éclaircit quand on descend la feuille
const scrimStyle = computed(() => {
  const h = import.meta.client ? window.innerHeight : 800
  const o = Math.max(0, 1 - dragY.value / h)
  return dragging.value ? { opacity: String(o), transition: 'none' } : { opacity: String(o) }
})
function sheetH() { return import.meta.client ? window.innerHeight : 800 }

// Ouvre la feuille : elle monte depuis le bas (par-dessus l'onglet courant)
function expandSession() {
  sheetClosing.value = false
  if (!import.meta.client) { sheetOpen.value = true; return }
  dragging.value = true          // fige la transition pour placer la feuille en bas
  dragY.value = sheetH()
  sheetOpen.value = true
  requestAnimationFrame(() => {
    dragging.value = false        // réactive la transition
    requestAnimationFrame(() => { dragY.value = 0 }) // → remonte en glissant
  })
}
// Anime la DESCENTE de la feuille (glisse vers le bas) puis exécute `after`
// (nettoyage/état) une fois l'animation finie. Utilisé par toutes les fermetures
// (réduire, terminer, abandonner) pour un rendu cohérent.
function animateSheetDown(after?: () => void) {
  const done = after ?? (() => {})
  if (!import.meta.client || (!sheetOpen.value && !sheetClosing.value)) { sheetOpen.value = false; done(); return }
  if (sheetClosing.value) { done(); return }
  sheetClosing.value = true
  sheetOpen.value = false         // l'app derrière redevient active
  requestAnimationFrame(() => { dragY.value = sheetH() })
  setTimeout(() => { sheetClosing.value = false; dragY.value = 0; done() }, 300)
}
// Réduit la feuille : elle descend (l'app est visible derrière) puis se démonte.
// En mode ÉDITION, fermer ne réduit pas : ça propose d'abandonner les modifs.
function collapseSession() {
  if (sheetClosing.value) return
  if (editingRecord.value) { dragY.value = 0; askCancel(); return } // la feuille remonte, on confirme
  animateSheetDown()
}
// Glisser la poignée : la feuille suit le doigt ; relâchée assez bas → réduit.
// On écoute sur window pendant le geste → suit le doigt même hors de l'en-tête,
// pour la souris comme le tactile, sans casser le tap (pas de capture de pointeur).
function onDragMove(e: PointerEvent) {
  if (!dragging.value) return
  const dy = e.clientY - dragStartY
  if (dy > 4) dragMoved = true
  dragY.value = Math.max(0, dy)   // uniquement vers le bas
}
function onDragEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (import.meta.client) {
    window.removeEventListener('pointermove', onDragMove)
    window.removeEventListener('pointerup', onDragEnd)
    window.removeEventListener('pointercancel', onDragEnd)
  }
  if (dragY.value > 110) collapseSession()
  else dragY.value = 0            // pas assez bas → revient en place (animé)
}
function onDragStart(e: PointerEvent) {
  if (sheetClosing.value || !import.meta.client) return
  dragging.value = true; dragMoved = false; dragStartY = e.clientY
  window.addEventListener('pointermove', onDragMove)
  window.addEventListener('pointerup', onDragEnd)
  window.addEventListener('pointercancel', onDragEnd)
}
function requestCollapse() { if (!dragMoved) collapseSession() } // tap sur la poignée

// ─────────── Popup « annuler la séance » (remplace le confirm() natif) ────────
const cancelPromptOpen = ref(false)
function askCancel() { cancelPromptOpen.value = true }

/**
 * Le geste « retour » referme la feuille au lieu de quitter l'application.
 *
 * /sport est la première page de l'historique de la PWA : un balayage arrière n'a
 * rien où revenir, il sort. On lui donne donc quelque chose à consommer, et il fait
 * exactement ce que fait la poignée — `collapseSession`, c'est-à-dire replier la
 * feuille sans rien arrêter, ou, en pleine modification d'une séance enregistrée,
 * ouvrir la confirmation d'abandon qui existe déjà pour ce cas.
 *
 * Armé sur la feuille OUVERTE et non sur la séance : une fois la feuille repliée, la
 * séance continue mais le retour redevient le retour. C'est ce qu'on attend d'un
 * deuxième geste de suite, et ça évite d'enfermer l'utilisateur dans l'application.
 */
useBackGuard(computed(() => !!activeSession.value && sheetOpen.value), () => collapseSession())

/**
 * L'exercice dont on valide la « reprise en main ».
 *
 * Le bouton ne bascule plus directement. Ce réglage remet les records et la
 * progression à zéro à partir de cette séance : c'est irréversible dans les
 * courbes, et une icône seule ne peut pas porter ça. On explique dans la carte,
 * au moment où la question se pose.
 */
const swapAsk = ref<string | null>(null)
const swapEx = computed(() => activeSession.value?.exercises.find(e => e.id === swapAsk.value) ?? null)
function confirmSwap() {
  if (swapAsk.value) toggleSwap(swapAsk.value)
  swapAsk.value = null
}
function confirmCancel() {
  cancelPromptOpen.value = false
  animateSheetDown(() => clearActive()) // la feuille glisse vers le bas puis se ferme
}

/**
 * Les lignes de saisie d'un exercice, préremplies pour LA MACHINE choisie.
 *
 * On repart de la dernière séance faite sur cette machine-là — c'est le repère le
 * plus sûr, il n'a besoin d'aucune conversion. À défaut (première fois sur cette
 * machine), on prend le conseil de charge, qui lui est converti depuis l'historique
 * de la référence : c'est exactement ce dont on a besoin le jour où le rack est pris.
 */
/**
 * Reprend une charge d'une séance passée, en la remettant au poids d'aujourd'hui.
 *
 * Sur un exercice au poids du corps — dips, tractions — la charge notée est le
 * TOTAL soulevé : le corps plus le lest. Recopier telle quelle celle de la dernière
 * séance revenait donc à recopier aussi le poids de corps de ce jour-là, et il ne
 * bougeait plus jamais. Trois kilos perdus, et l'application continuait de proposer
 * 94 : la courbe de progression restait plate, les dips passaient pour « bloqués »
 * chaque semaine, et le rapport affichait trois kilos de lest fantôme sur des séries
 * faites sans ceinture.
 *
 * Ce qu'il faut reprendre, c'est le LEST — la seule part qui soit une décision.
 * On le retrouve en retirant le poids de corps du jour de la séance, et on le
 * rajoute au poids d'aujourd'hui.
 *
 * Sans pesée à l'une des deux dates on ne convertit rien : mieux vaut proposer
 * l'ancienne valeur, visiblement à corriger, qu'un chiffre calculé sur un poids
 * inventé.
 */
function rebase(e: Exercise, valeur: number | null | undefined, dateSeance: string): string {
  if (valeur == null) return ''
  if (!e.bodyweight) return String(valeur)
  const alors = bodyWeightAt(dateSeance)
  const maintenant = latestWeight.value
  if (alors === null || maintenant === null) return String(valeur)
  const lest = valeur - alors
  return String(Math.round((maintenant + lest) * 10) / 10)
}

function prefillRows(e: Exercise, variant?: string): DraftRow[] {
  const bw = latestWeight.value ?? 0 // poids de corps mesuré, pour les exos au poids du corps
  const last = lastOn(e.id, variant)
  let rows: DraftRow[]
  if (last && last.sets.length) {
    // Poids ET reps des séries de travail préremplis. Rien n'est coché → il n'y a
    // plus qu'à ajuster et valider.
    rows = last.sets.map(st => ({
      w: rebase(e, st.w, last.date),
      r: st.r != null ? String(st.r) : '',
      done: false,
      warm: !!st.warm,
      w2: rebase(e, st.w2, last.date),
      r2: st.r2 != null ? String(st.r2) : '',
    }))
  } else {
    const sug = suggestWeight(e, variant)
    rows = Array.from({ length: e.sets }, () => ({
      w: e.bodyweight && bw ? String(bw) : (sug.weight ? String(sug.weight) : ''),
      r: '', done: false, warm: false, w2: '', r2: '',
    }))
  }
  // Échauffement auto : une série d'échauffement en tête, calculée sur la charge
  // de travail la plus lourde (voir withWarmup) — remplace tout échauffement repris.
  return withWarmup(e, rows)
}

/**
 * Changer de machine en cours de route. On reprend le préremplissage — c'est tout
 * l'intérêt : les kilos affichés sont ceux à mettre SUR CETTE machine-là. Sauf si
 * des séries sont déjà validées : on ne réécrit jamais ce qui a été fait.
 */
function pickVariant(exId: string, id: string | null) {
  const ex = activeSession.value?.exercises.find(e => e.id === exId)
  picking.value = null
  if (!ex) return
  if (id) draftVariant[exId] = id
  else delete draftVariant[exId]
  if (!(draft[exId] || []).some(r => r.done)) draft[exId] = prefillRows(ex, id ?? undefined)
}

// ─────────── Séance ───────────
function startSession(s: Session) {
  // Une séance est déjà en cours : impossible d'en démarrer une autre.
  // Même séance → on la reprend ; autre séance → aperçu en lecture seule.
  if (activeSession.value) {
    if (activeSession.value.id === s.id) expandSession()
    else previewSession.value = s
    return
  }
  activeSession.value = s
  editingRecord.value = null
  for (const k of Object.keys(draft)) delete draft[k]
  for (const k of Object.keys(draftEffort)) delete draftEffort[k]
  for (const k of Object.keys(draftSwap)) delete draftSwap[k]
  for (const k of Object.keys(draftNote)) delete draftNote[k]
  for (const k of Object.keys(draftVariant)) delete draftVariant[k]
  sessionNote.value = ''
  for (const e of s.exercises) draft[e.id] = prefillRows(e)
  openEx.value = s.exercises[0].id
  sprintOpen.value = false
  sprintInfoOpen.value = false
  sprintDraft.value = s.sprint ? newSprintRows() : []
  sessionStart.value = Date.now()
  expandSession()
}
// Rouvre une séance déjà enregistrée pour la modifier (préremplie avec les perfs saisies)
function editSession(rec: SessionRecord) {
  if (activeSession.value) { showFlash('Termine ou abandonne ta séance en cours avant d’en modifier une autre.'); return }
  const s = sessionById(rec.sessionId) || PROGRAM.find(p => p.name === rec.name)
  if (!s) return
  activeSession.value = s
  editingRecord.value = rec
  editReturn.value = view.value
  for (const k of Object.keys(draft)) delete draft[k]
  for (const k of Object.keys(draftEffort)) delete draftEffort[k]
  for (const k of Object.keys(draftSwap)) delete draftSwap[k]
  for (const k of Object.keys(draftNote)) delete draftNote[k]
  for (const k of Object.keys(draftVariant)) delete draftVariant[k]
  sessionNote.value = rec.note ?? ''
  const bw = latestWeight.value ?? 0
  for (const e of s.exercises) {
    const entry = rec.entries.find(en => en.exId === e.id)
    if (entry && isEffort(entry.effort)) draftEffort[e.id] = entry.effort
    if (entry?.swap) draftSwap[e.id] = true
    if (entry?.note) draftNote[e.id] = entry.note
    if (entry?.variant) draftVariant[e.id] = entry.variant
    if (entry && entry.sets.length) {
      draft[e.id] = entry.sets.map(st => ({
        w: st.w != null ? String(st.w) : '',
        r: st.r != null ? String(st.r) : '',
        done: true,
        warm: !!st.warm,
        w2: st.w2 != null ? String(st.w2) : '',
        r2: st.r2 != null ? String(st.r2) : '',
      }))
    } else {
      draft[e.id] = Array.from({ length: e.sets }, () => ({
        w: e.bodyweight && bw ? String(bw) : '', r: '', done: false, warm: false, w2: '', r2: '',
      }))
    }
  }
  openEx.value = s.exercises[0].id
  sprintOpen.value = false
  sprintInfoOpen.value = false
  sprintDraft.value = (rec.sprint && rec.sprint.length)
    ? rec.sprint.map(sp => ({ kind: sp.kind, count: String(sp.count), duration: sp.duration, intensity: sp.intensity }))
    : (s.sprint ? newSprintRows() : [])
  sessionStart.value = Date.now() - (rec.durationMin ?? 0) * 60000
  expandSession()
}
// On ne compte que les séries de travail (l'échauffement ne compte pas)
const doneCount = (exId: string) => (draft[exId] || []).filter(s => s.done && !s.warm).length
const workCount = (exId: string) => (draft[exId] || []).filter(s => !s.warm).length
// Un exercice est « fini » quand toutes ses séries de travail sont cochées
const isExDone = (exId: string) => { const wc = workCount(exId); return wc > 0 && doneCount(exId) === wc }
const finishedCount = computed(() => (activeSession.value ? activeSession.value.exercises.filter(e => isExDone(e.id)).length : 0))
// On ne peut enregistrer une NOUVELLE séance qu'à partir de 80% d'exercices finis
// (en édition, toujours possible).
const finishReady = computed(() => {
  if (editingRecord.value) return true
  const total = activeSession.value?.exercises.length ?? 0
  return total ? finishedCount.value / total >= 0.8 : true
})
// Un 2e tap sur le même ressenti l'annule (on peut se tromper de bouton)
function setEffort(exId: string, v: Effort) {
  if (draftEffort[exId] === v) delete draftEffort[exId]
  else draftEffort[exId] = v
}
function toggleSwap(exId: string) {
  if (draftSwap[exId]) delete draftSwap[exId]
  else draftSwap[exId] = true
}
function addSet(exId: string) { const rows = draft[exId]; const lastW = [...rows].reverse().find(s => !s.warm); rows.push({ w: lastW?.w ?? '', r: '', done: false, warm: false, w2: lastW?.w2 ?? '', r2: '' }) }
function addWarmup(exId: string) { const wu = warmupFor(exId); draft[exId].unshift({ w: wu !== null ? String(wu) : '', r: '', done: false, warm: true, w2: '', r2: '' }) }
function removeSet(exId: string, i: number) { if (draft[exId].length > 1) draft[exId].splice(i, 1) }
// Libellé : « Éch » pour l'échauffement, sinon numéro de série de travail
function setLabel(rows: { warm: boolean }[], i: number) {
  if (rows[i].warm) return 'Éch'
  let n = 0
  for (let k = 0; k <= i; k++) if (!rows[k].warm) n++
  return 'S' + n
}
function toggleSet(s: { done: boolean; warm: boolean }, e: Exercise) {
  s.done = !s.done
  if (s.done) startRest(s.warm ? WARMUP_REST : restFor(e))
}
type DraftRow = { w: string; r: string; done: boolean; warm: boolean; w2: string; r2: string }
// Charge d'échauffement d'un exercice, d'après la série de travail la plus lourde
// actuellement saisie (utilisée par le bouton « + Échauffement »).
function warmupFor(exId: string): number | null {
  const work = (draft[exId] || []).filter(s => !s.warm)
  return warmupLoad(Math.max(0, ...work.map(r => parseFloat(r.w) || 0)))
}
// Échauffement auto : sur un exercice suffisamment chargé (hors poids du corps et
// hors superset), on garantit UNE série d'échauffement en tête, calculée à ~50 % de
// la charge de travail la plus lourde (arrondie à 2,5 kg). Recalculée à chaque
// démarrage à partir des séries de travail préremplies — donc de tes dernières perfs.
// Tout échauffement repris de l'ancienne séance est remplacé par cette série calculée.
function withWarmup(e: Exercise, rows: DraftRow[]): DraftRow[] {
  const work = rows.filter(r => !r.warm)
  if (e.bodyweight || e.superset) return work // pas d'échauffement chiffré ici
  const wu = warmupLoad(Math.max(0, ...work.map(r => parseFloat(r.w) || 0)))
  if (wu === null) return work // charge trop légère → échauffement inutile
  return [{ w: String(wu), r: '10', done: false, warm: true, w2: '', r2: '' }, ...work]
}
// Ferme la séance active : coupe le chrono de repos, vide le brouillon (mémoire +
// stockage). Appelé quand la séance est terminée (enregistrée) ou abandonnée.
function clearActive() {
  stopRest() // coupe le chrono de repos (son/vibration/keep-alive)
  activeSession.value = null
  editingRecord.value = null
  previewSession.value = null
  sheetOpen.value = false; sheetClosing.value = false; dragY.value = 0
  for (const k of Object.keys(draft)) delete draft[k]
  for (const k of Object.keys(draftEffort)) delete draftEffort[k]
  for (const k of Object.keys(draftSwap)) delete draftSwap[k]
  for (const k of Object.keys(draftNote)) delete draftNote[k]
  for (const k of Object.keys(draftVariant)) delete draftVariant[k]
  sessionNote.value = ''
  sprintDraft.value = []
  if (import.meta.client) { try { localStorage.removeItem(DRAFT_KEY) } catch { /* stockage indispo */ } }
}
function finishSession() {
  if (!activeSession.value || !finishReady.value) return
  const sess = activeSession.value
  const durationMin = Math.round((Date.now() - sessionStart.value) / 60000)
  const entries = sess.exercises.map(e => ({
    exId: e.id,
    sets: (draft[e.id] || []).filter(s => s.done && s.w !== '' && s.r !== '').map(s => ({
      w: parseFloat(s.w), r: parseInt(s.r, 10),
      ...(e.superset && s.w2 !== '' && s.r2 !== '' ? { w2: parseFloat(s.w2), r2: parseInt(s.r2, 10) } : {}),
      ...(s.warm ? { warm: true } : {}),
    })),
    ...(draftEffort[e.id] ? { effort: draftEffort[e.id] } : {}),
    ...(draftSwap[e.id] ? { swap: true as const } : {}),
    ...(draftNote[e.id]?.trim() ? { note: draftNote[e.id].trim() } : {}),
    ...(draftVariant[e.id] ? { variant: draftVariant[e.id] } : {}),
  }))
  const sprintEfforts = sprintDraft.value
    .filter(r => r.duration.trim() || r.intensity.trim())
    .map(r => ({ kind: r.kind, count: parseInt(r.count, 10) || 1, duration: r.duration.trim(), intensity: r.intensity.trim() }))
  // Mode édition : on met à jour l'enregistrement existant au lieu d'en créer un
  // nouveau. On CONSERVE la durée d'origine (le chrono ne tourne pas en édition).
  if (editingRecord.value) {
    const keepMin = editingRecord.value.durationMin
    updateSession(editingRecord.value, entries, keepMin, sprintEfforts, sessionNote.value)
    const back = editReturn.value
    animateSheetDown(() => { clearActive(); view.value = back; showFlash(keepMin ? `Séance modifiée ✓ (${keepMin} min)` : 'Séance modifiée ✓') })
    return
  }
  const prs = recordSession(entries, durationMin, { sessionId: sess.id, name: sess.name, note: sessionNote.value }, sprintEfforts)
  // Le planning hebdo reste STABLE : on ne réécrit plus le jour avec la séance
  // faite (ça faisait dériver la semaine — mauvais jour, doublons).
  animateSheetDown(() => {
    clearActive()
    view.value = 'home'
    showFlash(prs.length ? `Séance enregistrée (${durationMin} min) — 🏆 ${prLabel(prs)}` : `Séance enregistrée ✓ (${durationMin} min)`)
  })
}
// Message de records : « charge », « reps » et « 1RM » sont trois progrès distincts.
const PR_WORDS: Record<PrKind, string> = { charge: 'charge', reps: 'reps', e1rm: '1RM' }
function prLabel(prs: { name: string; kinds: PrKind[] }[]): string {
  return 'PR ' + prs.map(p => `${p.name} (${p.kinds.map(k => PR_WORDS[k]).join(' + ')})`).join(', ')
}
// Décharge conseillée : accumulation de volume, ressenti dégradé ou stagnation
// généralisée. Détail et raisons dans l'onglet Rapport.
const deloadAdvised = computed(() => {
  if (!todayISO.value || todayDow.value === null) return false
  return fatigue(todayISO.value, todayDow.value).level === 'deload'
})

// Conseil de surcharge progressive. Les reps décident ; le ressenti les qualifie.
// « à l'échec » ne fait plus redescendre à lui seul — seulement quand les reps
// sont tombées SOUS la fourchette.
function overloadHint(ex: Exercise): { cls: string; text: string } | null {
  if (ex.bodyweight || ex.superset) return null // au poids du corps / superset : progression gérée à la main
  const s = suggestWeight(ex, draftVariant[ex.id])
  const felt = lastEffort(ex.id)
  if (s.reason === 'deload') return { cls: 'stall', text: `💥 À l'échec sous la fourchette → on redescend à ${s.weight} kg pour repartir propre` }
  if (s.reason === 'progress') {
    return felt === 'easy' && s.weight === s.base + s.inc
      ? { cls: 'progress', text: `😀 Noté « facile » la dernière fois → passe à ${s.weight} kg` }
      : { cls: 'progress', text: `🎯 Objectif de reps atteint → +${s.inc} kg par série (jusqu'à ${s.weight} kg)` }
  }
  if (s.reason === 'stall') return { cls: 'stall', text: `⏫ Bloqué ${s.streak} séances à ${s.base} kg — on force +${s.inc} kg par série` }
  if (s.reason === 'keep' && felt === 'fail') return { cls: 'keep', text: `💥 À l'échec dans la fourchette → on reste à ${s.base} kg et on va chercher la rep suivante` }
  if (s.reason === 'keep' && felt === 'hard') return { cls: 'keep', text: `😤 C'était dur → on reste à ${s.base} kg et on gagne des reps` }
  return null
}

// Exercice aux haltères : on note le poids TOTAL des deux haltères (cohérent avec le
// total d'une barre), jamais la charge d'un seul. Rappel affiché pour rester constant.
function isDumbbell(ex: Exercise): boolean {
  return !ex.superset && /haltère/i.test(ex.name)
}

/**
 * La dernière pesée connue — celle de la balance, puisque Withings les y déverse.
 *
 * On cherche la date la plus RÉCENTE au lieu de prendre le dernier élément. La liste
 * est tenue triée par `setBodyWeightAt`, mais une sauvegarde restaurée est reprise
 * telle quelle : un fichier dans le désordre aurait alors fait passer une vieille
 * pesée pour la dernière, et le préremplissage des dips avec.
 */
const latestWeight = computed(() => {
  let best: { date: string, kg: number } | null = null
  for (const e of bodyWeight.value) {
    if (!best || e.date > best.date) best = e
  }
  return best?.kg ?? null
})
const p2 = (n: number) => String(n).padStart(2, '0')

// ─────────── Sauvegarde automatique du brouillon ───────────
// À chaque changement de la séance active (poids, reps, cases cochées, sprint…), on
// écrit tout dans localStorage. Un refresh accidentel ne fait plus rien perdre.
if (import.meta.client) {
  watch(
    () => (activeSession.value
      ? JSON.stringify({
          id: activeSession.value.id,
          draft,
          draftEffort,
          draftSwap,
          draftNote,
          draftVariant,
          note: sessionNote.value,
          sprintDraft: sprintDraft.value,
          sessionStart: sessionStart.value,
          openEx: openEx.value,
          editingAt: editingRecord.value?.at ?? null,
          editReturn: editReturn.value,
        })
      : ''),
    (val) => {
      try {
        if (val) localStorage.setItem(DRAFT_KEY, val)
        else localStorage.removeItem(DRAFT_KEY)
      } catch { /* stockage plein/indisponible */ }
    },
  )
}
// Restaure le brouillon au démarrage (après un refresh) et rouvre la séance en cours.
function restoreDraft() {
  let raw: string | null = null
  try { raw = localStorage.getItem(DRAFT_KEY) } catch { return }
  if (!raw) return
  try {
    const s = JSON.parse(raw)
    const sess = PROGRAM.find(p => p.id === s.id)
    if (!sess) { localStorage.removeItem(DRAFT_KEY); return }
    activeSession.value = sess
    for (const k of Object.keys(draft)) delete draft[k]
    if (s.draft && typeof s.draft === 'object') Object.assign(draft, s.draft)
    for (const k of Object.keys(draftEffort)) delete draftEffort[k]
    if (s.draftEffort && typeof s.draftEffort === 'object') {
      for (const [k, v] of Object.entries(s.draftEffort)) if (isEffort(v)) draftEffort[k] = v
    }
    for (const k of Object.keys(draftSwap)) delete draftSwap[k]
  for (const k of Object.keys(draftNote)) delete draftNote[k]
  for (const k of Object.keys(draftVariant)) delete draftVariant[k]
    if (s.draftSwap && typeof s.draftSwap === 'object') {
      for (const k of Object.keys(s.draftSwap)) draftSwap[k] = true
    }
    if (s.draftVariant && typeof s.draftVariant === 'object') {
      for (const [k, v] of Object.entries(s.draftVariant)) if (typeof v === 'string' && v) draftVariant[k] = v
    }
    if (s.draftNote && typeof s.draftNote === 'object') {
      for (const [k, v] of Object.entries(s.draftNote)) {
        if (typeof v === 'string' && v) draftNote[k] = v
      }
    }
    sessionNote.value = typeof s.note === 'string' ? s.note : ''
    sprintDraft.value = Array.isArray(s.sprintDraft) ? s.sprintDraft : []
    sessionStart.value = typeof s.sessionStart === 'number' ? s.sessionStart : Date.now()
    openEx.value = s.openEx ?? sess.exercises[0].id
    editReturn.value = s.editReturn || 'home'
    editingRecord.value = s.editingAt ? (sessionLog().find(r => r.at === s.editingAt) || null) : null
    view.value = 'home'
    sheetOpen.value = true // on rouvre directement la séance en cours (feuille ouverte)
  } catch { try { localStorage.removeItem(DRAFT_KEY) } catch { /* ignore */ } }
}

/**
 * Retour du flux OAuth Withings : /api/withings/callback nous renvoie ici avec les
 * jetons en query. On les range, puis on NETTOIE l'URL — laisser un jeton dans la
 * barre d'adresse, c'est le laisser dans l'historique, les captures et le partage.
 */
/**
 * Reprend une connexion Withings laissée en plan dans un autre navigateur.
 *
 * L'autorisation part de la PWA et revient dans Safari — deux stockages, deux
 * cookies. Les jetons ne peuvent donc pas revenir par l'URL : ils sont déposés côté
 * serveur, et c'est ici qu'on va les chercher, avec le nonce que l'application avait
 * gardé. C'est le premier instant du flux dont on soit sûr qu'il se joue DANS l'app.
 *
 * Silencieux quand il n'y a rien : on ouvre l'application cent fois pour une
 * connexion de balance.
 */
async function adoptWithings() {
  if (!import.meta.client) return
  const w = useWithings()
  w.hydrate()

  // Ancien flux, quand le tour se faisait entièrement dans le même navigateur.
  // Conservé pour ne pas casser une connexion en cours au moment de la mise à jour.
  const q = new URLSearchParams(window.location.search)
  if (q.get('withings')) {
    if (q.get('withings') === 'ok') w.adoptFromQuery(Object.fromEntries(q.entries()))
    else withingsError.value = q.get('reason') || 'connexion refusée'
    view.value = 'profil'
    window.history.replaceState({}, '', '/sport')
    return
  }

  if (await w.claimPending()) {
    view.value = 'profil'
    showFlash('⚖️ Balance connectée')
  }
}

/**
 * Au retour au premier plan aussi, et pas seulement à l'ouverture.
 *
 * Le cas normal est exactement celui-là : l'application était déjà ouverte en
 * arrière-plan, on est parti autoriser dans Safari, on revient dessus. Sans cette
 * écoute il faudrait la fermer et la rouvrir pour que la connexion se termine —
 * c'est-à-dire deviner qu'il faut le faire.
 */
function watchWithingsReturn() {
  if (!import.meta.client) return
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') adoptWithings()
  })
}

onMounted(() => {
  // Service worker : PRODUCTION UNIQUEMENT.
  // Il met /_nuxt/* en cache d'abord, en partant du principe que ces fichiers ont un
  // nom haché donc immuable. C'est vrai après un build ; c'est faux en `nuxt dev`, où
  // Vite sert les sources sous leur vrai chemin. Un fichier renommé, déplacé ou
  // supprimé continuait alors d'être servi depuis le cache — indéfiniment, même après
  // un Ctrl+Shift+R, qui ne contourne pas le service worker pour les sous-requêtes.
  // En dev on le désinscrit donc, et on purge son cache, sinon un SW installé une fois
  // continue de saboter tous les rechargements suivants.
  if ('serviceWorker' in navigator) {
    if (import.meta.dev) {
      navigator.serviceWorker.getRegistrations()
        .then(rs => Promise.all(rs.map(r => r.unregister())))
        .then(() => (typeof caches !== 'undefined' ? caches.keys() : Promise.resolve([])))
        .then(keys => Promise.all(keys.filter(k => k.startsWith('sport-')).map(k => caches.delete(k))))
        .catch(() => { /* rien à désinscrire */ })
    } else {
      navigator.serviceWorker.register('/sport-sw.js', { scope: '/sport' }).catch(() => {})
    }
  }
  watchWithingsReturn()
  hydrateProfile()
  restoreDraft() // rouvre la séance en cours après un refresh accidentel
  adoptWithings()
  // Les pas de la balance à l'OUVERTURE de l'app, plus seulement en visitant le
  // Rapport. Tant que c'était accroché à cet écran, la cible du jour tournait sur une
  // estimation forfaitaire pour qui n'y allait jamais — et c'est justement la cible
  // qui décide de ce qu'on met dans l'assiette du soir.
  // Volontairement non attendu : rien de ce qui s'affiche n'en dépend, et une balance
  // injoignable ne doit pas retarder le premier écran d'une milliseconde.
  useWithings().autoSync(isoOf(new Date())).catch(() => { /* hors ligne : ce sera pour la prochaine ouverture */ })
  // Les métadonnées des photos de plats, dès l'ouverture.
  //
  // Elles n'étaient chargées que par le panneau Nutrition : tant qu'on n'était pas
  // passé par l'onglet « Plats », `has(id)` répondait faux partout ailleurs et les
  // vignettes restaient vides — sur l'accueil, dans la feuille des repas, dans la
  // fiche d'un plat. Il fallait visiter un écran pour que les autres s'affichent.
  //
  // Ce sont bien les MÉTADONNÉES seules (identifiant, dimensions, poids), pas les
  // images : quelques centaines d'octets, lus une fois. Chaque vignette lit son blob
  // à la demande, donc ceci ne charge rien d'inutile au démarrage.
  usePhotos().hydrate().catch(() => { /* IndexedDB indisponible : navigation privée */ })
  // Le coffre : on relève l'état (session, propositions) et, si la session est
  // ouverte, on repousse le miroir — au plus une fois toutes les cinq minutes.
  // C'est ce qui remplace l'export manuel qu'il fallait penser à faire.
  const vault = useVault()
  const { buildSnapshot } = useSnapshot()
  vault.hydrate()
    .then(() => vault.push(buildSnapshot))
    .catch(() => { /* hors ligne : le coffre est un confort, pas une dépendance */ })
  useNutrition().hydrate()
  // Données de démo UNIQUEMENT en environnement local/test (jamais en prod) :
  // actif en `nuxt dev`, ou si NUXT_PUBLIC_SEED_TEST_DATA=true. En prod → rien.
  try {
    const seedAllowed = import.meta.dev || useRuntimeConfig().public.seedTestData
    if (seedAllowed && !localStorage.getItem('gr-seeded-v1') && !sessionLog().length) {
      seedDemo()
      localStorage.setItem('gr-seeded-v1', '1')
    }
  } catch { /* stockage indisponible */ }
  const now = new Date()
  todayDow.value = now.getDay()
  todayISO.value = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewport)
    window.visualViewport.addEventListener('scroll', onViewport)
    onViewport()
  }

  // Le chrono de la colonne d'outils n'existe que dans la vue « séance » : on
  // (re)branche l'observateur quand il apparaît, et on le débranche quand il part.
  watch(timerBox, (el) => {
    timerObserver?.disconnect()
    if (!el) { timerVisible.value = false; return }
    timerObserver = new IntersectionObserver(
      ([entry]) => { timerVisible.value = entry.isIntersecting },
      // Une marge négative en haut : à moitié caché sous l'en-tête collant, il ne
      // compte pas comme visible.
      { root: null, rootMargin: '-64px 0px 0px 0px', threshold: 0.5 },
    )
    timerObserver.observe(el)
  }, { immediate: true })
})
onUnmounted(() => {
  timerObserver?.disconnect()
  if (import.meta.client && window.visualViewport) {
    window.visualViewport.removeEventListener('resize', onViewport)
    window.visualViewport.removeEventListener('scroll', onViewport)
  }
})
</script>

<template>
  <div class="sport-app has-bottomnav" :class="{ 'has-minibar': activeSession && !sheetOpen && !sheetClosing }">
    <header class="sport-header">
      <div class="header-top">
        <button class="brand" @click="go('home')">
          <span class="brand-mark">GR</span>
          <span class="brand-text">
            <span class="brand-eyebrow">Suivi séances · Recomp</span>
            <span class="brand-title">{{ pageTitle }}</span>
          </span>
        </button>
        <div class="header-right">
          <a href="/" class="btn ghost">↗ Portfolio</a>
        </div>
      </div>
      <!-- Desktop : navigation en haut -->
      <nav class="topnav">
        <button v-for="t in TABS" :key="t.id" class="topnav-tab" :class="{ active: view === t.id }" @click="go(t.id)">
          <span class="tn-icon">{{ t.icon }}</span>
          <span class="tn-label">{{ t.label }}</span>
        </button>
      </nav>
    </header>

    <!-- Chrono de repos flottant : fixe en haut quand on a scrollé, revient à sa place en haut de page -->
    <transition name="ft-drop">
      <div v-if="sheetOpen && restLeft > 0 && (!timerVisible || keyboardOpen)" class="floating-timer" :style="{ top: floatTop + 'px' }">
        <span class="ft-time mono">{{ restFmt(restLeft) }}</span>
        <span class="ft-label">Repos</span>
        <button class="ft-btn" @click="addRest(15)">+15</button>
        <button class="ft-btn stop" @click="stopRest()">Stop</button>
      </div>
    </transition>

    <div v-if="flash" class="flash">{{ flash }}</div>

    <!-- ═══════════ ACCUEIL ═══════════ -->
    <div v-if="view === 'home'" class="stack">
      <!-- La séance du jour est passée EN SLOT du bandeau nutrition : les deux
           partagent la première ligne, et les compteurs s'étalent en dessous. -->
      <ClientOnly>
        <LazyNutritionHero :today-iso="todayISO">
          <template #session>
          <section v-if="todaySession" class="today card" :style="{ '--c': todaySession.color }">
            <div class="today-eyebrow"><span class="today-dot"></span> {{ todayEntry!.dow }}</div>
            <h2 class="today-name">{{ todaySession.name }}</h2>
            <div v-if="doneToday.length" class="done-badge">✓ Déjà fait aujourd'hui : {{ doneToday.map(s => s.name).join(', ') }}</div>
            <div class="sc-muscles"><span v-for="m in sessionMuscles(todaySession)" :key="m" class="sc-chip">{{ m }}</span></div>
            <div class="today-foot">
              <span class="muted">{{ todaySession.exercises.length }} exercices<template v-if="todaySession.sprint"> · ⚡ sprint</template></span>
              <button v-if="activeSession" class="btn-primary today-go" :style="{ background: todaySession.color }" @click="startSession(todaySession)">{{ activeSession.id === todaySession.id ? 'Reprendre →' : 'Aperçu' }}</button>
              <button v-else-if="todayRecord" class="btn-primary today-go" :style="{ background: todaySession.color }" @click="editSession(todayRecord!)">✏️ Modifier la séance →</button>
              <button v-else class="btn-primary today-go" :style="{ background: todaySession.color }" @click="startSession(todaySession)">Démarrer la séance →</button>
            </div>
          </section>

          <section v-else-if="todayIndex !== null" class="today card rest">
            <h2 class="today-name">Repos 💤</h2>
            <p class="muted rest-txt">Récupération.<template v-if="nextSession"> Prochaine séance : <b>{{ nextSession.dow }}</b> · {{ nextSession.session!.name }}.</template></p>
            <button v-if="nextSession" class="btn today-go" @click="startSession(nextSession.session!)">Faire {{ nextSession.session!.name }} maintenant →</button>
          </section>
          </template>
        </LazyNutritionHero>
      </ClientOnly>

      <!-- Décharge conseillée : l'info n'est utile qu'ici, avant de démarrer -->
      <div v-if="deloadAdvised" class="deload-banner">
        <span>🔴</span>
        <span><b>Semaine de décharge conseillée.</b> Garde les mêmes charges, coupe ~40 % des séries et stoppe 3 reps avant l'échec. <button class="link-btn" @click="view = 'rapport'">Voir pourquoi →</button></span>
      </div>

      <div class="section-label">{{ todaySession ? 'Ou commence une autre séance' : 'Toutes les séances' }}</div>
      <div class="session-grid">
        <button v-for="s in otherSessions" :key="s.id" class="session-card" :style="{ '--c': s.color }" @click="startSession(s)">
          <div class="sc-top">
            <span class="sc-day">{{ s.tag }}</span>
            <span v-if="s.sprint" class="sc-sprint">⚡ sprint</span>
          </div>
          <div class="sc-name">{{ s.name }}</div>
          <div class="sc-muscles"><span v-for="m in sessionMuscles(s)" :key="m" class="sc-chip">{{ m }}</span></div>
          <div class="sc-foot"><span class="sc-count mono">{{ s.exercises.length }} exercices</span><span class="sc-go">{{ activeSession ? (activeSession.id === s.id ? 'Reprendre →' : 'Aperçu') : 'Démarrer →' }}</span></div>
        </button>
      </div>

      <div class="card week-card">
        <div class="section-label mb-8">Ta semaine <span class="muted week-hint">· déplaçable depuis le calendrier</span></div>
        <div class="week">
          <div v-for="(d, i) in weekDays" :key="i" class="week-day" :class="{ rest: !d.session, today: i === todayIndex, moved: d.moved }" :style="d.session ? { '--c': d.session.color } : {}">
            <span class="week-dow">{{ d.dow }}<span v-if="d.moved" class="week-moved" title="Planning modifié pour cette date">⇄</span></span>
            <template v-if="d.session">
              <span class="week-dot"></span>
              <span class="week-label">{{ d.short }}</span>
              <span v-if="d.sprint" class="week-sprint">⚡</span>
            </template>
            <span v-else class="week-rest">repos</span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════ SÉANCE (vraie feuille : monte, descend, glissable au doigt) ═══════════ -->
    <!-- Voile : l'onglet reste rendu derrière ; on le voit quand on descend la feuille -->
    <div v-if="sheetVisible" class="sheet-scrim" :style="scrimStyle" @click="collapseSession"></div>
    <div v-if="sheetVisible && activeSession" class="session-sheet" :style="[{ '--c': activeSession.color }, sheetStyle]">
      <div class="session-sheet-head" @pointerdown="onDragStart">
        <button class="sheet-grab" :aria-label="editingRecord ? 'Fermer' : 'Réduire la séance'" @click="requestCollapse"></button>
        <div class="ssh-row">
          <div class="ssh-title">
            <span class="ssh-dot" aria-hidden="true"></span>
            <span class="ssh-name">{{ activeSession.name }}</span>
          </div>
          <div class="ssh-right">
            <span v-if="editingRecord" class="ssh-time ssh-edit">✏️ Modification</span>
            <span v-else class="ssh-time mono">⏱ {{ fmtClock(elapsed) }}</span>
            <button class="ssh-abandon" :aria-label="editingRecord ? 'Abandonner les modifications' : 'Annuler la séance'" @pointerdown.stop @click="askCancel">✕</button>
          </div>
        </div>
      </div>
      <div class="session-layout">
        <aside class="session-tools">
        <!-- Le minuteur de repos, et rien d'autre.
             « Calcul de barre » et « 1RM & charges » vivaient ici. Le premier ne sert
             que sur une barre libre — sur une machine ou une poulie, le chiffre est
             écrit sur la pile. Le second refaisait à la main ce que l'app calcule déjà
             seule à chaque série enregistrée, et qui alimente la progression et les
             coefficients entre machines. Deux boutons permanents en haut de chaque
             séance pour un besoin qui ne s'est jamais présenté.
             Les composants sont toujours dans components/sport/ : les remettre est une
             ligne de gabarit. -->
        <div class="tools-sticky">
          <div ref="timerBox" class="timer-box"><LazySportRestTimer /></div>
        </div>
      </aside>

      <div class="session-main">
        <div v-for="(e, idx) in activeSession.exercises" :key="e.id" class="card no-pad exercise">
          <!-- L'icône vit dans l'en-tête, pas dans le corps : c'est là qu'on voit
               d'un coup d'œil quels exercices portent déjà un commentaire, sans
               déplier les six cartes une par une. Et elle ouvre une fenêtre au lieu
               de déplier un champ tout en bas de la carte : commenter ne demande
               plus d'ouvrir l'exercice ni de défiler jusqu'au bout. -->
          <div class="exhead-row">
            <button class="exhead" @click="openEx = openEx === e.id ? null : e.id">
              <div>
                <div class="ex-name">{{ idx + 1 }}. {{ e.name }}</div>
                <div class="muted mt-2">{{ e.sets }} × {{ e.reps }}<template v-if="lastPerf(e.id)"> · dernière : {{ Math.max(...lastPerf(e.id)!.sets.map(s => s.w)) }} kg</template></div>
              </div>
              <div class="set-counter mono" :class="{ complete: draft[e.id] && workCount(e.id) > 0 && doneCount(e.id) === workCount(e.id) }">{{ doneCount(e.id) }}/{{ workCount(e.id) || e.sets }}</div>
            </button>
            <button
              class="ex-note-btn" :class="{ has: !!draftNote[e.id]?.trim() }"
              :aria-label="`Commentaire sur ${e.name}`"
              @click="noting = e.id"
            >💬</button>
          </div>
          <div v-if="openEx === e.id" class="ex-body">
            <LazySportExerciseMove :ex-id="e.id"><LazySportMuscleMap :muscles="e.muscles" /></LazySportExerciseMove>
            <div v-if="e.bodyweight" class="hint-pill bw">🧍 Charge = ton poids de corps<template v-if="latestWeight"> ({{ latestWeight }} kg)</template> + lest. Préremplie — ajuste si tu ajoutes du poids.</div>
            <div v-if="overloadHint(e)" class="hint-pill" :class="overloadHint(e)!.cls">{{ overloadHint(e)!.text }}</div>
            <div v-if="previousNote(e.id)" class="hint-pill note">💬 La dernière fois : {{ previousNote(e.id) }}</div>
            <div v-if="isDumbbell(e)" class="hint-pill db">🏋️ Note le poids <strong>total des 2 haltères</strong> (ex. 2 × 20 kg → 40 kg), pas un seul.</div>
            <!-- Les deux gestes « ça ne s'est pas passé comme prévu », côte à côte
                 et sans texte. Ils occupaient dix lignes d'explication chacun, à deux
                 endroits opposés de la carte, pour deux boutons qu'on touche une fois
                 par mois. L'explication n'a pas disparu : elle est dans la carte qui
                 s'ouvre, c'est-à-dire au moment où on en a besoin.
                 Placés AVANT les séries parce que la machine change les kilos
                 préremplis : on choisit, puis on remplit. -->
            <div class="ex-acts">
              <button
                v-if="variantsOf(e.id).length"
                class="ex-act" :class="{ sel: !!draftVariant[e.id] }"
                :aria-label="`Changer de machine pour ${e.name}`"
                :aria-pressed="!!draftVariant[e.id]"
                @click="picking = e.id"
              >
                <span class="ex-act-i" aria-hidden="true">🔁</span>
                <span class="ex-act-t">Autre machine</span>
                <span v-if="draftVariant[e.id]" class="ex-act-ok" aria-hidden="true">✓</span>
              </button>
              <button
                class="ex-act" :class="{ sel: draftSwap[e.id] }"
                :aria-label="`J'ai repris le mouvement en main sur ${e.name}`"
                :aria-pressed="!!draftSwap[e.id]"
                @click="swapAsk = e.id"
              >
                <span class="ex-act-i" aria-hidden="true">🔀</span>
                <span class="ex-act-t">Repris en main</span>
                <span v-if="draftSwap[e.id]" class="ex-act-ok" aria-hidden="true">✓</span>
              </button>
            </div>
            <!-- Le nom de la machine et son coefficient : un bouton allumé dit qu'on
                 a changé, pas POUR QUOI ni de combien. Le second est celui qui
                 explique les kilos préremplis. -->
            <p v-if="draftVariant[e.id]" class="ex-acts-say muted">
              {{ variantName(e.id, draftVariant[e.id], e.name) }} ·
              équivalent {{ e.name }} ×{{ ratioFor(e.id, draftVariant[e.id]).ratio.toLocaleString('fr-FR') }}
            </p>
            <div class="cues">
              <div v-for="(c, i) in e.cues" :key="i" class="cue"><span class="cue-arrow">›</span>{{ c }}</div>
              <div v-if="e.machine" class="muted italic mt-6">{{ e.machine }}</div>
            </div>
            <div class="sets">
              <!-- Le repos prévu, annoncé AVANT de valider.
                   Le minuteur partait tout seul avec une durée qu'on découvrait au
                   moment où elle s'affichait : impossible de savoir, en attaquant
                   l'exercice, si on partait sur une minute ou sur trois. Le dire ici
                   n'ajoute pas un réglage, ça montre celui qui existe déjà. -->
              <div class="sets-rest mono muted">⏱ Repos {{ fmtRest(restFor(e)) }}<template v-if="e.superset"> · après les deux mouvements</template></div>
              <!-- Superset : une charge par mouvement -->
              <template v-if="e.superset">
                <!-- Les colonnes se nomment UNE fois, en tête du bloc.
                     Le superset n'avait pas d'en-tête du tout : deux champs nus par
                     mouvement, six par série, et rien pour dire lequel est les kilos.
                     Les répéter dans chaque carte ferait six fois le même mot ; ici ils
                     sont dits une fois, alignés sur les champs par la même gouttière et
                     le même retrait que `.ss-move`. -->
                <div class="ss-head" aria-hidden="true">
                  <span class="ss-move-label"></span>
                  <span class="col-head mono">kg</span>
                  <span class="times">×</span>
                  <span class="col-head mono">reps</span>
                </div>
                <div v-for="(s, i) in draft[e.id]" :key="i" class="ss-set" :class="{ done: s.done }">
                  <div class="ss-set-top">
                    <span class="mono ss-set-label">Série {{ i + 1 }}</span>
                    <button class="check" :class="{ ok: s.done }" @click="toggleSet(s, e)">{{ s.done ? '✓' : '○' }}</button>
                    <button v-if="draft[e.id].length > 1" class="rm" aria-label="Retirer la série" @click="removeSet(e.id, i)">×</button>
                  </div>
                  <div class="ss-move">
                    <span class="ss-move-label">{{ e.superset[0] }}</span>
                    <input v-model="s.w" type="number" inputmode="decimal" placeholder="kg">
                    <span class="times">×</span>
                    <input v-model="s.r" type="number" inputmode="numeric" placeholder="reps">
                  </div>
                  <div class="ss-move">
                    <span class="ss-move-label">{{ e.superset[1] }}</span>
                    <input v-model="s.w2" type="number" inputmode="decimal" placeholder="kg">
                    <span class="times">×</span>
                    <input v-model="s.r2" type="number" inputmode="numeric" placeholder="reps">
                  </div>
                </div>
              </template>
              <!-- Exercice classique -->
              <template v-else>
                <div class="setrow setrow-head" aria-hidden="true">
                  <span class="set-label"></span>
                  <span class="col-head mono">kg</span>
                  <span class="times">×</span>
                  <span class="col-head mono">reps</span>
                </div>
                <div v-for="(s, i) in draft[e.id]" :key="i" class="setrow" :class="{ done: s.done, warm: s.warm }">
                  <button class="set-label mono" :class="{ warm: s.warm }" :title="s.warm ? 'Échauffement (non compté) — clic pour repasser en série' : 'Clic pour marquer en échauffement'" @click="s.warm = !s.warm">{{ setLabel(draft[e.id], i) }}</button>
                  <input v-model="s.w" type="number" inputmode="decimal" placeholder="kg">
                  <span class="times">×</span>
                  <input v-model="s.r" type="number" inputmode="numeric" placeholder="reps">
                  <button class="check" :class="{ ok: s.done }" @click="toggleSet(s, e)">{{ s.done ? '✓' : '○' }}</button>
                  <button v-if="draft[e.id].length > 1" class="rm" aria-label="Retirer la série" @click="removeSet(e.id, i)">×</button>
                </div>
              </template>
              <div class="set-adds">
                <button class="add-set" @click="addSet(e.id)">+ Série</button>
                <button v-if="!e.superset" class="add-set warm" @click="addWarmup(e.id)">+ Échauffement</button>
              </div>
            </div>
            <!-- Ressenti : un tap, et la charge conseillée s'adapte la prochaine fois -->
            <div class="effort">
              <span class="effort-label">Ressenti</span>
              <div class="effort-chips">
                <button
                  v-for="o in EFFORT_OPTIONS" :key="o.value"
                  class="effort-chip" :class="[o.value, { sel: draftEffort[e.id] === o.value }]"
                  :aria-pressed="draftEffort[e.id] === o.value"
                  @click="setEffort(e.id, o.value)"
                >{{ o.icon }} {{ o.label }}</button>
              </div>
            </div>
            <!-- Le commentaire ne s'écrit plus ici : 💬 dans l'en-tête ouvre une
                 fenêtre. Ce qui reste dans la carte, c'est ce qu'on LIT en
                 soulevant — la note de la dernière fois, plus haut. -->
            <div v-if="draftNote[e.id]?.trim()" class="ex-note-said">
              💬 {{ draftNote[e.id] }}
              <button class="ex-note-edit" @click="noting = e.id">modifier</button>
            </div>
          </div>
        </div>
        <div v-if="activeSession.sprint" class="card no-pad exercise sprint-exercise">
          <button class="exhead" @click="sprintOpen = !sprintOpen">
            <div>
              <div class="ex-name">⚡ {{ activeSession.sprint.title }}</div>
              <div class="muted mt-2">Optionnel · {{ activeSession.sprint.protocol[0].value }} × {{ activeSession.sprint.protocol[1].value }}</div>
            </div>
            <div class="set-counter mono chevron">{{ sprintOpen ? '▲' : '▼' }}</div>
          </button>
          <div v-if="sprintOpen" class="ex-body sprint-body">
            <!-- Essentiel : le protocole, en un coup d'œil -->
            <div class="sprint-protocol">
              <div v-for="p in activeSession.sprint.protocol" :key="p.label" class="sp-stat">
                <div class="sp-val mono">{{ p.value }}</div>
                <div class="sp-lab">{{ p.label }}</div>
              </div>
            </div>
            <button class="sprint-info-btn" :class="{ open: sprintInfoOpen }" @click="sprintInfoOpen = !sprintInfoOpen">
              <span class="i-mark">i</span>{{ sprintInfoOpen ? 'Masquer les détails' : 'Détails : échauffement, tapis, technique' }}
            </button>

            <!-- Bulle info : tout le détail, masqué par défaut -->
            <div v-if="sprintInfoOpen" class="sprint-info">
              <div class="sprint-goal">{{ activeSession.sprint.goal }}</div>
              <div class="sprint-block">
                <div class="sprint-block-title">🔥 Échauffement</div>
                <ul class="sprint-list"><li v-for="(w, i) in activeSession.sprint.warmup" :key="i">{{ w }}</li></ul>
              </div>
              <div class="sprint-block">
                <div class="sprint-block-title">Où cours-tu ?</div>
                <div class="sprint-toggle">
                  <button :class="{ active: sprintMode === 'exterieur' }" @click="sprintMode = 'exterieur'">🏟️ Extérieur</button>
                  <button :class="{ active: sprintMode === 'tapis' }" @click="sprintMode = 'tapis'">🏃 Tapis</button>
                </div>
                <ul class="sprint-list">
                  <li v-for="(s, i) in (sprintMode === 'exterieur' ? activeSession.sprint.exterieur : activeSession.sprint.tapis)" :key="i">{{ s }}</li>
                </ul>
                <div v-if="sprintMode === 'tapis'" class="sprint-note">⚠️ {{ activeSession.sprint.tapisNote }}</div>
              </div>
              <div class="sprint-block">
                <div class="sprint-block-title">Technique</div>
                <ul class="sprint-list"><li v-for="(c, i) in activeSession.sprint.cues" :key="i">{{ c }}</li></ul>
              </div>
              <div class="sprint-cooldown">🧊 Retour au calme — {{ activeSession.sprint.cooldown }}</div>
            </div>

            <!-- Saisie : ce que tu as réellement couru -->
            <div class="sprint-log">
              <div class="sprint-block-title">Ce que tu as fait</div>
              <div v-for="(r, i) in sprintDraft" :key="i" class="sprint-row">
                <button class="kind-chip" :class="r.kind" @click="r.kind = r.kind === 'echauffement' ? 'sprint' : 'echauffement'">{{ r.kind === 'echauffement' ? 'Échauff.' : 'Sprint' }}</button>
                <button v-if="sprintDraft.length > 1" class="rm" aria-label="Retirer" @click="removeSprintRow(i)">×</button>
                <div class="sr-fields">
                  <input v-model="r.count" class="sr-count" type="number" inputmode="numeric" placeholder="nb">
                  <span class="times">×</span>
                  <input v-model="r.duration" class="sr-dur" type="text" placeholder="20 s">
                  <span class="times">@</span>
                  <input v-model="r.intensity" class="sr-int" type="text" placeholder="16 km/h">
                </div>
              </div>
              <div class="sprint-add">
                <button class="add-set" @click="addSprintRow('echauffement')">+ Échauffement</button>
                <button class="add-set" @click="addSprintRow('sprint')">+ Sprint</button>
              </div>
              <div class="muted sprint-hint">Ex : Échauff. 1 × 3 min @ 8 km/h, puis Sprint 3 × 20 s @ 16 km/h. Enregistré avec la séance.</div>
            </div>
          </div>
        </div>
        <SportVariantSheet
          v-if="picking && pickingEx"
          :ex="pickingEx"
          :current="draftVariant[picking] ?? null"
          @pick="pickVariant(picking, $event)"
          @close="picking = null"
        />
        <div class="card note-card">
          <div class="section-label mb-8">Note de séance <span class="muted">· facultatif</span></div>
          <textarea v-model="sessionNote" class="note-input" rows="2" placeholder="Douleur épaule, mal dormi, banc occupé…"></textarea>
          <div class="muted mt-6">C'est ce qui expliquera une séance en dessous quand tu la reliras dans un mois.</div>
        </div>
        <button class="btn-primary finish" :disabled="!finishReady" @click="finishSession">{{ editingRecord ? 'Enregistrer les modifications' : 'Terminer et enregistrer la séance' }}</button>
        <div v-if="!finishReady && activeSession" class="finish-hint muted">Termine au moins 80 % des exercices pour enregistrer — {{ finishedCount }}/{{ activeSession.exercises.length }} faits.</div>
          </div>
        </div>
      </div>

    <!-- Onglets secondaires : composants chargés à la demande (moins de JS hydraté
         sur l'accueil). Suspense affiche un squelette le temps du chunk, plutôt
         qu'un écran vide entre le clic sur l'onglet et l'arrivée du composant. -->
    <Suspense v-if="view === 'rapport'">
      <LazySportReport :today-iso="todayISO" :today-dow="todayDow" @navigate="go($event as View)" />
      <template #fallback><SportSkeleton :cards="4" chart /></template>
    </Suspense>
    <Suspense v-else-if="view === 'history'">
      <LazySportHistory :today-iso="todayISO" @edit="editSession" />
      <template #fallback><SportSkeleton :cards="2" /></template>
    </Suspense>
    <Suspense v-else-if="view === 'nutrition'">
      <LazyNutritionPanel :today-iso="todayISO" />
      <template #fallback><SportSkeleton :cards="3" /></template>
    </Suspense>
    <Suspense v-else-if="view === 'profil'">
      <LazySportProfile :today-iso="todayISO" :withings-error="withingsError" @flash="showFlash" />
      <template #fallback><SportSkeleton :cards="5" chart /></template>
    </Suspense>

    <!-- Aperçu lecture seule d'une séance quand une autre est déjà en cours -->
    <div v-if="previewSession" class="preview-overlay" @click.self="previewSession = null">
      <div class="preview-sheet" :style="{ '--c': previewSession.color }">
        <div class="preview-head">
          <div>
            <div class="preview-eyebrow">Aperçu · lecture seule</div>
            <h3 class="preview-title">{{ previewSession.name }}</h3>
          </div>
          <button class="sheet-close" aria-label="Fermer" @click="previewSession = null">×</button>
        </div>
        <div class="preview-note">🔒 Une séance est déjà en cours. Termine-la ou abandonne-la pour démarrer celle-ci.</div>
        <div class="preview-list">
          <div v-for="(e, idx) in previewSession.exercises" :key="e.id" class="preview-ex">
            <div class="preview-ex-head">
              <span class="preview-ex-name">{{ idx + 1 }}. {{ e.name }}</span>
              <span class="preview-ex-sets mono">{{ e.sets }} × {{ e.reps }}</span>
            </div>
            <div class="sc-muscles"><span v-for="m in exMuscles(e)" :key="m" class="sc-chip">{{ m }}</span></div>
            <div v-if="e.cues && e.cues.length" class="preview-cues">
              <div v-for="(c, i) in e.cues" :key="i" class="cue"><span class="cue-arrow">›</span>{{ c }}</div>
            </div>
          </div>
          <div v-if="previewSession.sprint" class="preview-ex">
            <div class="preview-ex-head"><span class="preview-ex-name">⚡ {{ previewSession.sprint.title }}</span></div>
          </div>
        </div>
        <button class="btn-primary preview-resume" @click="previewSession = null; expandSession()">↩ Reprendre ma séance en cours</button>
      </div>
    </div>

    <!-- Popup de confirmation « annuler la séance » (remplace le confirm() natif) -->
    <transition name="pop">
      <div v-if="cancelPromptOpen" class="confirm-overlay" @click.self="cancelPromptOpen = false">
        <div class="confirm-box">
          <div class="confirm-emoji" aria-hidden="true">{{ editingRecord ? '✏️' : '🗑️' }}</div>
          <div class="confirm-title">{{ editingRecord ? 'Abandonner les modifications ?' : 'Annuler la séance en cours ?' }}</div>
          <div class="confirm-text">{{ editingRecord ? 'Les changements non enregistrés seront perdus (la séance d\'origine reste intacte).' : 'Les séries saisies mais non enregistrées seront perdues.' }}</div>
          <div class="confirm-actions">
            <button class="btn confirm-keep" @click="cancelPromptOpen = false">{{ editingRecord ? 'Continuer les modifications' : 'Continuer la séance' }}</button>
            <button class="confirm-yes" @click="confirmCancel">{{ editingRecord ? 'Abandonner les modifications' : 'Annuler la séance' }}</button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Ce que « reprise en main » veut dire, au moment où on l'active. -->
    <transition name="pop">
      <div v-if="swapEx" class="confirm-overlay" @click.self="swapAsk = null">
        <div class="confirm-box">
          <div class="confirm-emoji" aria-hidden="true">🔀</div>
          <div class="confirm-title">
            {{ draftSwap[swapEx.id] ? 'Annuler la reprise en main ?' : 'J’ai repris le mouvement en main' }}
          </div>
          <div class="confirm-text">
            <template v-if="draftSwap[swapEx.id]">
              <b>{{ swapEx.name }}</b> redeviendra comparable aux séances précédentes :
              records et progression reprennent leur fil.
            </template>
            <template v-else>
              À cocher quand tu as <b>volontairement baissé la charge</b> pour mieux exécuter
              — après une pause, une douleur, ou pour corriger une technique.
              <br><br>
              Sur <b>{{ swapEx.name }}</b>, records et progression <b>repartent de cette séance</b> :
              la charge du jour n’est pas comparable aux précédentes, et la courbe ne
              lira pas cette baisse comme une régression.
              <br><br>
              Si c’est simplement la machine qui était prise, utilise plutôt 🔁 — ta
              progression reste alors continue, convertie par le coefficient.
            </template>
          </div>
          <div class="confirm-actions">
            <button class="btn confirm-keep" @click="swapAsk = null">Annuler</button>
            <button class="confirm-yes" @click="confirmSwap">
              {{ draftSwap[swapEx.id] ? 'Retirer' : 'Oui, j’ai repris en main' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- Le geste « retour » n'ouvre plus de carte : il replie la feuille, comme la
         poignée. La seule question qu'il pose encore est celle de l'abandon des
         modifications — et c'est la carte ci-dessus, celle qui existait déjà. -->

    <!-- Le commentaire d'un exercice, en fenêtre.
         `persistent` : on est en train d'écrire. Une pression à côté du champ, sur
         un téléphone où le clavier occupe la moitié de l'écran, ne doit pas fermer
         la fenêtre. La croix et Échap restent, eux — ce sont des gestes voulus. -->
    <Popup
      v-if="notingEx"
      ref="notePopup"
      persistent
      popup-class="note-popup"
      :title="`💬 ${notingEx.name}`"
      subtitle="Pourquoi ce mouvement-là a bougé"
      @close="noting = null"
    >
      <p v-if="previousNote(notingEx.id)" class="hint-pill note">
        La dernière fois : {{ previousNote(notingEx.id) }}
      </p>
      <textarea
        v-model="draftNote[notingEx.id]"
        class="note-input note-popup-input" rows="4"
        placeholder="Machine occupée, épaule qui tire, prise changée…"
      ></textarea>
      <p class="muted">
        C'est ce que tu reliras <b>la prochaine fois</b>, en haut de cet exercice, au
        moment de recharger la barre — pas trois semaines plus tard en bas d'une séance.
      </p>
      <div class="nav-row">
        <button v-if="draftNote[notingEx.id]?.trim()" class="btn flex-1" @click="clearNote(notingEx.id)">Effacer</button>
        <button class="btn-primary flex-1" @click="closeNote()">Terminé</button>
      </div>
    </Popup>

    <!-- Mini-feuille « séance en cours » : docké au-dessus de la barre d'onglets,
         affiche la durée en direct ; on tape dessus pour rouvrir la séance -->
    <div v-if="activeSession && !sheetOpen && !sheetClosing" class="mini-session" :style="{ '--c': activeSession.color }">
      <button class="mini-open" @click="expandSession">
        <span class="mini-grab" aria-hidden="true"></span>
        <span class="mini-dot" aria-hidden="true"></span>
        <span class="mini-main">
          <span class="mini-name">{{ activeSession.name }}</span>
          <span class="mini-sub">{{ editingRecord ? 'Modification · toucher pour reprendre' : 'Séance en cours · toucher pour reprendre' }}</span>
        </span>
        <span class="mini-time mono">⏱ {{ fmtClock(elapsed) }}</span>
        <span class="mini-chevron" aria-hidden="true">⌃</span>
      </button>
      <button class="mini-abandon" aria-label="Annuler la séance" @click="askCancel">✕</button>
    </div>

    <!-- Mobile : navigation en bas (barre d'onglets) -->
    <nav class="bottomnav">
      <button v-for="t in TABS" :key="t.id" class="bn-tab" :class="{ active: view === t.id }" @click="go(t.id)">
        <span class="bn-icon">{{ t.icon }}</span>
        <span class="bn-label">{{ t.label }}</span>
      </button>
    </nav>
  </div>
</template>

