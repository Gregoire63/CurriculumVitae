<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { PROGRAM, ALL_EXERCISES } from '~/data/sportProgram'
import type { Session, Exercise } from '~/data/sportProgram'
import { useWorkout } from '~/composables/useWorkout'
import { useRestTimer } from '~/composables/useRestTimer'
import { useProfile } from '~/composables/useProfile'

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
  logs, bodyWeight, lastPerf, bestCharge, recordSession, progressionHint, suggestWeight,
  chartData, sessionLog, addBodyWeight, exportJSON, importJSON,
} = useWorkout()
const { start: startRest, secondsLeft: restLeft, stop: stopRest, addTime: addRest } = useRestTimer()
const restFmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const { profile, weekPlan, hydrate: hydrateProfile, setHeight, setSex, setBirthYear, setDay, resetPlan, restore: restoreProfile } = useProfile()

// ─────────── Muscles ───────────
const MUSCLE_LABELS: Record<string, string> = {
  pecs: 'Pecs', 'epaules-av': 'Épaules', 'epaules-lat': 'Épaules', 'epaules-ar': 'Épaules',
  triceps: 'Triceps', biceps: 'Biceps', 'avant-bras': 'Avant-bras', abdos: 'Abdos',
  dos: 'Dos', quadris: 'Quadris', ischios: 'Ischios', fessiers: 'Fessiers', mollets: 'Mollets',
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

// ─────────── État UI ───────────
type View = 'home' | 'session' | 'progress' | 'history' | 'rapport' | 'profil'
const view = ref<View>('home')
const activeSession = ref<Session | null>(null)
const openEx = ref<string | null>(null)
// Progrès : première séance sélectionnée par défaut
const progressSession = ref<string | null>(PROGRAM[0]?.id ?? null)
const flash = ref('')
const draft = reactive<Record<string, { w: string; r: string; done: boolean; warm: boolean; w2: string; r2: string }[]>>({})
const sessionStart = ref(0)
const plateOpen = ref(false)
const ormOpen = ref(false)
const showSwitch = ref(false)
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
  showSwitch.value = false
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
  const prs = recordSession(entries, durationMin, { sessionId: activeSession.value.id, name: activeSession.value.name }, sprintEfforts)
  // Le planning du jour s'adapte automatiquement à la séance réellement faite
  if (todayIndex.value !== null) setDay(todayIndex.value, activeSession.value.id)
  view.value = 'home'
  showFlash(prs.length ? `Séance enregistrée (${durationMin} min) — 🏆 PR : ${prs.join(', ')}` : `Séance enregistrée ✓ (${durationMin} min)`)
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

// ─────────── Progression (par séance) ───────────
const progressSessionObj = computed(() => (progressSession.value ? PROGRAM.find(p => p.id === progressSession.value) ?? null : null))
function exStats(exId: string) {
  const d = chartData(exId)
  if (!d.length) return null
  return { max: d[d.length - 1].charge, gain: d[d.length - 1].charge - d[0].charge, e1rm: d[d.length - 1].e1rm, data: d }
}
const progExStats = computed(() => (progressSessionObj.value?.exercises ?? []).map(e => ({ e, stats: exStats(e.id) })))
const exName = (id: string) => ALL_EXERCISES.find(e => e.id === id)?.name ?? id

// ─────────── Poids & IMC ───────────
const bwData = computed(() => bodyWeight.value.map(e => ({ date: e.date.slice(5), kg: e.kg })))
const latestWeight = computed(() => (bodyWeight.value.length ? bodyWeight.value[bodyWeight.value.length - 1].kg : null))
const bwTrend = computed(() => { const d = bodyWeight.value; return d.length >= 2 ? +(d[d.length - 1].kg - d[0].kg).toFixed(1) : 0 })
const bmi = computed(() => { const h = profile.value.heightCm, w = latestWeight.value; return h && w ? +(w / ((h / 100) ** 2)).toFixed(1) : null })
const bmiCat = computed(() => {
  const b = bmi.value
  if (b === null) return null
  if (b < 18.5) return { label: 'Maigreur', color: '#4a6fa5' }
  if (b < 25) return { label: 'Corpulence normale', color: '#3f7a4f' }
  if (b < 30) return { label: 'Surpoids', color: '#a97b1e' }
  return { label: 'Obésité', color: '#b5502f' }
})
const age = computed(() => { const y = profile.value.birthYear; return y && todayISO.value ? parseInt(todayISO.value.slice(0, 4), 10) - y : null })
const bmr = computed(() => {
  const w = latestWeight.value, h = profile.value.heightCm, a = age.value, s = profile.value.sex
  if (!w || !h || !a || !s) return null
  const base = 10 * w + 6.25 * h - 5 * a
  return Math.round(s === 'h' ? base + 5 : base - 161)
})
const maintenance = computed(() => (bmr.value ? Math.round(bmr.value * 1.55) : null))

// ─────────── Rapport ───────────
const sessions = computed(() => sessionLog())
const totalSessions = computed(() => sessions.value.length)
const p2 = (n: number) => String(n).padStart(2, '0')
const startOfWeekISO = computed(() => {
  if (!todayISO.value || todayDow.value === null) return null
  const d = new Date(todayISO.value + 'T00:00:00')
  d.setDate(d.getDate() - ((todayDow.value + 6) % 7))
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
})
const sessionsThisWeek = computed(() => (startOfWeekISO.value ? sessions.value.filter(s => s.at.slice(0, 10) >= startOfWeekISO.value!).length : 0))
const avgDuration = computed(() => {
  const ds = sessions.value.map(s => s.durationMin).filter((x): x is number => !!x)
  return ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0
})
const totalVolume = computed(() => {
  let v = 0
  for (const ss of Object.values(logs.value)) for (const s of ss) for (const set of s.sets) if (!set.warm) v += set.w * set.r + (set.w2 && set.r2 ? set.w2 * set.r2 : 0)
  return v
})
const volumeThisWeek = computed(() => {
  if (!startOfWeekISO.value) return 0
  let v = 0
  for (const ss of Object.values(logs.value)) for (const s of ss) if (s.date >= startOfWeekISO.value!) for (const set of s.sets) if (!set.warm) v += set.w * set.r + (set.w2 && set.r2 ? set.w2 * set.r2 : 0)
  return v
})
const muscleVolume = computed(() => {
  const m: Record<string, number> = {}
  for (const [exId, ss] of Object.entries(logs.value)) {
    const ex = ALL_EXERCISES.find(e => e.id === exId)
    if (!ex) continue
    let sets = 0
    for (const s of ss) sets += s.sets.filter(x => !x.warm).length
    for (const mus of ex.muscles) { const l = MUSCLE_LABELS[mus] || mus; m[l] = (m[l] || 0) + sets }
  }
  return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 7)
})
const muscleMax = computed(() => muscleVolume.value[0]?.[1] || 1)
const RECORD_EXOS = ['dc-barre', 'dev-halteres', 'squat', 'sdt-r', 'tirage-v', 'dev-mil', 'dips']
const records = computed(() => RECORD_EXOS.map(id => ({ name: exName(id), best: bestCharge(id) })).filter(r => r.best > 0))
const fmtVol = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${Math.round(v)} kg`)
const hasData = computed(() => totalSessions.value > 0 || latestWeight.value !== null)

// ─────────── Handlers ───────────
function onWeight(ev: Event) {
  const kg = parseFloat((ev.target as HTMLInputElement).value)
  if (!kg || kg < 30 || kg > 250) return
  addBodyWeight(kg); showFlash('Poids enregistré ✓')
}
async function onImport(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    await importJSON(file, data => restoreProfile(data as { profile?: typeof profile.value; weekPlan?: typeof weekPlan.value }))
    showFlash('Données importées ✓')
  } catch { showFlash('Fichier invalide') }
}
function onHeight(ev: Event) { setHeight(parseFloat((ev.target as HTMLInputElement).value) || null) }
function onYear(ev: Event) { setBirthYear(parseInt((ev.target as HTMLInputElement).value, 10) || null) }

onMounted(() => {
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
            <button class="btn" @click="go('home')">Quitter</button>
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
          <button class="btn-primary today-go" :style="{ background: todaySession.color }" @click="startSession(todaySession)">Démarrer la séance →</button>
        </div>
        <button class="switch-link" @click="showSwitch = !showSwitch">Plutôt une autre séance aujourd'hui ? {{ showSwitch ? '▲' : '▼' }}</button>
        <div v-if="showSwitch" class="switch-row">
          <button v-for="s in otherSessions" :key="s.id" class="chip-btn" :style="{ '--c': s.color }" @click="startSession(s)">{{ s.name }}</button>
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
          <div class="timer-box"><SportRestTimer /></div>
          <div class="tool">
            <button class="btn tool-toggle" @click="plateOpen = !plateOpen">🏋️ Calcul de barre {{ plateOpen ? '▲' : '▼' }}</button>
            <SportPlateCalc v-show="plateOpen" />
          </div>
          <div class="tool">
            <button class="btn tool-toggle" @click="ormOpen = !ormOpen">🎯 1RM & charges {{ ormOpen ? '▲' : '▼' }}</button>
            <SportOneRepMax v-show="ormOpen" />
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
            <SportExerciseMove :ex-id="e.id"><SportMuscleMap :muscles="e.muscles" /></SportExerciseMove>
            <div v-if="e.bodyweight" class="hint-pill bw">🧍 Charge = ton poids de corps<template v-if="latestWeight"> ({{ latestWeight }} kg)</template> + lest. Préremplie — ajuste si tu ajoutes du poids.</div>
            <div v-if="overloadHint(e)" class="hint-pill" :class="overloadHint(e)!.cls">{{ overloadHint(e)!.text }}</div>
            <div v-if="!e.bodyweight && !e.superset && warmup(e.id)" class="hint-pill warmup">🔥 Échauffement : <span class="mono">{{ warmup(e.id)!.join(' · ') }} kg</span></div>
            <div v-if="isDumbbell(e)" class="hint-pill db">🏋️ Note le poids <strong>total des 2 haltères</strong> (ex. 2 × 20 kg → 40 kg), pas un seul.</div>
            <div class="cues">
              <div v-for="(c, i) in e.cues" :key="i" class="cue"><span class="cue-arrow">›</span>{{ c }}</div>
              <div class="muted italic mt-6">{{ e.machine }}</div>
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
        <button class="btn-primary finish" @click="finishSession">Terminer et enregistrer la séance</button>
      </div>
    </div>

    <!-- ═══════════ RAPPORT ═══════════ -->
    <div v-if="view === 'rapport'" class="stack">
      <div v-if="!hasData" class="card empty">Ton rapport se construit au fil des séances.<br>Renseigne ta taille/poids dans <b>Profil</b> et enregistre une séance.</div>
      <template v-else>
        <div class="card">
          <div class="section-label mb-8">Corps</div>
          <div class="stat-grid">
            <div class="stat"><div class="stat-v mono">{{ latestWeight ?? '—' }}<span v-if="latestWeight" class="stat-u">kg</span></div><div class="stat-l">Poids actuel</div></div>
            <div class="stat"><div class="stat-v mono" :style="bmiCat ? { color: bmiCat.color } : {}">{{ bmi ?? '—' }}</div><div class="stat-l">{{ bmiCat ? bmiCat.label : 'IMC (→ Profil)' }}</div></div>
            <div class="stat"><div class="stat-v mono" :class="bwTrend < 0 ? 'pos' : bwTrend > 0 ? 'warn' : ''">{{ bwTrend > 0 ? '+' : '' }}{{ bwTrend }}<span class="stat-u">kg</span></div><div class="stat-l">Depuis le début</div></div>
            <div class="stat"><div class="stat-v mono">{{ maintenance ?? '—' }}<span v-if="maintenance" class="stat-u">kcal</span></div><div class="stat-l">Maintien estimé</div></div>
          </div>
        </div>
        <div class="card">
          <div class="section-label mb-8">Activité</div>
          <div class="stat-grid">
            <div class="stat"><div class="stat-v mono">{{ totalSessions }}</div><div class="stat-l">Séances totales</div></div>
            <div class="stat"><div class="stat-v mono">{{ sessionsThisWeek }}</div><div class="stat-l">Cette semaine</div></div>
            <div class="stat"><div class="stat-v mono">{{ avgDuration }}<span class="stat-u">min</span></div><div class="stat-l">Durée moyenne</div></div>
            <div class="stat"><div class="stat-v mono">{{ fmtVol(totalVolume) }}</div><div class="stat-l">Volume total</div></div>
          </div>
          <div class="muted mt-6">Volume cette semaine : <b>{{ fmtVol(volumeThisWeek) }}</b></div>
        </div>
        <div v-if="muscleVolume.length" class="card">
          <div class="section-label mb-8">Répartition musculaire (séries cumulées)</div>
          <div class="mv-list">
            <div v-for="[label, count] in muscleVolume" :key="label" class="mv-row">
              <span class="mv-label">{{ label }}</span>
              <div class="mv-bar"><div class="mv-fill" :style="{ width: (count / muscleMax * 100) + '%' }"></div></div>
              <span class="mv-count mono">{{ count }}</span>
            </div>
          </div>
        </div>
        <div v-if="records.length" class="card">
          <div class="section-label mb-8">Records (charge max)</div>
          <div class="rec-list">
            <div v-for="r in records" :key="r.name" class="rec-row"><span class="rec-name">{{ r.name }}</span><span class="mono rec-val">{{ r.best }} kg</span></div>
          </div>
        </div>
      </template>
    </div>

    <!-- ═══════════ PROGRESSION (cartes par séance) ═══════════ -->
    <div v-if="view === 'progress'" class="stack">
      <div class="section-label">Touche une séance pour voir la progression de tous ses exercices</div>
      <div class="prog-grid">
        <button
          v-for="s in PROGRAM" :key="s.id"
          class="session-card prog-card" :class="{ active: progressSession === s.id }"
          :style="{ '--c': s.color }"
          @click="progressSession = progressSession === s.id ? null : s.id"
        >
          <div class="sc-top"><span class="sc-day">{{ s.tag }}</span><span v-if="s.sprint" class="sc-sprint">⚡</span></div>
          <div class="sc-name">{{ s.name }}</div>
          <div class="sc-muscles"><span v-for="m in sessionMuscles(s)" :key="m" class="sc-chip">{{ m }}</span></div>
          <div class="sc-foot">
            <span class="sc-count mono">{{ s.exercises.length }} exos</span>
            <span class="sc-go">{{ progressSession === s.id ? 'Masquer ▲' : 'Courbes →' }}</span>
          </div>
        </button>
      </div>

      <template v-if="progressSessionObj">
        <div class="prog-ex-list">
          <div v-for="{ e, stats } in progExStats" :key="e.id" class="card prog-ex">
            <div class="prog-ex-head">
              <div class="prog-ex-name">{{ e.name }}</div>
              <div v-if="stats" class="prog-ex-kpis">
                <span class="pk"><b class="mono">{{ stats.max }}</b> kg max</span>
                <span class="pk" :class="{ pos: stats.gain > 0 }"><b class="mono">{{ stats.gain > 0 ? '+' : '' }}{{ stats.gain }}</b> kg évol.</span>
                <span class="pk"><b class="mono">{{ stats.e1rm }}</b> kg 1RM</span>
              </div>
            </div>
            <SportSvgChart v-if="stats" :data="stats.data" y-key="charge" :color="progressSessionObj.color" :height="150" />
            <div v-else class="muted prog-empty">Pas encore de données — enregistre une séance avec cet exercice.</div>
          </div>
        </div>
      </template>
      <div v-else class="card empty">Choisis une séance ci-dessus pour afficher toutes ses courbes d'un coup.</div>
    </div>

    <!-- ═══════════ JOURNAL DES SÉANCES ═══════════ -->
    <div v-if="view === 'history'" class="stack">
      <div v-if="!sessions.length" class="card empty">Aucune séance enregistrée pour l'instant.<br>Tes séances apparaîtront ici avec la date et l'heure.</div>
      <div class="history-grid">
        <div v-for="(s, i) in sessions" :key="i" class="card">
          <div class="row-between mb-8">
            <div class="hist-name">{{ s.name }}</div>
            <div class="hist-when mono">{{ s.at.slice(0, 10) }} · {{ s.at.slice(11, 16) }}<template v-if="s.durationMin"> · {{ s.durationMin }} min</template></div>
          </div>
          <div v-for="e in s.entries" :key="e.exId" class="history-entry">
            <span class="history-ex">{{ exName(e.exId) }}</span>
            <span class="mono muted">{{ e.sets.map(x => `${x.warm ? '🔥' : ''}${x.w}×${x.r}${x.w2 != null ? ` / ${x.w2}×${x.r2}` : ''}`).join(' · ') }}</span>
          </div>
          <div v-for="(sp, k) in (s.sprint || [])" :key="'sp' + k" class="history-entry">
            <span class="history-ex">⚡ {{ sp.kind === 'echauffement' ? 'Échauffement' : 'Sprint' }}</span>
            <span class="mono muted">{{ sp.count }} × {{ sp.duration }}<template v-if="sp.intensity"> @ {{ sp.intensity }}</template></span>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════ PROFIL (infos + poids + données) ═══════════ -->
    <div v-if="view === 'profil'" class="stack">
      <div class="card">
        <div class="section-label mb-8">Mon profil</div>
        <div class="form-grid">
          <label class="field"><span>Taille (cm)</span><input type="number" inputmode="numeric" :value="profile.heightCm ?? ''" placeholder="180" @change="onHeight"></label>
          <label class="field"><span>Poids (kg)</span><input type="number" inputmode="decimal" step="0.1" :value="latestWeight ?? ''" placeholder="75" @change="onWeight"></label>
          <label class="field"><span>Année de naissance</span><input type="number" inputmode="numeric" :value="profile.birthYear ?? ''" placeholder="1998" @change="onYear"></label>
          <div class="field">
            <span>Sexe</span>
            <div class="sex-row">
              <button class="btn" :class="{ sel: profile.sex === 'h' }" @click="setSex('h')">Homme</button>
              <button class="btn" :class="{ sel: profile.sex === 'f' }" @click="setSex('f')">Femme</button>
            </div>
          </div>
        </div>
        <div v-if="bmi || age || bmr" class="profil-summary">
          <span v-if="bmi" class="ps-item">IMC <b :style="{ color: bmiCat!.color }">{{ bmi }}</b> · {{ bmiCat!.label }}</span>
          <span v-if="age" class="ps-item">{{ age }} ans</span>
          <span v-if="bmr" class="ps-item">Métabolisme de base <b>{{ bmr }} kcal</b></span>
          <span v-if="maintenance" class="ps-item">Maintien ≈ <b>{{ maintenance }} kcal</b></span>
        </div>
        <div v-else class="muted">Renseigne taille + poids pour l'IMC, + sexe et année de naissance pour les calories. Tout est calculé à partir de ces données.</div>
      </div>

      <!-- Suivi du poids (lecture seule : la saisie se fait dans « Mon profil ») -->
      <div v-if="bwData.length" class="card">
        <div class="row-between mb-8">
          <div class="section-label">Suivi du poids</div>
          <div v-if="bwTrend !== 0" class="mono bmi-inline" :class="bwTrend < 0 ? 'trend-down' : 'trend-up'">{{ bwTrend > 0 ? '+' : '' }}{{ bwTrend }} kg depuis le début</div>
        </div>
        <div class="chart-wrap"><SportSvgChart :data="bwData" y-key="kg" color="#b07d2e" :height="170" /></div>
      </div>

      <!-- Données -->
      <div class="card">
        <div class="section-label mb-8">Données</div>
        <div class="nav-row">
          <button class="btn flex-1" @click="exportJSON({ profile, weekPlan })">⬇ Exporter</button>
          <label class="btn flex-1 center">⬆ Importer<input type="file" accept=".json" class="hidden-input" @change="onImport"></label>
          <button class="btn flex-1" @click="resetPlan()">↺ Réinit. planning</button>
        </div>
        <div class="muted mt-6">Ton planning s'adapte tout seul à la séance que tu fais chaque jour. « Réinit. » remet le planning par défaut.</div>
      </div>
    </div>

    <!-- Mobile : navigation en bas (barre d'onglets) -->
    <nav v-if="view !== 'session'" class="bottomnav">
      <button v-for="t in TABS" :key="t.id" class="bn-tab" :class="{ active: view === t.id }" @click="go(t.id)">
        <span class="bn-icon">{{ t.icon }}</span>
        <span class="bn-label">{{ t.label }}</span>
      </button>
    </nav>
  </div>
</template>

<style scoped>
.sport-app {
  min-height: 100vh;
  background: linear-gradient(160deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
  color: var(--text-primary);
  padding-bottom: 40px; max-width: 560px; margin: 0 auto;
}
/* Curseur : on garde le curseur custom du portfolio quand il est actif (desktop, pointeur fin) ;
   sinon on rétablit un curseur natif utilisable (tactile / fenêtre étroite) au lieu du cursor:none global */
@media (max-width: 1023px), (hover: none), (pointer: coarse) {
  .sport-app, .sport-app * { cursor: auto !important; }
  .sport-app button, .sport-app a, .sport-app label, .sport-app select,
  .sport-app .topnav-tab, .sport-app .bn-tab, .sport-app .session-card, .sport-app .check,
  .sport-app .switch-link, .sport-app .linklike, .sport-app .add-set { cursor: pointer !important; }
  .sport-app input, .sport-app textarea { cursor: text !important; }
}
.mono { font-family: var(--font-mono); }
.muted { color: var(--text-muted); font-size: 12px; }
.italic { font-style: italic; }

.sport-header {
  position: sticky; top: 0; z-index: 20;
  display: flex; flex-direction: column; gap: 10px; padding: 12px 16px;
  background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
  backdrop-filter: blur(10px); border-bottom: 1px solid var(--bg-accent);
}
.header-top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
/* Navigation en haut : réservée au desktop (cachée sur mobile, remplacée par la barre du bas) */
.topnav { display: none; gap: 4px; overflow-x: auto; scrollbar-width: none; }
.topnav::-webkit-scrollbar { display: none; }
.topnav-tab {
  flex: 1 1 0; min-width: 0;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: none; border: none; cursor: pointer; padding: 6px 4px; border-radius: 10px;
  color: var(--text-muted); transition: background 0.15s, color 0.15s;
}
.topnav-tab:hover { background: var(--bg-secondary); }
.topnav-tab.active { color: var(--accent-primary); background: var(--bg-secondary); }
.tn-icon { font-size: 15px; line-height: 1; }
.tn-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.02em; white-space: nowrap; }
.topnav-tab.active .tn-label { font-weight: 700; }

/* Barre de navigation en bas (mobile / tablette) */
.bottomnav {
  position: fixed; left: 0; right: 0; bottom: 0; z-index: 30;
  max-width: 560px; margin: 0 auto;
  display: flex; justify-content: space-around;
  background: color-mix(in srgb, var(--bg-primary) 94%, transparent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--bg-accent);
  padding: 8px 6px calc(10px + env(safe-area-inset-bottom, 0px));
}
.bn-tab {
  flex: 1; background: none; border: none; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 4px 2px; border-radius: 10px; color: var(--text-muted);
  transition: color 0.15s;
}
.bn-icon { font-size: 18px; line-height: 1; filter: grayscale(0.35) opacity(0.75); transition: filter 0.2s; }
.bn-label { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.03em; }
.bn-tab.active { color: var(--accent-primary); }
.bn-tab.active .bn-icon { filter: none; }
.bn-tab.active .bn-label { font-weight: 700; }
/* Réserve l'espace du bas pour ne pas masquer le contenu derrière la barre fixe */
.sport-app.has-bottomnav { padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }
.brand { display: flex; align-items: center; gap: 10px; background: none; border: none; cursor: pointer; text-align: left; }
.brand-mark { width: 38px; height: 38px; flex-shrink: 0; border-radius: 11px; background: var(--accent-primary); color: var(--bg-primary); display: flex; align-items: center; justify-content: center; font-family: var(--font-display); font-weight: 700; font-size: 15px; }
.brand-text { display: flex; flex-direction: column; }
.brand-eyebrow { font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent-primary); }
.brand-title { font-family: var(--font-display); font-size: 20px; font-weight: 700; line-height: 1.1; }
.header-right { display: flex; align-items: center; gap: 8px; }
.session-clock { font-size: 14px; font-weight: 700; color: var(--accent-primary); white-space: nowrap; }

.btn { background: var(--bg-primary); border: 1px solid var(--bg-accent); color: var(--text-primary); border-radius: 10px; padding: 9px 14px; font-family: var(--font-body); font-size: 13px; cursor: pointer; transition: border-color 0.2s, background 0.2s, transform 0.15s; }
.btn:hover { border-color: var(--accent-secondary); }
.btn:active { transform: scale(0.98); }
.btn.ghost { background: transparent; color: var(--accent-primary); text-decoration: none; }
.btn.sel { background: var(--accent-primary); border-color: var(--accent-primary); color: var(--bg-primary); }
.btn-primary { background: var(--accent-primary); border: none; color: var(--bg-primary); border-radius: 12px; padding: 12px 18px; font-family: var(--font-body); font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s, transform 0.15s; }
.btn-primary:hover { background: var(--accent-strong); }
.btn-primary:active { transform: scale(0.98); }

.stack { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.card { background: var(--bg-primary); border: 1px solid var(--bg-accent); border-radius: 18px; padding: 16px; }
.card.no-pad { padding: 0; overflow: hidden; }
.section-label { font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--accent-primary); }
.week-hint { text-transform: none; letter-spacing: 0; }
.flash { margin: 12px 16px 0; background: #e7f0e2; border: 1px solid #bcd8ae; color: #3f7a4f; border-radius: 12px; padding: 11px 14px; font-size: 14px; font-weight: 500; }
.row-between { display: flex; justify-content: space-between; align-items: center; }
.mt-2 { margin-top: 2px; } .mt-6 { margin-top: 8px; } .mb-8 { margin-bottom: 8px; }
.flex-1 { flex: 1; } .center { text-align: center; } .hidden-input { display: none; }
.empty { text-align: center; color: var(--text-muted); padding: 32px; font-size: 14px; line-height: 1.6; }

/* Séance du jour */
.today { border-left: 5px solid var(--c, var(--accent-primary)); background: linear-gradient(135deg, color-mix(in srgb, var(--c) 10%, var(--bg-primary)) 0%, var(--bg-primary) 70%); display: flex; flex-direction: column; gap: 12px; }
.today.rest { --c: var(--accent-secondary); }
.today-eyebrow { display: flex; align-items: center; gap: 8px; font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--c, var(--accent-primary)); }
.today-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--c); box-shadow: 0 0 0 4px color-mix(in srgb, var(--c) 22%, transparent); }
.today-name { font-family: var(--font-display); font-size: 30px; font-weight: 800; line-height: 1.05; }
.done-badge { align-self: flex-start; font-size: 12px; font-weight: 600; color: #3f7a4f; background: #e7f0e2; border: 1px solid #bcd8ae; border-radius: 20px; padding: 4px 12px; }
.rest-txt { font-size: 14px; line-height: 1.5; }
.today-foot { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.today-go { flex-shrink: 0; }
.switch-link { align-self: flex-start; background: none; border: none; cursor: pointer; color: var(--text-secondary); font-family: var(--font-mono); font-size: 12px; text-decoration: underline; text-underline-offset: 3px; padding: 0; }
.switch-row { display: flex; flex-wrap: wrap; gap: 8px; }
.chip-btn { background: var(--bg-secondary); border: 1px solid var(--bg-accent); border-left: 3px solid var(--c); color: var(--text-primary); border-radius: 9px; padding: 8px 12px; font-size: 13px; cursor: pointer; }
.chip-btn:hover { border-color: var(--c); }

/* Cartes séance */
.session-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.session-card { display: flex; flex-direction: column; gap: 10px; text-align: left; cursor: pointer; background: var(--bg-primary); border: 1px solid var(--bg-accent); border-left: 4px solid var(--c); border-radius: 16px; padding: 16px; transition: transform 0.2s var(--ease-bounce), box-shadow 0.2s, border-color 0.2s; }
.session-card:hover { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(139, 111, 92, 0.14); }
.sc-top { display: flex; justify-content: space-between; align-items: center; }
.sc-day { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
.sc-sprint { font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: #b5502f; }
.sc-name { font-family: var(--font-display); font-size: 20px; font-weight: 700; }
.sc-muscles { display: flex; flex-wrap: wrap; gap: 5px; }
.sc-chip { font-family: var(--font-mono); font-size: 11px; padding: 3px 9px; border-radius: 20px; background: var(--bg-secondary); color: var(--accent-strong); border: 1px solid var(--bg-accent); }
.sc-foot { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 2px; }
.prog-card .sc-count, .prog-card .sc-go { white-space: nowrap; }
.sc-count { font-size: 12px; color: var(--text-muted); }
.sc-go { font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--c); }

/* Semaine */
.week-card { padding: 14px 16px 16px; }
.week { display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; }
.week-day { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 8px 2px; border-radius: 12px; min-height: 72px; background: color-mix(in srgb, var(--c) 12%, var(--bg-secondary)); border: 1px solid color-mix(in srgb, var(--c) 30%, var(--bg-accent)); }
.week-day.rest { background: var(--bg-secondary); border-color: var(--bg-accent); }
.week-day.today { outline: 2px solid var(--accent-strong); outline-offset: 1px; }
.week-day.today::after { content: 'Auj.'; position: absolute; top: -8px; left: 50%; transform: translateX(-50%); font-family: var(--font-mono); font-size: 8px; font-weight: 700; background: var(--accent-strong); color: var(--bg-primary); padding: 1px 6px; border-radius: 20px; }
.week-dow { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; color: var(--text-muted); }
.week-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
.week-label { font-size: 10px; font-weight: 700; color: var(--text-primary); text-align: center; line-height: 1.1; }
.week-sprint { font-size: 11px; }
.week-rest { font-size: 10px; color: var(--text-muted); margin-top: 8px; }
.nav-row { display: flex; gap: 8px; flex-wrap: wrap; }
.nav-row .btn { flex: 1 1 30%; text-align: center; }

/* Séance */
.session-layout { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.session-main { display: flex; flex-direction: column; gap: 12px; }
.session-tools { display: flex; flex-direction: column; }
.tools-sticky { position: sticky; top: 74px; z-index: 8; display: flex; flex-direction: column; gap: 10px; padding: 4px 0; }
.timer-box { background: var(--bg-primary); border: 1px solid var(--bg-accent); border-radius: 16px; padding: 14px; }
.tool { display: flex; flex-direction: column; gap: 8px; }
.tool-toggle { align-self: flex-start; }
.exhead { width: 100%; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; background: none; border: none; text-align: left; color: inherit; }
.ex-name { font-family: var(--font-display); font-weight: 600; font-size: 16px; }
.set-counter { font-size: 14px; font-weight: 700; color: var(--text-muted); }
.set-counter.complete { color: #3f7a4f; }
.ex-body { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.hint-pill { border-radius: 10px; padding: 10px 12px; font-size: 13px; }
.hint-pill.progress { background: #e7f0e2; border: 1px solid #bcd8ae; color: #3f7a4f; }
.hint-pill.stall { background: #f6ece1; border: 1px solid #e6c3b0; color: #b5502f; font-weight: 600; }
.hint-pill.warmup { background: #f6ecd6; border: 1px solid #e6d3a8; color: #a97b1e; }
.hint-pill.bw { background: #eef1f5; border: 1px solid #cdd8e4; color: #4a6fa5; }
.hint-pill.db { background: #eef1f5; border: 1px solid #cdd8e4; color: #4a6fa5; }
.cues { display: flex; flex-direction: column; gap: 3px; }
.cue { display: flex; gap: 8px; font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.cue-arrow { color: var(--c, var(--accent-primary)); font-weight: 700; }
.sets { display: flex; flex-direction: column; gap: 8px; }
.setrow { display: flex; gap: 8px; align-items: center; }
.setrow-head { padding-bottom: 0; margin-bottom: -2px; }
.setrow-head .times { visibility: hidden; }
.col-head { width: 68px; text-align: center; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--text-muted); }
.setrow.done .set-label { color: #3f7a4f; }
.setrow.warm input { background: #f9f2e3; border-color: #e6d3a8; }
.set-label { flex-shrink: 0; min-width: 34px; padding: 6px 4px; background: none; border: 1px solid transparent; border-radius: 7px; color: var(--text-muted); font-size: 12px; font-weight: 700; cursor: pointer; transition: all 0.15s; }
.set-label:hover { border-color: var(--bg-accent); }
.set-label.warm { color: #a97b1e; background: #f6ecd6; border-color: #e6d3a8; }
.times { color: var(--text-muted); }
input[type='number'] { background: var(--bg-secondary); border: 1px solid var(--bg-accent); color: var(--text-primary); border-radius: 8px; padding: 9px 8px; width: 68px; font-size: 16px; text-align: center; -moz-appearance: textfield; appearance: textfield; }
input[type='number']:focus { outline: none; border-color: var(--accent-primary); }
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
.check { margin-left: auto; min-width: 48px; height: 40px; background: var(--bg-secondary); border: 1px solid var(--bg-accent); color: var(--text-muted); border-radius: 9px; font-size: 16px; cursor: pointer; transition: all 0.2s; }
.check.ok { background: #e7f0e2; border-color: #bcd8ae; color: #3f7a4f; }
.rm { width: 30px; height: 40px; background: none; border: none; color: var(--text-muted); font-size: 20px; cursor: pointer; border-radius: 8px; }
.rm:hover { color: #b5502f; }
/* Superset : une charge par mouvement */
.ss-set { display: flex; flex-direction: column; gap: 8px; background: var(--bg-secondary); border: 1px solid var(--bg-accent); border-radius: 12px; padding: 10px 12px; }
.ss-set.done { border-color: #bcd8ae; background: #f0f5ec; }
.ss-set-top { display: flex; align-items: center; gap: 8px; }
.ss-set-label { font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em; }
.ss-set-top .check { margin-left: auto; }
.ss-move { display: flex; align-items: center; gap: 8px; }
.ss-move-label { flex: 0 0 78px; font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--accent-strong); }
.ss-move input { flex: 1; min-width: 0; width: auto; }
.set-adds { display: flex; gap: 8px; flex-wrap: wrap; }
.add-set { align-self: flex-start; background: none; border: 1px dashed var(--accent-secondary); color: var(--accent-primary); border-radius: 9px; padding: 8px 14px; font-family: var(--font-body); font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.add-set:hover { background: var(--bg-secondary); border-style: solid; }
.add-set.warm { border-color: #e6d3a8; color: #a97b1e; }
.add-set.warm:hover { background: #f6ecd6; }
.last-perf { padding-top: 2px; }
.sprint-exercise { border-left: 4px solid #b5502f; }
.sprint-exercise .ex-name { color: #b5502f; }
.sprint-body { gap: 14px; padding-top: 4px; }
.chevron { font-size: 13px; color: var(--text-muted); }
.sprint-head { display: flex; flex-direction: column; gap: 5px; }
.sprint-goal { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.sprint-protocol { display: grid; grid-template-columns: repeat(auto-fit, minmax(116px, 1fr)); gap: 8px; }
.sp-stat { background: var(--bg-secondary); border: 1px solid var(--bg-accent); border-radius: 10px; padding: 9px 11px; }
.sp-val { font-weight: 700; font-size: 14px; color: var(--text-primary); }
.sp-lab { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-top: 3px; }
.sprint-block { display: flex; flex-direction: column; gap: 8px; }
.sprint-block-title { font-family: var(--font-mono); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #b5502f; font-weight: 700; }
.sprint-list { margin: 0; padding-left: 18px; display: flex; flex-direction: column; gap: 6px; }
.sprint-list li { font-size: 13px; color: var(--text-secondary); line-height: 1.5; }
.sprint-toggle { display: flex; gap: 6px; }
.sprint-toggle button { flex: 1; background: var(--bg-secondary); border: 1px solid var(--bg-accent); color: var(--text-secondary); border-radius: 9px; padding: 9px 8px; font-family: var(--font-body); font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.15s, color 0.15s, border-color 0.15s; }
.sprint-toggle button.active { background: #b5502f; border-color: #b5502f; color: #fff; }
.sprint-note { font-size: 12px; color: #a5451f; background: #f6ece1; border: 1px solid #e6c3b0; border-radius: 8px; padding: 9px 11px; line-height: 1.5; }
.sprint-cooldown { font-size: 13px; color: var(--text-secondary); background: var(--bg-secondary); border-radius: 10px; padding: 11px 12px; line-height: 1.5; }
/* Bouton info (i) + bulle de détails */
.sprint-info-btn { align-self: flex-start; display: inline-flex; align-items: center; gap: 8px; background: none; border: none; cursor: pointer; font-family: var(--font-mono); font-size: 12px; color: var(--accent-primary); padding: 2px 0; }
.sprint-info-btn .i-mark { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--accent-primary); font-style: italic; font-weight: 700; font-size: 11px; }
.sprint-info-btn.open .i-mark { background: var(--accent-primary); color: var(--bg-primary); }
.sprint-info { display: flex; flex-direction: column; gap: 12px; background: var(--bg-secondary); border: 1px solid var(--bg-accent); border-radius: 12px; padding: 12px; }
/* Saisie des efforts de course */
.sprint-log { display: flex; flex-direction: column; gap: 12px; border-top: 1px dashed var(--bg-accent); padding-top: 12px; }
/* Ligne d'effort : puce + suppression sur la 1re ligne, champs sur la 2e (mobile-friendly) */
.sprint-row { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; background: var(--bg-secondary); border: 1px solid var(--bg-accent); border-radius: 12px; padding: 10px; }
.kind-chip { flex-shrink: 0; min-width: 82px; border: 1px solid var(--bg-accent); border-radius: 8px; padding: 7px 12px; font-family: var(--font-mono); font-size: 12px; font-weight: 700; cursor: pointer; background: var(--bg-primary); color: var(--text-secondary); }
.kind-chip.echauffement { border-color: #e6d3a8; color: #a97b1e; background: #f6ecd6; }
.kind-chip.sprint { border-color: #e3c4b8; color: #b5502f; background: #f6ece1; }
.sprint-row .rm { margin-left: auto; }
.sr-fields { flex: 1 1 100%; min-width: 0; display: flex; align-items: center; gap: 8px; }
.sprint-row input { background: var(--bg-primary); border: 1px solid var(--bg-accent); color: var(--text-primary); border-radius: 8px; padding: 10px 8px; font-size: 15px; text-align: center; min-width: 0; }
.sr-count { width: 56px; flex-shrink: 0; }
.sr-dur { flex: 1; }
.sr-int { flex: 1.4; }
.sprint-add { display: flex; gap: 8px; flex-wrap: wrap; }
.sprint-hint { line-height: 1.5; }
/* Chrono de repos flottant */
.floating-timer {
  position: fixed; top: 10px; left: 50%; transform: translateX(-50%); z-index: 60;
  display: flex; align-items: center; gap: 10px;
  background: color-mix(in srgb, var(--accent-primary) 96%, black); color: var(--bg-primary);
  border-radius: 999px; padding: 8px 10px 8px 16px; box-shadow: 0 10px 26px rgba(0,0,0,0.22);
}
.ft-time { font-size: 18px; font-weight: 800; letter-spacing: 0.02em; }
.ft-label { font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; opacity: 0.85; }
.ft-btn { background: rgba(255,255,255,0.16); border: none; color: var(--bg-primary); border-radius: 999px; padding: 6px 12px; font-family: var(--font-mono); font-size: 12px; font-weight: 700; cursor: pointer; }
.ft-btn.stop { background: rgba(255,255,255,0.92); color: #b5502f; }
.ft-drop-enter-active, .ft-drop-leave-active { transition: transform 0.25s var(--ease-out), opacity 0.25s; }
.ft-drop-enter-from, .ft-drop-leave-to { transform: translate(-50%, -18px); opacity: 0; }
.finish { padding: 14px; font-size: 15px; }

/* Progression — cartes par séance */
.prog-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.prog-card { padding: 13px 14px; gap: 8px; transition: transform 0.18s var(--ease-bounce), box-shadow 0.2s, border-color 0.2s, background 0.2s; }
.prog-card:not(.active) { opacity: 0.72; }
.prog-card:hover { opacity: 1; }
.prog-card.active {
  border-color: var(--c);
  background: color-mix(in srgb, var(--c) 10%, var(--bg-primary));
  box-shadow: 0 14px 30px rgba(139, 111, 92, 0.22);
  transform: translateY(-3px);
}
.prog-card.active .sc-name { color: var(--c); }
.prog-card.active .sc-day { color: var(--accent-strong); }
.prog-card .sc-name { font-size: 17px; }
.prog-ex-list { display: grid; grid-template-columns: 1fr; gap: 12px; }
.prog-ex { display: flex; flex-direction: column; gap: 10px; }
.prog-ex-head { display: flex; flex-direction: column; gap: 6px; }
.prog-ex-name { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
.prog-ex-kpis { display: flex; flex-wrap: wrap; gap: 4px 16px; font-size: 12px; color: var(--text-muted); }
.pk b { color: var(--text-primary); font-size: 14px; font-family: var(--font-mono); }
.pk.pos b { color: #3f7a4f; }
.prog-empty { padding: 6px 0 2px; }

/* Journal */
.history-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
.hist-name { font-family: var(--font-display); font-weight: 700; font-size: 16px; }
.hist-when { font-size: 12px; color: var(--text-muted); }
.history-entry { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 13px; }
.history-ex { color: var(--text-secondary); }
.trend-down { color: #3f7a4f; font-weight: 700; }
.trend-up { color: #a97b1e; font-weight: 700; }

/* Rapport */
.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat { background: var(--bg-secondary); border: 1px solid var(--bg-accent); border-radius: 12px; padding: 12px; }
.stat-v { font-family: var(--font-display); font-size: 24px; font-weight: 800; color: var(--text-primary); }
.stat-v.pos { color: #3f7a4f; } .stat-v.warn { color: #a97b1e; }
.stat-u { font-size: 12px; font-family: var(--font-mono); color: var(--text-muted); margin-left: 3px; }
.stat-l { font-family: var(--font-mono); font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-muted); margin-top: 4px; }
.mv-list { display: flex; flex-direction: column; gap: 8px; }
.mv-row { display: grid; grid-template-columns: 74px 1fr 34px; align-items: center; gap: 10px; }
.mv-label { font-size: 13px; color: var(--text-secondary); }
.mv-bar { height: 8px; background: var(--bg-secondary); border-radius: 20px; overflow: hidden; }
.mv-fill { height: 100%; background: var(--accent-primary); border-radius: 20px; }
.mv-count { font-size: 12px; color: var(--text-muted); text-align: right; }
.rec-list { display: flex; flex-direction: column; }
.rec-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid var(--bg-secondary); font-size: 14px; }
.rec-row:last-child { border-bottom: none; }
.rec-name { color: var(--text-secondary); }
.rec-val { color: var(--text-primary); font-weight: 700; }

/* Profil */
.form-grid { display: flex; flex-direction: column; gap: 12px; }
.field { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--text-secondary); }
.field input { width: 100% !important; text-align: left; }
.sex-row { display: flex; gap: 8px; }
.sex-row .btn { flex: 1; }
.profil-summary { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--bg-secondary); }
.ps-item { font-size: 13px; color: var(--text-secondary); }
.ps-item b { color: var(--text-primary); }
.bmi-inline { font-size: 12px; font-weight: 700; }
.chart-wrap { margin-top: 12px; }

/* Tablette */
@media (min-width: 680px) {
  .sport-app { max-width: 760px; }
  .bottomnav { max-width: 760px; }
  .tn-label { font-size: 11px; }
  .today-name { font-size: 34px; }
  .session-grid { grid-template-columns: repeat(2, 1fr); }
  .stat-grid { grid-template-columns: repeat(4, 1fr); }
  .prog-grid { grid-template-columns: repeat(4, 1fr); }
  .prog-ex-list { grid-template-columns: 1fr 1fr; }
}

/* Desktop : navigation en haut, on masque la barre du bas */
@media (min-width: 1080px) {
  .sport-app { max-width: 1080px; }
  .sport-app.has-bottomnav { padding-bottom: 40px; }
  .bottomnav { display: none; }
  .topnav { display: flex; gap: 6px; max-width: 620px; }
  .topnav-tab { flex-direction: row; gap: 6px; padding: 8px 14px; }
  .session-grid { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
  .history-grid { grid-template-columns: 1fr 1fr; align-items: start; }
  .session-layout { display: grid; grid-template-columns: 1fr 320px; align-items: start; gap: 20px; }
  .session-tools { order: 2; }
  .session-main { order: 1; }
  .tools-sticky { top: 90px; }
  .tool-toggle { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .session-card, .btn, .btn-primary { transition: none; }
  .session-card:hover { transform: none; }
}
</style>
