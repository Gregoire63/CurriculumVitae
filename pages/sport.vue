<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { PROGRAM } from '~/data/sportProgram'
import type { Session, Exercise } from '~/data/sportProgram'
import { useWorkout } from '~/composables/useWorkout'
import type { SessionRecord } from '~/composables/useWorkout'
import { useRestTimer } from '~/composables/useRestTimer'
import { useProfile } from '~/composables/useProfile'
import '~/assets/css/sport.css'

useHead({
  title: 'Suivi Séances — Grégoire Raturat',
  meta: [
    { name: 'theme-color', content: '#fefcf8' },
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
  bodyWeight, lastPerf, recordSession, updateSession, suggestWeight, sessionLog,
} = useWorkout()
const { start: startRest, secondsLeft: restLeft, stop: stopRest, addTime: addRest } = useRestTimer()
const restFmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const { weekPlan, hydrate: hydrateProfile, setDay } = useProfile()

// ─────────── Muscles ───────────
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

// ─────────── Semaine (planning adaptatif) ───────────
const SHORT: Record<string, string> = { s1: 'Push', s2: 'Dos/Bic', s3: 'Jambes', s4: 'Bras' }
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
type View = 'home' | 'session' | 'progress' | 'history' | 'rapport' | 'profil'
const view = ref<View>('home')
const activeSession = ref<Session | null>(null)
const openEx = ref<string | null>(null)
const flash = ref('')
// Écran de chargement : masque le « gel » d'hydratation au démarrage.
// Rendu côté serveur (visible dès le 1er paint), il tourne pendant l'hydratation
// (animation CSS sur le compositeur, donc insensible au blocage du thread JS)
// puis disparaît dès que l'app est interactive (onMounted, après hydratation).
const booting = ref(true)
const splashGone = ref(false)
const draft = reactive<Record<string, { w: string; r: string; done: boolean; warm: boolean; w2: string; r2: string }[]>>({})
const sessionStart = ref(0)
const plateOpen = ref(false)
const ormOpen = ref(false)
// Édition d'une séance déjà enregistrée (au lieu d'en démarrer une neuve)
const editingRecord = ref<SessionRecord | null>(null)
const editReturn = ref<View>('home')
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
// Chrono flottant : visible quand on a scrollé vers le bas
const pageScrolled = ref(false)
function onScroll() { pageScrolled.value = window.scrollY > 150 }
// Position du chrono flottant calée sur le viewport VISIBLE (reste visible clavier ouvert sur iOS)
const floatTop = ref(10)
const keyboardOpen = ref(false)
function onViewport() {
  const vv = import.meta.client ? window.visualViewport : null
  floatTop.value = (vv ? Math.round(vv.offsetTop) : 0) + 10
  keyboardOpen.value = vv ? window.innerHeight - vv.height > 120 : false
}

const titles: Record<View, string> = {
  home: 'Mes séances', session: '', progress: 'Progression',
  history: 'Historique', rapport: 'Mon rapport', profil: 'Profil',
}
const pageTitle = computed(() => (view.value === 'session' && activeSession.value ? activeSession.value.name : titles[view.value]))
const TABS: { id: View; icon: string; label: string }[] = [
  { id: 'home', icon: '🏠', label: 'Accueil' },
  { id: 'rapport', icon: '📊', label: 'Rapport' },
  { id: 'progress', icon: '📈', label: 'Progrès' },
  { id: 'history', icon: '🗓', label: 'Journal' },
  { id: 'profil', icon: '⚙️', label: 'Profil' },
]

function showFlash(msg: string) { flash.value = msg; setTimeout(() => { flash.value = '' }, 3000) }
const go = (v: View) => { view.value = v }

// ─────────── Chrono séance ───────────
const elapsed = ref(0)
let elapsedInt: ReturnType<typeof setInterval> | null = null
const fmtClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
watch(view, (v) => {
  if (elapsedInt) { clearInterval(elapsedInt); elapsedInt = null }
  if (v === 'session') {
    elapsed.value = Math.floor((Date.now() - sessionStart.value) / 1000)
    elapsedInt = setInterval(() => { elapsed.value = Math.floor((Date.now() - sessionStart.value) / 1000) }, 1000)
  }
})
onUnmounted(() => { if (elapsedInt) clearInterval(elapsedInt) })

// ─────────── Séance ───────────
function startSession(s: Session) {
  activeSession.value = s
  editingRecord.value = null
  for (const k of Object.keys(draft)) delete draft[k]
  const bw = latestWeight.value ?? 0 // poids de corps (profil) pour les exos au poids du corps
  for (const e of s.exercises) {
    const last = lastPerf(e.id)
    const lastWork = last ? last.sets.filter(x => !x.warm) : [] // on ignore l'échauffement des dernières données
    const sug = suggestWeight(e)
    // Pas de montée auto forcée sur les exos au poids du corps (là on progresse surtout aux reps)
    const bumped = !e.bodyweight && (sug.reason === 'progress' || sug.reason === 'stall')
    draft[e.id] = Array.from({ length: e.sets }, (_, i) => {
      const prev = lastWork[i]?.w
      let w = ''
      if (e.bodyweight) {
        // charge = poids de corps (+ lest) : total de la dernière fois, sinon le poids du profil
        w = prev != null ? String(prev) : (bw ? String(bw) : '')
      } else if (prev != null) {
        w = String(bumped ? prev + sug.inc : prev) // garde le pyramidal, +incrément par série si montée
      } else if (bumped && sug.weight) {
        w = String(sug.weight)
      }
      // superset : charge propre au 2e mouvement, reprise de la dernière fois
      const w2 = e.superset && lastWork[i]?.w2 != null ? String(lastWork[i]!.w2) : ''
      return { w, r: '', done: false, warm: false, w2, r2: '' }
    })
  }
  openEx.value = s.exercises[0].id
  sprintOpen.value = false
  sprintInfoOpen.value = false
  sprintDraft.value = s.sprint ? newSprintRows() : []
  sessionStart.value = Date.now()
  view.value = 'session'
}
// Rouvre une séance déjà enregistrée pour la modifier (préremplie avec les perfs saisies)
function editSession(rec: SessionRecord) {
  const s = sessionById(rec.sessionId) || PROGRAM.find(p => p.name === rec.name)
  if (!s) return
  activeSession.value = s
  editingRecord.value = rec
  editReturn.value = view.value
  for (const k of Object.keys(draft)) delete draft[k]
  const bw = latestWeight.value ?? 0
  for (const e of s.exercises) {
    const entry = rec.entries.find(en => en.exId === e.id)
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
  view.value = 'session'
}
// On ne compte que les séries de travail (l'échauffement ne compte pas)
const doneCount = (exId: string) => (draft[exId] || []).filter(s => s.done && !s.warm).length
const workCount = (exId: string) => (draft[exId] || []).filter(s => !s.warm).length
function addSet(exId: string) { const rows = draft[exId]; const lastW = [...rows].reverse().find(s => !s.warm); rows.push({ w: lastW?.w ?? '', r: '', done: false, warm: false, w2: lastW?.w2 ?? '', r2: '' }) }
function addWarmup(exId: string) { const wu = warmup(exId); draft[exId].unshift({ w: wu ? String(wu[0]) : '', r: '', done: false, warm: true, w2: '', r2: '' }) }
function removeSet(exId: string, i: number) { if (draft[exId].length > 1) draft[exId].splice(i, 1) }
// Libellé : « Éch » pour l'échauffement, sinon numéro de série de travail
function setLabel(rows: { warm: boolean }[], i: number) {
  if (rows[i].warm) return 'Éch'
  let n = 0
  for (let k = 0; k <= i; k++) if (!rows[k].warm) n++
  return 'S' + n
}
function restForReps(reps: string): number {
  const nums = reps.match(/\d+/g)
  const top = nums ? parseInt(nums[nums.length - 1], 10) : 12
  if (top <= 8) return 180
  if (top <= 12) return 120
  return 75
}
function toggleSet(s: { done: boolean; warm: boolean }, reps: string) { s.done = !s.done; if (s.done && !s.warm) startRest(restForReps(reps)) }
function roundTo(v: number, step: number) { return Math.round(v / step) * step }
function warmup(exId: string): number[] | null {
  const firstWork = (draft[exId] || []).find(s => !s.warm) // 1re série de travail
  const w = parseFloat(firstWork?.w || '')
  if (!w || w <= 20) return null
  const steps = [0.5, 0.7, 0.85].map(p => roundTo(w * p, 2.5)).filter(x => x > 0 && x < w)
  return steps.length ? [...new Set(steps)] : null
}
function finishSession() {
  if (!activeSession.value) return
  const durationMin = Math.round((Date.now() - sessionStart.value) / 60000)
  const entries = activeSession.value.exercises.map(e => ({
    exId: e.id,
    sets: (draft[e.id] || []).filter(s => s.done && s.w !== '' && s.r !== '').map(s => ({
      w: parseFloat(s.w), r: parseInt(s.r, 10),
      ...(e.superset && s.w2 !== '' && s.r2 !== '' ? { w2: parseFloat(s.w2), r2: parseInt(s.r2, 10) } : {}),
      ...(s.warm ? { warm: true } : {}),
    })),
  }))
  const sprintEfforts = sprintDraft.value
    .filter(r => r.duration.trim() || r.intensity.trim())
    .map(r => ({ kind: r.kind, count: parseInt(r.count, 10) || 1, duration: r.duration.trim(), intensity: r.intensity.trim() }))
  // Mode édition : on met à jour l'enregistrement existant au lieu d'en créer un nouveau
  if (editingRecord.value) {
    updateSession(editingRecord.value, entries, durationMin, sprintEfforts)
    const back = editReturn.value
    editingRecord.value = null
    view.value = back
    showFlash(`Séance modifiée ✓ (${durationMin} min)`)
    return
  }
  const prs = recordSession(entries, durationMin, { sessionId: activeSession.value.id, name: activeSession.value.name }, sprintEfforts)
  // Le planning du jour s'adapte automatiquement à la séance réellement faite
  if (todayIndex.value !== null) setDay(todayIndex.value, activeSession.value.id)
  view.value = 'home'
  showFlash(prs.length ? `Séance enregistrée (${durationMin} min) — 🏆 PR : ${prs.join(', ')}` : `Séance enregistrée ✓ (${durationMin} min)`)
}
// Quitte la séance sans enregistrer (retourne à l'écran d'origine si on éditait)
function quitSession() {
  const back = editingRecord.value ? editReturn.value : 'home'
  editingRecord.value = null
  view.value = back
}
function lastLabel(exId: string) { const last = lastPerf(exId); if (!last) return null; const work = last.sets.filter(s => !s.warm); return work.length ? `Dernière (${last.date}) : ${work.map(s => `${s.w}×${s.r}${s.w2 != null ? ` / ${s.w2}×${s.r2}` : ''}`).join(' · ')}` : null }
// Conseil de surcharge progressive (monte la charge quand on progresse ou qu'on stagne)
function overloadHint(ex: Exercise): { cls: string; text: string } | null {
  if (ex.bodyweight || ex.superset) return null // au poids du corps / superset : progression gérée à la main
  const s = suggestWeight(ex)
  if (s.reason === 'progress') return { cls: 'progress', text: `🎯 Objectif de reps atteint → +${s.inc} kg par série (jusqu'à ${s.weight} kg)` }
  if (s.reason === 'stall') return { cls: 'stall', text: `⏫ Bloqué ${s.streak} séances à ${s.base} kg — on force +${s.inc} kg par série` }
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

onMounted(() => {
  // Hydratation terminée → on retire l'écran de chargement (fondu court)
  requestAnimationFrame(() => { booting.value = false })
  setTimeout(() => { splashGone.value = true }, 450)
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sport-sw.js', { scope: '/sport' }).catch(() => {})
  hydrateProfile()
  const now = new Date()
  todayDow.value = now.getDay()
  todayISO.value = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())}`
  const desktop = window.matchMedia('(min-width: 1080px)').matches
  plateOpen.value = desktop
  ormOpen.value = desktop
  window.addEventListener('scroll', onScroll, { passive: true })
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewport)
    window.visualViewport.addEventListener('scroll', onViewport)
    onViewport()
  }
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
  if (import.meta.client && window.visualViewport) {
    window.visualViewport.removeEventListener('resize', onViewport)
    window.visualViewport.removeEventListener('scroll', onViewport)
  }
})
</script>

<template>
  <div class="sport-app" :class="{ 'has-bottomnav': view !== 'session' }">
    <!-- Écran de chargement (masque le gel d'hydratation ; l'anim tourne sur le compositeur) -->
    <div v-if="!splashGone" class="boot-splash" :class="{ 'boot-hide': !booting }" aria-hidden="true">
      <div class="boot-mark">GR</div>
      <!-- GIF animé : le pipeline image du navigateur le fait tourner même quand le thread JS est bloqué -->
      <img src="/sport/spinner.gif" class="boot-spinner-img" width="48" height="48" alt="">
      <div class="boot-label">Suivi séances</div>
    </div>

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
          <template v-if="view === 'session'">
            <span class="session-clock mono">⏱ {{ fmtClock(elapsed) }}</span>
            <button class="btn" @click="quitSession">Quitter</button>
          </template>
          <a v-else href="/" class="btn ghost">↗ Portfolio</a>
        </div>
      </div>
      <!-- Desktop : navigation en haut -->
      <nav v-if="view !== 'session'" class="topnav">
        <button v-for="t in TABS" :key="t.id" class="topnav-tab" :class="{ active: view === t.id }" @click="go(t.id)">
          <span class="tn-icon">{{ t.icon }}</span>
          <span class="tn-label">{{ t.label }}</span>
        </button>
      </nav>
    </header>

    <!-- Chrono de repos flottant : fixe en haut quand on a scrollé, revient à sa place en haut de page -->
    <transition name="ft-drop">
      <div v-if="view === 'session' && restLeft > 0 && (pageScrolled || keyboardOpen)" class="floating-timer" :style="{ top: floatTop + 'px' }">
        <span class="ft-time mono">{{ restFmt(restLeft) }}</span>
        <span class="ft-label">Repos</span>
        <button class="ft-btn" @click="addRest(15)">+15</button>
        <button class="ft-btn stop" @click="stopRest()">Stop</button>
      </div>
    </transition>

    <div v-if="flash" class="flash">{{ flash }}</div>

    <!-- ═══════════ ACCUEIL ═══════════ -->
    <div v-if="view === 'home'" class="stack">
      <section v-if="todaySession" class="today card" :style="{ '--c': todaySession.color }">
        <div class="today-eyebrow"><span class="today-dot"></span> Séance du jour · {{ todayEntry!.dow }}</div>
        <h2 class="today-name">{{ todaySession.name }}</h2>
        <div v-if="doneToday.length" class="done-badge">✓ Déjà fait aujourd'hui : {{ doneToday.map(s => s.name).join(', ') }}</div>
        <div class="sc-muscles"><span v-for="m in sessionMuscles(todaySession)" :key="m" class="sc-chip">{{ m }}</span></div>
        <div class="today-foot">
          <span class="muted">{{ todaySession.exercises.length }} exercices<template v-if="todaySession.sprint"> · ⚡ sprint</template></span>
          <button v-if="todayRecord" class="btn-primary today-go" :style="{ background: todaySession.color }" @click="editSession(todayRecord!)">✏️ Modifier la séance →</button>
          <button v-else class="btn-primary today-go" :style="{ background: todaySession.color }" @click="startSession(todaySession)">Démarrer la séance →</button>
        </div>
      </section>

      <section v-else-if="todayIndex !== null" class="today card rest">
        <div class="today-eyebrow">Aujourd'hui</div>
        <h2 class="today-name">Repos 💤</h2>
        <p class="muted rest-txt">Récupération.<template v-if="nextSession"> Prochaine séance : <b>{{ nextSession.dow }}</b> · {{ nextSession.session!.name }}.</template></p>
        <button v-if="nextSession" class="btn today-go" @click="startSession(nextSession.session!)">Faire {{ nextSession.session!.name }} maintenant →</button>
      </section>

      <div class="section-label">{{ todaySession ? 'Ou commence une autre séance' : 'Toutes les séances' }}</div>
      <div class="session-grid">
        <button v-for="s in otherSessions" :key="s.id" class="session-card" :style="{ '--c': s.color }" @click="startSession(s)">
          <div class="sc-top">
            <span class="sc-day">{{ s.tag }}</span>
            <span v-if="s.sprint" class="sc-sprint">⚡ sprint</span>
          </div>
          <div class="sc-name">{{ s.name }}</div>
          <div class="sc-muscles"><span v-for="m in sessionMuscles(s)" :key="m" class="sc-chip">{{ m }}</span></div>
          <div class="sc-foot"><span class="sc-count mono">{{ s.exercises.length }} exercices</span><span class="sc-go">Démarrer →</span></div>
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

    <!-- ═══════════ SÉANCE ═══════════ -->
    <div v-if="view === 'session' && activeSession" class="session-layout" :style="{ '--c': activeSession.color }">
      <aside class="session-tools">
        <div class="tools-sticky">
          <div class="timer-box"><LazySportRestTimer /></div>
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
            <div v-if="!e.bodyweight && !e.superset && warmup(e.id)" class="hint-pill warmup">🔥 Échauffement : <span class="mono">{{ warmup(e.id)!.join(' · ') }} kg</span></div>
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
            <div v-if="lastLabel(e.id)" class="muted last-perf">{{ lastLabel(e.id) }}</div>
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
        <button class="btn-primary finish" @click="finishSession">{{ editingRecord ? 'Enregistrer les modifications' : 'Terminer et enregistrer la séance' }}</button>
      </div>
    </div>

    <!-- Onglets secondaires : composants chargés à la demande (moins de JS hydraté sur l'accueil) -->
    <LazySportReport v-if="view === 'rapport'" :today-iso="todayISO" :today-dow="todayDow" />
    <LazySportProgress v-if="view === 'progress'" />
    <LazySportHistory v-if="view === 'history'" :today-iso="todayISO" @edit="editSession" />
    <LazySportProfile v-if="view === 'profil'" :today-iso="todayISO" @flash="showFlash" />

    <!-- Mobile : navigation en bas (barre d'onglets) -->
    <nav v-if="view !== 'session'" class="bottomnav">
      <button v-for="t in TABS" :key="t.id" class="bn-tab" :class="{ active: view === t.id }" @click="go(t.id)">
        <span class="bn-icon">{{ t.icon }}</span>
        <span class="bn-label">{{ t.label }}</span>
      </button>
    </nav>
  </div>
</template>

