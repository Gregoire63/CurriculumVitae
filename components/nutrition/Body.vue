<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useWithings } from '~/composables/useWithings'
import { useNutrition } from '~/composables/useNutrition'
import { useWorkout } from '~/composables/useWorkout'
import { IMPEDANCE_CAVEAT, dailySeries, weeklySlope } from '~/lib/withings'
import { STEPS_ONSITE, STEPS_TT, defaultSteps } from '~/lib/nutritionStats'
import { isoOf } from '~/utils/sportStats'

// Onglet « Corps » : ce que la balance mesure, et ce qu'on en déduit.
// Le poids brut ne sert à rien au jour le jour ; ce qui compte est la moyenne
// glissante, sa pente, et la répartition gras / muscle de ce qui a été perdu.

const {
  hydrate, connected, connect, disconnect, entries, activity, latest,
  syncing, syncError, lastSync, sync, addManual, removeEntry, confirmEntry,
  weightSeries, slope, comp, stepsFor, suspects, suspectAts,
} = useWithings()
const { setSteps, dayFor } = useNutrition()
const { addBodyWeight } = useWorkout()

// Erreur remontée par le retour d'OAuth (state invalide, refus, code expiré).
const props = defineProps<{ connectError?: string | null }>()

const today = isoOf(new Date())
const manualKg = ref<number | null>(null)
const manualDate = ref(today)

onMounted(async () => {
  hydrate()
  // Synchro à l'ouverture, au plus une fois par heure : une pesée par jour, ça suffit.
  if (connected.value && Date.now() / 1000 - lastSync.value > 3600) await runSync()
})

async function runSync(full = false) {
  const ok = await sync({ full })
  if (ok) pushToJournal()
}

/**
 * Reverse les données là où le reste de l'appli les attend : le poids dans le
 * journal des séances (il sert au calcul du métabolisme de base), les pas dans
 * la nutrition (ils entrent dans la dépense du jour).
 */
function pushToJournal() {
  for (const a of activity.value) {
    if (a.steps <= 0) continue
    // Le compteur du jour est PARTIEL : à 9 h il affiche 800 pas, et l'écrire tel
    // quel ferait tomber la cible sous l'estimation — l'appli conseillerait de
    // moins manger au petit-déjeuner parce qu'on n'a pas encore marché. Pour la
    // journée en cours, on ne révise donc que vers le haut, quand le réel dépasse
    // l'estimation. Les jours passés, eux, sont complets et s'écrivent tels quels.
    if (a.date === today && a.steps <= defaultSteps(dayFor(today).tt)) continue
    setSteps(a.date, a.steps)
  }
  if (latest.value && latest.value.date === today) addBodyWeight(latest.value.kg)
}

function submitManual() {
  if (!manualKg.value || manualKg.value <= 0) return
  addManual(manualKg.value, manualDate.value)
  if (manualDate.value === today) addBodyWeight(manualKg.value)
  manualKg.value = null
}

const series = computed(() => weightSeries.value)

// Objectif de rythme : entre 0,4 et 0,8 kg/semaine. En dessous, le déficit ne
// mord pas ; au-dessus, la masse maigre part avec.
const paceVerdict = computed(() => {
  const s = slope.value
  if (s === null) return null
  if (s > 0.1) return { tone: 'bad', text: 'Le poids monte. Si ce n\'est pas volontaire, resserre de 150 kcal par jour avant de toucher aux séances.' }
  if (s > -0.2) return { tone: 'warn', text: 'Quasi stable : le déficit réel est plus petit que celui affiché. Vérifie les extras notés et les week-ends.' }
  if (s >= -0.9) return { tone: 'good', text: 'Rythme dans la bonne fenêtre : assez rapide pour avancer, assez lent pour garder le muscle.' }
  return { tone: 'warn', text: 'Perte rapide. Tenable quelques semaines, mais au-delà la masse maigre paie — remonte de 150 à 200 kcal.' }
})

