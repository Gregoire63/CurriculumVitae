<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { PROGRAM, ALL_EXERCISES } from '~/data/sportProgram'
import type { Session } from '~/data/sportProgram'
import { useWorkout } from '~/composables/useWorkout'

// PWA : manifest + SW scopés sur /sport uniquement — n'affecte pas le reste du site
useHead({
  title: 'Suivi Séances — On Air',
  meta: [
    { name: 'theme-color', content: '#0F1219' },
    { name: 'apple-mobile-web-app-capable', content: 'yes' },
    { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
    { name: 'apple-mobile-web-app-title', content: 'Séances' },
    { name: 'robots', content: 'noindex' },
  ],
  link: [
    { rel: 'manifest', href: '/sport/manifest.webmanifest' },
    { rel: 'apple-touch-icon', href: '/sport/icon-192.png' },
  ],
})

onMounted(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sport-sw.js', { scope: '/sport' }).catch(() => {})
  }
})

const {
  lastPerf, recordSession, progressionHint, chartData, history,
  bodyWeight, addBodyWeight, exportJSON, importJSON,
} = useWorkout()

// ─────────── État UI ───────────
type View = 'home' | 'session' | 'progress' | 'history' | 'poids'
const view = ref<View>('home')
const activeSession = ref<Session | null>(null)
const openEx = ref<string | null>(null)
const progressEx = ref(ALL_EXERCISES[0].id)
const flash = ref('')
const draft = reactive<Record<string, { w: string; r: string; done: boolean }[]>>({})
const sessionStart = ref(0)
const bwInput = ref('')

const titles: Record<View, string> = {
  home: 'Mes séances', session: '', progress: 'Progression',
  history: 'Historique', poids: 'Poids de corps',
}
const pageTitle = computed(() =>
  view.value === 'session' && activeSession.value ? activeSession.value.name : titles[view.value])

function showFlash(msg: string) {
  flash.value = msg
  setTimeout(() => { flash.value = '' }, 3000)
}

// ─────────── Séance ───────────
function startSession(s: Session) {
  activeSession.value = s
  for (const k of Object.keys(draft)) delete draft[k]
  for (const e of s.exercises) {
    const last = lastPerf(e.id)
    draft[e.id] = Array.from({ length: e.sets }, (_, i) => ({
      w: last?.sets[i] ? String(last.sets[i].w) : '',
      r: '',
      done: false,
    }))
  }
  openEx.value = s.exercises[0].id
  sessionStart.value = Date.now()
  view.value = 'session'
}

function doneCount(exId: string) {
  return (draft[exId] || []).filter(s => s.done).length
}

function finishSession() {
  if (!activeSession.value) return
  const durationMin = Math.round((Date.now() - sessionStart.value) / 60000)
  const entries = activeSession.value.exercises.map(e => ({
    exId: e.id,
    sets: (draft[e.id] || [])
      .filter(s => s.done && s.w !== '' && s.r !== '')
      .map(s => ({ w: parseFloat(s.w), r: parseInt(s.r, 10) })),
  }))
  const prs = recordSession(entries, durationMin)
  view.value = 'home'
  showFlash(prs.length
    ? `Séance enregistrée (${durationMin} min) — 🏆 PR : ${prs.join(', ')}`
    : `Séance enregistrée ✓ (${durationMin} min)`)
}

function lastLabel(exId: string) {
  const last = lastPerf(exId)
  if (!last) return null
  return `Dernière (${last.date}) : ${last.sets.map(s => `${s.w}×${s.r}`).join(' · ')}`
}

// ─────────── Progression ───────────
const progressData = computed(() => chartData(progressEx.value))
const progressGain = computed(() => {
  const d = progressData.value
  return d.length ? d[d.length - 1].charge - d[0].charge : 0
})

// ─────────── Historique / Poids ───────────
const exName = (id: string) => ALL_EXERCISES.find(e => e.id === id)?.name ?? id
const bwData = computed(() => bodyWeight.value.map(e => ({ date: e.date.slice(5), kg: e.kg })))

