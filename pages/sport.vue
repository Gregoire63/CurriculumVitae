<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { PROGRAM } from '~/data/sportProgram'
import type { Session, Exercise } from '~/data/sportProgram'
import { useWorkout } from '~/composables/useWorkout'
import type { SessionRecord } from '~/composables/useWorkout'
import { useRestTimer } from '~/composables/useRestTimer'
import { useProfile } from '~/composables/useProfile'
import { useWithings } from '~/composables/useWithings'
import { useMealReminders } from '~/composables/useMealReminders'
import { usePhotos } from '~/composables/usePhotos'
import { warmupLoad, EFFORT_OPTIONS, isEffort, isoOf } from '~/utils/sportStats'
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
  bodyWeight, lastPerf, lastEffort, recordSession, updateSession, suggestWeight, sessionLog, seedDemo, fatigue,
} = useWorkout()
const { start: startRest, secondsLeft: restLeft, stop: stopRest, addTime: addRest } = useRestTimer()
const restFmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const { weekPlan, hydrate: hydrateProfile } = useProfile()

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
const weekDays = computed(() => weekPlan.value.map((sid, i) => {
  const s = sessionById(sid)
  return { dow: DOW[i], session: s, short: s ? SHORT[s.id] : '', sprint: !!s?.sprint }
}))