// Séries secondaires : on n'affiche que ce que la balance a vraiment mesuré.
const METRICS = [
  { key: 'fatRatio' as const, label: 'Masse grasse', unit: '%', good: 'down' },
  { key: 'fatMass' as const, label: 'Gras', unit: ' kg', good: 'down' },
  { key: 'muscleMass' as const, label: 'Muscle', unit: ' kg', good: 'up' },
  { key: 'waterMass' as const, label: 'Eau', unit: ' kg', good: 'flat' },
  { key: 'boneMass' as const, label: 'Os', unit: ' kg', good: 'flat' },
  { key: 'heartRate' as const, label: 'FC au repos', unit: ' bpm', good: 'down' },
]

const metrics = computed(() => METRICS.map((m) => {
  const pts = dailySeries(entries.value, m.key)
  if (!pts.length) return null
  const last = pts.at(-1)!
  const first = pts[Math.max(0, pts.length - 28)]
  const delta = Math.round((last.value - first.value) * 100) / 100
  const sl = weeklySlope(pts)
  let tone = 'flat'
  if (Math.abs(delta) >= 0.15) {
    const dir = delta < 0 ? 'down' : 'up'
    tone = m.good === 'flat' ? 'flat' : (dir === m.good ? 'good' : 'bad')
  }
  return { ...m, value: last.value, delta, slope: sl, tone, n: pts.length }
}).filter(Boolean) as { key: string, label: string, unit: string, value: number, delta: number, slope: number | null, tone: string, n: number }[])

// ─── Courbe : valeur brute en points, moyenne glissante en trait ──────────
const W = 440
const H = 190
const PAD = 26
const chart = computed(() => {
  const d = series.value.slice(-90)
  if (d.length < 2) return null
  const vals = d.flatMap(p => [p.value, p.avg!])
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max - min || 1
  const x = (i: number) => PAD + (i * (W - 2 * PAD)) / (d.length - 1)
  const y = (v: number) => H - PAD - ((v - min) * (H - 2 * PAD)) / span
  return {
    dots: d.map((p, i) => ({ cx: x(i), cy: y(p.value), key: p.date })),
    line: d.map((p, i) => `${x(i)},${y(p.avg!)}`).join(' '),
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    first: d[0].date.slice(5),
    last: d.at(-1)!.date.slice(5),
  }
})

const stepsToday = computed(() => stepsFor(today))
// Estimation par défaut du planning, pour montrer l'écart avec la réalité mesurée.
const plannedSteps = computed(() => (dayFor(today).tt ? STEPS_TT : STEPS_ONSITE))

const fmt = (n: number, d = 1) => (n > 0 ? '+' : '') + n.toFixed(d)
</script>