function saveBW() {
  const kg = parseFloat(bwInput.value)
  if (!kg || kg < 30 || kg > 250) return
  addBodyWeight(kg)
  bwInput.value = ''
  showFlash('Poids enregistré ✓')
}

async function onImport(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (!file) return
  try { await importJSON(file); showFlash('Données importées ✓') }
  catch { showFlash('Fichier invalide') }
}
</script>

<template>
  <div class="sport-app">
    <header class="sport-header">
      <div>
        <div class="eyebrow">On Air · Recomp</div>
        <h1>{{ pageTitle }}</h1>
      </div>
      <button v-if="view !== 'home'" class="btn" @click="view = 'home'">← Retour</button>
    </header>

    <div v-if="flash" class="flash">{{ flash }}</div>

    <!-- ═══════════ ACCUEIL ═══════════ -->
    <div v-if="view === 'home'" class="stack">
      <div v-for="s in PROGRAM" :key="s.id" class="card" :style="{ borderLeft: `3px solid ${s.color}` }">
        <div class="row-between">
          <div>
            <div class="session-name">{{ s.name }}</div>
            <div class="muted mt-2">{{ s.tag }} · {{ s.exercises.length }} exercices{{ s.sprint ? ' · sprint' : '' }}</div>
          </div>
          <button class="btn-primary" :style="{ background: s.color }" @click="startSession(s)">Démarrer</button>
        </div>
      </div>

      <div class="nav-row">
        <button class="btn flex-1" @click="view = 'progress'">Progression</button>
        <button class="btn flex-1" @click="view = 'history'">Historique</button>
        <button class="btn flex-1" @click="view = 'poids'">Poids</button>
      </div>

      <div class="card hint">
        <b>Règle de progression :</b> haut de la fourchette de reps atteint sur toutes les séries → monte la charge (+2,5 kg haut du corps, +5 kg jambes). Semaine à 3 séances : Pec·Bras A, Dos·Épaules + sprint, Jambes.
      </div>

      <div class="nav-row">
        <button class="btn flex-1" @click="exportJSON()">Exporter mes données</button>
        <label class="btn flex-1 center">
          Importer
          <input type="file" accept=".json" class="hidden-input" @change="onImport">
        </label>
      </div>
    </div>

    <!-- ═══════════ SÉANCE ═══════════ -->
    <div v-if="view === 'session' && activeSession" class="stack">
      <div class="timer-row"><SportRestTimer /></div>

      <div v-for="(e, idx) in activeSession.exercises" :key="e.id" class="card no-pad">
        <div class="exhead" @click="openEx = openEx === e.id ? null : e.id">
          <div>
            <div class="ex-name">{{ idx + 1 }}. {{ e.name }}</div>
            <div class="muted mt-2">
              {{ e.sets }} × {{ e.reps }}<template v-if="lastPerf(e.id)"> · dernière : {{ Math.max(...lastPerf(e.id)!.sets.map(s => s.w)) }} kg</template>
            </div>
          </div>
          <div class="mono set-counter" :class="{ complete: doneCount(e.id) === e.sets }">
            {{ doneCount(e.id) }}/{{ e.sets }}
          </div>
        </div>

        <div v-if="openEx === e.id" class="ex-body">
          <SportMuscleMap :muscles="e.muscles" />

          <div v-if="progressionHint(e)" class="progress-hint">📈 {{ progressionHint(e) }}</div>

          <div>
            <div v-for="(c, i) in e.cues" :key="i" class="cue">
              <span :style="{ color: activeSession.color }">›</span>{{ c }}
            </div>
            <div class="muted italic mt-6">{{ e.machine }}</div>
          </div>

          <div v-for="(s, i) in draft[e.id]" :key="i" class="setrow">
            <span class="mono muted set-label">S{{ i + 1 }}</span>
            <input v-model="s.w" type="number" inputmode="decimal" placeholder="kg">
            <span class="muted">×</span>
            <input v-model="s.r" type="number" inputmode="numeric" placeholder="reps">
            <button class="btn check" :class="{ 'btn-done': s.done }" @click="s.done = !s.done">
              {{ s.done ? '✓' : '○' }}
            </button>
          </div>

          <div v-if="lastLabel(e.id)" class="muted">{{ lastLabel(e.id) }}</div>
        </div>
      </div>

      <div v-if="activeSession.sprint" class="card sprint-card">
        <div class="sprint-title">⚡ {{ activeSession.sprint.title }}</div>
        <div class="sprint-detail">{{ activeSession.sprint.detail }}</div>
      </div>

      <button class="btn-primary finish" @click="finishSession">Terminer et enregistrer la séance</button>
    </div>

    <!-- ═══════════ PROGRESSION ═══════════ -->
    <div v-if="view === 'progress'" class="stack">
      <select v-model="progressEx">
        <optgroup v-for="s in PROGRAM" :key="s.id" :label="s.name">
          <option v-for="e in s.exercises" :key="e.id" :value="e.id">{{ e.name }}</option>
        </optgroup>
      </select>

      <div v-if="!progressData.length" class="card empty">
        Aucune donnée pour cet exercice.<br>Enregistre une séance pour voir ta courbe.
      </div>
      <template v-else>
        <div class="kpi-row">
          <div class="card kpi-card">
            <div class="kpi mono">{{ progressData[progressData.length - 1].charge }} kg</div>
            <div class="eyebrow">Charge max</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi mono" :class="{ positive: progressGain > 0 }">
              {{ progressGain > 0 ? '+' : '' }}{{ progressGain }} kg
            </div>
            <div class="eyebrow">Depuis le début</div>
          </div>
          <div class="card kpi-card">
            <div class="kpi mono">{{ progressData[progressData.length - 1].e1rm }} kg</div>
            <div class="eyebrow">1RM estimé</div>
          </div>
        </div>
        <div class="card">
          <div class="muted mb-8">Charge max par séance (kg)</div>
          <SportSvgChart :data="progressData" y-key="charge" color="#3D6BFF" :height="180" />
        </div>
        <div class="card">
          <div class="muted mb-8">Volume total par séance (kg × reps)</div>
          <SportSvgChart :data="progressData" y-key="volume" color="#00C9A7" :height="150" />
        </div>
      </template>
    </div>

    <!-- ═══════════ HISTORIQUE ═══════════ -->
    <div v-if="view === 'history'" class="stack">
      <div v-if="!history().length" class="card empty">Aucune séance enregistrée pour l'instant.</div>
      <div v-for="day in history()" :key="day.date" class="card">
        <div class="history-date mono">{{ day.date }}</div>
        <div v-for="entry in day.entries" :key="entry.exId" class="history-entry">
          <span class="history-ex">{{ exName(entry.exId) }}</span>
          <span class="mono muted">{{ entry.sets.map(s => `${s.w}×${s.r}`).join(' · ') }}</span>
        </div>
      </div>
    </div>

    <!-- ═══════════ POIDS DE CORPS ═══════════ -->
    <div v-if="view === 'poids'" class="stack">
      <div class="card">
        <div class="muted mb-8">Pèse-toi 1-2×/semaine, le matin à jeun — c'est ton indicateur recomp avec le miroir.</div>
        <div class="setrow">
          <input v-model="bwInput" type="number" inputmode="decimal" placeholder="kg" step="0.1" class="bw-input">
          <button class="btn-primary" @click="saveBW">Enregistrer</button>
        </div>
      </div>
      <div v-if="bwData.length" class="card">
        <div class="muted mb-8">Évolution (kg)</div>
        <SportSvgChart :data="bwData" y-key="kg" color="#FFB020" :height="180" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sport-app {
  background: #0F1219; min-height: 100vh; color: #EDEFF3;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  padding-bottom: 50px; max-width: 520px; margin: 0 auto;
}
.mono { font-family: 'SF Mono', ui-monospace, Menlo, monospace; }
.sport-header { padding: 20px 16px 12px; display: flex; justify-content: space-between; align-items: center; }
.eyebrow { font-size: 11px; letter-spacing: 0.18em; color: #6B7484; text-transform: uppercase; }
h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.02em; margin: 0; }
.card { background: #1A1F2B; border: 1px solid #232A38; border-radius: 14px; padding: 16px; }
.card.no-pad { padding: 0; overflow: hidden; }
.btn {
  background: transparent; border: 1px solid #313A4C; color: #B9C0CC;
  border-radius: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer;
}
.btn:active { transform: scale(0.97); }
.btn-primary {
  background: #3D6BFF; border: none; color: #fff; border-radius: 10px;
  padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-done { border-color: #1F5C36; background: #12331F; color: #5DE58A; }
input[type='number'] {
  background: #141822; border: 1px solid #313A4C; color: #EDEFF3;
  border-radius: 8px; padding: 9px 8px; width: 66px; font-size: 16px; text-align: center;
  -moz-appearance: textfield; appearance: textfield;
}
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button { -webkit-appearance: none; }
.bw-input { width: 100px !important; }
select {
  background: #1A1F2B; border: 1px solid #313A4C; color: #EDEFF3;
  border-radius: 8px; padding: 12px; width: 100%; font-size: 15px;
}
.stack { padding: 0 16px; display: flex; flex-direction: column; gap: 12px; }
.muted { color: #6B7484; font-size: 12px; }
.italic { font-style: italic; }
.mt-2 { margin-top: 2px; } .mt-6 { margin-top: 6px; } .mb-8 { margin-bottom: 8px; }
.flex-1 { flex: 1; } .center { text-align: center; }
.hidden-input { display: none; }
.row-between { display: flex; justify-content: space-between; align-items: center; }
.nav-row { display: flex; gap: 8px; }
.nav-row .btn { padding: 12px; }
.session-name { font-weight: 800; font-size: 17px; }
.hint { font-size: 13px; color: #8B93A3; line-height: 1.6; }
.hint b { color: #EDEFF3; }
.flash {
  margin: 0 16px 12px; background: #12331F; border: 1px solid #1F5C36;
  color: #5DE58A; border-radius: 10px; padding: 10px 14px; font-size: 14px;
}
.timer-row { display: flex; justify-content: flex-end; }
.exhead { padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.ex-name { font-weight: 700; font-size: 15px; }
.set-counter { font-size: 13px; color: #6B7484; }
.set-counter.complete { color: #5DE58A; }
.ex-body { padding: 0 16px 16px; display: flex; flex-direction: column; gap: 12px; }
.progress-hint {
  background: #1F2A17; border: 1px solid #3D5C1F; color: #A8E55D;
  border-radius: 10px; padding: 10px 12px; font-size: 13px;
}
.cue { display: flex; gap: 8px; font-size: 13px; color: #B9C0CC; line-height: 1.6; }
.setrow { display: flex; gap: 8px; align-items: center; }
.set-label { width: 22px; }
.check { margin-left: auto; min-width: 46px; }
.sprint-card { border-left: 3px solid #FF4D3D; }
.sprint-title { font-weight: 800; font-size: 15px; color: #FF4D3D; }
.sprint-detail { font-size: 13px; color: #B9C0CC; margin-top: 6px; line-height: 1.6; }
.finish { padding: 14px; font-size: 15px; }
.kpi-row { display: flex; gap: 10px; }
.kpi-card { flex: 1; text-align: center; padding: 12px 8px; }
.kpi { font-size: 19px; font-weight: 800; }
.kpi.positive { color: #5DE58A; }
.empty { text-align: center; color: #6B7484; padding: 32px; font-size: 14px; }
.history-date { font-size: 13px; color: #3D6BFF; font-weight: 700; margin-bottom: 8px; }
.history-entry { display: flex; justify-content: space-between; gap: 10px; padding: 4px 0; font-size: 13px; }
.history-ex { color: #B9C0CC; }
</style>