// ─────────── Jour actuel (client) ───────────
const todayDow = ref<number | null>(null)
const todayISO = ref<string | null>(null)
const todayIndex = computed(() => (todayDow.value === null ? null : (todayDow.value + 6) % 7))
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
// Note libre de la séance (douleur, sommeil, machine occupée…) : c'est ce qui
// explique une mauvaise séance quand on la relit des semaines plus tard.
const sessionNote = ref('')
const sessionStart = ref(0)
const plateOpen = ref(false)
const ormOpen = ref(false)
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
function confirmCancel() {
  cancelPromptOpen.value = false
  animateSheetDown(() => clearActive()) // la feuille glisse vers le bas puis se ferme
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
  sessionNote.value = ''
  const bw = latestWeight.value ?? 0 // poids de corps (profil) pour les exos au poids du corps
  for (const e of s.exercises) {
    const last = lastPerf(e.id)
    let rows: DraftRow[]
    if (last && last.sets.length) {
      // Reprend la dernière séance de cet exercice : poids ET reps des séries de
      // travail préremplis. Rien n'est coché → il n'y a plus qu'à ajuster et valider.
      rows = last.sets.map(st => ({
        w: st.w != null ? String(st.w) : '',
        r: st.r != null ? String(st.r) : '',
        done: false,
        warm: !!st.warm,
        w2: st.w2 != null ? String(st.w2) : '',
        r2: st.r2 != null ? String(st.r2) : '',
      }))
    } else {
      // Aucun historique : lignes par défaut du programme (poids conseillé si dispo)
      const sug = suggestWeight(e)
      rows = Array.from({ length: e.sets }, () => ({
        w: e.bodyweight && bw ? String(bw) : (sug.weight ? String(sug.weight) : ''),
        r: '', done: false, warm: false, w2: '', r2: '',
      }))
    }
    // Échauffement auto : une série d'échauffement en tête, calculée sur la charge
    // de travail la plus lourde (voir withWarmup) — remplace tout échauffement repris.
    draft[e.id] = withWarmup(e, rows)
  }
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
  sessionNote.value = rec.note ?? ''
  const bw = latestWeight.value ?? 0
  for (const e of s.exercises) {
    const entry = rec.entries.find(en => en.exId === e.id)
    if (entry && isEffort(entry.effort)) draftEffort[e.id] = entry.effort
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
/**
 * Repos après une série d'ÉCHAUFFEMENT. Court, mais pas nul : il faut bien le temps
 * de changer les disques, et sans décompte on traîne ou on enchaîne trop vite. Un
 * échauffement ne se récupère pas comme une série lourde — d'où les 45 secondes
 * plutôt que les deux à trois minutes d'une série de travail.
 */
const WARMUP_REST = 45

function restForReps(reps: string): number {
  const nums = reps.match(/\d+/g)
  const top = nums ? parseInt(nums[nums.length - 1], 10) : 12
  if (top <= 8) return 180
  if (top <= 12) return 120
  return 75
}
function toggleSet(s: { done: boolean; warm: boolean }, reps: string) {
  s.done = !s.done
  if (s.done) startRest(s.warm ? WARMUP_REST : restForReps(reps))
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
  const s = suggestWeight(ex)
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

// latestWeight : encore utilisé par l'accueil (préremplissage poids de corps) et la séance
const latestWeight = computed(() => (bodyWeight.value.length ? bodyWeight.value[bodyWeight.value.length - 1].kg : null))
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
function adoptWithings() {
  if (!import.meta.client) return
  const q = new URLSearchParams(window.location.search)
  if (!q.get('withings')) return
  if (q.get('withings') === 'ok') {
    const { hydrate, adoptFromQuery } = useWithings()
    hydrate()
    adoptFromQuery(Object.fromEntries(q.entries()))
  }
  else {
    withingsError.value = q.get('reason') || 'connexion refusée'
  }
  // La balance se branche depuis les réglages : c'est là qu'on revient après avoir
  // autorisé Withings, à côté du bouton qu'on vient d'utiliser.
  view.value = 'profil'
  window.history.replaceState({}, '', '/sport')
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
  // Rappels de repas : on les repose à chaque ouverture. Sans ça, ceux d'hier
  // resteraient en attente et ceux d'aujourd'hui n'existeraient pas.
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
  const rem = useMealReminders()
  rem.hydrate()
  const nut = useNutrition()
  nut.hydrate()
  rem.reschedule(nut.dayFor(isoOf(new Date())).gym).catch(() => { /* notifications indisponibles */ })
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
  const desktop = window.matchMedia('(min-width: 1080px)').matches
  plateOpen.value = desktop
  ormOpen.value = desktop

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
        <div class="section-label mb-8">Ta semaine <span class="muted week-hint">· s'adapte à ce que tu fais</span></div>
        <div class="week">
          <div v-for="(d, i) in weekDays" :key="i" class="week-day" :class="{ rest: !d.session, today: i === todayIndex }" :style="d.session ? { '--c': d.session.color } : {}">
            <span class="week-dow">{{ d.dow }}</span>
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
        <div class="tools-sticky">
          <div ref="timerBox" class="timer-box"><LazySportRestTimer /></div>
          <div class="tool">
            <button class="btn tool-toggle" @click="plateOpen = !plateOpen">🏋️ Calcul de barre {{ plateOpen ? '▲' : '▼' }}</button>
            <LazySportPlateCalc v-show="plateOpen" />
          </div>
          <div class="tool">
            <button class="btn tool-toggle" @click="ormOpen = !ormOpen">🎯 1RM & charges {{ ormOpen ? '▲' : '▼' }}</button>
            <LazySportOneRepMax v-show="ormOpen" />
          </div>
        </div>
      </aside>

      <div class="session-main">
        <div v-for="(e, idx) in activeSession.exercises" :key="e.id" class="card no-pad exercise">
          <button class="exhead" @click="openEx = openEx === e.id ? null : e.id">
            <div>
              <div class="ex-name">{{ idx + 1 }}. {{ e.name }}</div>
              <div class="muted mt-2">{{ e.sets }} × {{ e.reps }}<template v-if="lastPerf(e.id)"> · dernière : {{ Math.max(...lastPerf(e.id)!.sets.map(s => s.w)) }} kg</template></div>
            </div>
            <div class="set-counter mono" :class="{ complete: draft[e.id] && workCount(e.id) > 0 && doneCount(e.id) === workCount(e.id) }">{{ doneCount(e.id) }}/{{ workCount(e.id) || e.sets }}</div>
          </button>
          <div v-if="openEx === e.id" class="ex-body">
            <LazySportExerciseMove :ex-id="e.id"><LazySportMuscleMap :muscles="e.muscles" /></LazySportExerciseMove>
            <div v-if="e.bodyweight" class="hint-pill bw">🧍 Charge = ton poids de corps<template v-if="latestWeight"> ({{ latestWeight }} kg)</template> + lest. Préremplie — ajuste si tu ajoutes du poids.</div>
            <div v-if="overloadHint(e)" class="hint-pill" :class="overloadHint(e)!.cls">{{ overloadHint(e)!.text }}</div>
            <div v-if="isDumbbell(e)" class="hint-pill db">🏋️ Note le poids <strong>total des 2 haltères</strong> (ex. 2 × 20 kg → 40 kg), pas un seul.</div>
            <div class="cues">
              <div v-for="(c, i) in e.cues" :key="i" class="cue"><span class="cue-arrow">›</span>{{ c }}</div>
              <div v-if="e.machine" class="muted italic mt-6">{{ e.machine }}</div>
            </div>
            <div class="sets">
              <!-- Superset : une charge par mouvement -->
              <template v-if="e.superset">
                <div v-for="(s, i) in draft[e.id]" :key="i" class="ss-set" :class="{ done: s.done }">
                  <div class="ss-set-top">
                    <span class="mono ss-set-label">Série {{ i + 1 }}</span>
                    <button class="check" :class="{ ok: s.done }" @click="toggleSet(s, e.reps)">{{ s.done ? '✓' : '○' }}</button>
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
                  <button class="check" :class="{ ok: s.done }" @click="toggleSet(s, e.reps)">{{ s.done ? '✓' : '○' }}</button>
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