<template>
  <div class="stack">
    <!-- Connexion -->
    <section v-if="!connected" class="card nu-wi-connect">
      <h3 class="nu-mode">Balance Withings</h3>
      <p class="nu-note">
        Connecte le compte Withings une fois : l'appli récupère ensuite chaque pesée
        toute seule — poids, masse grasse, muscle, eau, os. Les pas suivent si l'appli
        Withings est reliée à Samsung Health (Profil → Apps). Rien n'est envoyé
        ailleurs : les jetons restent sur ce téléphone.
      </p>
      <button class="btn primary" @click="connect()">Connecter Withings</button>
    </section>

    <section v-else class="card nu-wi-bar">
      <div>
        <div class="mono nu-wi-state">Compte connecté</div>
        <div class="nu-wi-sub">
          {{ entries.length }} pesée(s) · dernière synchro
          {{ lastSync ? new Date(lastSync * 1000).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'jamais' }}
        </div>
      </div>
      <div class="nu-wi-actions">
        <button class="btn" :disabled="syncing" @click="runSync(false)">
          {{ syncing ? 'Synchro…' : 'Synchroniser' }}
        </button>
        <button class="btn ghost" :disabled="syncing" @click="runSync(true)">Tout reprendre</button>
        <button class="btn ghost" @click="disconnect()">Déconnecter</button>
      </div>
    </section>

    <p v-if="props.connectError" class="nu-note nu-wi-err">
      La connexion Withings a échoué ({{ props.connectError }}). Réessaie : le code d'autorisation
      n'est valable que quelques secondes.
    </p>
    <p v-if="syncError" class="nu-note nu-wi-err">{{ syncError }}</p>

    <!-- Balance partagée : elle reconnaît l'utilisateur au poids et peut se tromper
         entre deux personnes proches. On ne supprime rien, on met de côté et on
         demande — écarter en silence une vraie pesée serait pire que le problème. -->
    <section v-if="suspects.length" class="card nu-wi-quar">
      <h3 class="nu-mode">{{ suspects.length }} pesée(s) mise(s) de côté</h3>
      <p class="nu-note">
        Trop loin de ta tendance pour être toi. Sur une balance partagée, c'est
        généralement quelqu'un d'autre que l'appareil t'a attribué. Ces mesures ne
        comptent ni dans la courbe ni dans la cible calorique tant que tu n'as pas tranché.
      </p>
      <div class="nu-wi-list">
        <div v-for="e in suspects" :key="e.at" class="nu-wi-item">
          <span class="mono">{{ e.at.replace('T', ' ') }}</span>
          <b>{{ e.kg.toFixed(1) }} kg</b>
          <button class="btn" @click="confirmEntry(e.at)">C'est moi</button>
          <button class="btn ghost danger" @click="removeEntry(e.at)">Supprimer</button>
        </div>
      </div>
    </section>

    <!-- Chiffres du jour -->
    <section v-if="latest" class="card nu-wi-head">
      <div class="nu-wi-kg">
        <span class="nu-wi-num">{{ latest.kg.toFixed(1) }}</span><small>kg</small>
      </div>
      <div class="nu-wi-meta">
        <div class="mono">{{ latest.at.replace('T', ' à ') }}</div>
        <div v-if="slope !== null" class="nu-wi-slope" :class="paceVerdict?.tone">
          {{ fmt(slope, 2) }} kg / semaine
        </div>
        <div v-else class="nu-wi-sub">Encore quelques pesées avant de pouvoir donner une tendance.</div>
      </div>
    </section>

    <p v-if="paceVerdict" class="nu-note" :class="`nu-tone-${paceVerdict.tone}`">{{ paceVerdict.text }}</p>

    <!-- Courbe -->
    <section v-if="chart" class="card">
      <h3 class="nu-mode">Poids — 90 jours</h3>
      <svg :viewBox="`0 0 ${W} ${H}`" class="nu-wi-chart">
        <polyline :points="chart.line" fill="none" stroke="var(--accent-primary)" stroke-width="2.5" stroke-linejoin="round" />
        <circle v-for="p in chart.dots" :key="p.key" :cx="p.cx" :cy="p.cy" r="2" fill="var(--text-muted)" opacity="0.55" />
        <text :x="4" :y="PAD - 8" class="nu-wi-ax">{{ chart.max }}</text>
        <text :x="4" :y="H - PAD + 14" class="nu-wi-ax">{{ chart.min }}</text>
        <text :x="PAD" :y="H - 4" class="nu-wi-ax">{{ chart.first }}</text>
        <text :x="W - PAD" :y="H - 4" class="nu-wi-ax" text-anchor="end">{{ chart.last }}</text>
      </svg>
      <p class="nu-wi-legend mono">Trait = moyenne 7 jours · points = pesées brutes</p>
    </section>

    <!-- Répartition de la perte -->
    <section class="card nu-wi-comp" :class="comp.quality">
      <h3 class="nu-mode">D'où vient la perte ?</h3>
      <div v-if="comp.fatShare !== null" class="nu-wi-split">
        <div class="nu-wi-bar-track">
          <div class="nu-wi-bar-fat" :style="{ width: `${Math.round(comp.fatShare * 100)}%` }" />
        </div>
        <div class="nu-wi-split-legend">
          <span><b>{{ Math.round(comp.fatShare * 100) }} %</b> gras</span>
          <span>{{ 100 - Math.round(comp.fatShare * 100) }} % masse maigre</span>
        </div>
      </div>
      <div class="nu-wi-deltas">
        <div><span class="mono">Poids</span><b>{{ fmt(comp.kg, 2) }} kg</b></div>
        <div v-if="comp.fat !== null"><span class="mono">Gras</span><b>{{ fmt(comp.fat, 2) }} kg</b></div>
        <div v-if="comp.lean !== null"><span class="mono">Maigre</span><b>{{ fmt(comp.lean, 2) }} kg</b></div>
        <div><span class="mono">Sur</span><b>{{ comp.days }} j</b></div>
      </div>
      <p class="nu-note">{{ comp.advice }}</p>
    </section>

    <!-- Toutes les autres mesures -->
    <section v-if="metrics.length" class="card">
      <h3 class="nu-mode">Ce que la balance mesure</h3>
      <div class="nu-wi-metrics">
        <div v-for="m in metrics" :key="m.key" class="nu-wi-metric" :class="m.tone">
          <span class="nu-wi-metric-l mono">{{ m.label }}</span>
          <span class="nu-wi-metric-v">{{ m.value }}{{ m.unit }}</span>
          <span class="nu-wi-metric-d">{{ fmt(m.delta, 2) }} sur 28 j</span>
        </div>
      </div>
      <p class="nu-note">{{ IMPEDANCE_CAVEAT }}</p>
    </section>

    <!-- Pas -->
    <section v-if="activity.length" class="card">
      <h3 class="nu-mode">Pas</h3>
      <p class="nu-note">
        <template v-if="stepsToday !== null">
          {{ stepsToday.toLocaleString('fr-FR') }} pas aujourd'hui, au-dessus des
          {{ plannedSteps.toLocaleString('fr-FR') }} estimés : la cible du jour a été relevée
          en conséquence.
        </template>
        <template v-else>
          Le compteur du jour est encore sous l'estimation de {{ plannedSteps.toLocaleString('fr-FR') }} pas,
          donc la cible ne bouge pas. Elle ne sera relevée que si tu dépasses cette estimation —
          un compteur partiel ne doit pas faire baisser ce que tu manges le matin.
        </template>
      </p>
      <div class="nu-wi-steps">
        <div v-for="a in activity.slice(-14)" :key="a.date" class="nu-wi-step">
          <span class="mono">{{ a.date.slice(5) }}</span>
          <span class="nu-wi-step-bar" :style="{ width: `${Math.min(100, a.steps / 120)}%` }" />
          <b>{{ a.steps.toLocaleString('fr-FR') }}</b>
        </div>
      </div>
    </section>

    <!-- Saisie manuelle -->
    <section class="card nu-wi-manual">
      <h3 class="nu-mode">Ajouter une pesée à la main</h3>
      <p class="nu-note">Pour les jours sans balance, ou en attendant de la recevoir.</p>
      <div class="nu-wi-form">
        <input v-model="manualDate" type="date" class="input" :max="today">
        <input v-model.number="manualKg" type="number" step="0.1" min="30" max="250" placeholder="kg" class="input">
        <button class="btn primary" :disabled="!manualKg" @click="submitManual">Ajouter</button>
      </div>
      <div v-if="entries.length" class="nu-wi-list">
        <div v-for="e in entries.slice(-8).reverse()" :key="e.at" class="nu-wi-item" :class="{ quar: suspectAts.has(e.at) }">
          <span class="mono">{{ e.at.replace('T', ' ') }}</span>
          <b>{{ e.kg.toFixed(1) }} kg</b>
          <span class="nu-wi-src">{{ suspectAts.has(e.at) ? 'écartée' : e.source === 'withings' ? 'balance' : 'saisie' }}</span>
          <button class="nu-wi-del" title="Supprimer" @click="removeEntry(e.at)">×</button>
        </div>
      </div>
    </section>
  </div>
</template>
