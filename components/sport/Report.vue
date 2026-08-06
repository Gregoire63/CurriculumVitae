<script setup lang="ts">
import { computed, ref } from 'vue'
import { ALL_EXERCISES } from '~/data/sportProgram'
import { useWorkout } from '~/composables/useWorkout'
import { useProfile } from '~/composables/useProfile'
import {
  avgSessionDuration, volumeOf, weeklyStatus, startOfWeek, FATIGUE_LABELS,
  WEEKLY_TARGET_MIN, WEEKLY_TARGET_MAX,
} from '~/utils/sportStats'

// Vue « Rapport » extraite de /sport (chargée à la demande). État partagé via composables.
const props = defineProps<{ todayIso: string | null; todayDow: number | null }>()
const emit = defineEmits<{ navigate: [view: string] }>()

const { logs, bodyWeight, sessionLog, recordsOf, bodyWeightAt, muscleSetsWithGaps, daysSinceExport, lastExportAt, fatigue } = useWorkout()
const { profile } = useProfile()

const RETIRED_NAMES: Record<string, string> = { 'ext-corde': 'Extension triceps corde', 'curl-incline': 'Curl incliné haltères', 'curl-ez': 'Curl barre EZ' }
const exName = (id: string) => ALL_EXERCISES.find(e => e.id === id)?.name ?? RETIRED_NAMES[id] ?? id
const fmtVol = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${Math.round(v)} kg`)
const fmtDate = (iso: string) => (iso ? iso.slice(8, 10) + '/' + iso.slice(5, 7) : '')

// Poids : lu seulement pour le métabolisme. L'affichage complet est dans <SportBody>.
const latestWeight = computed(() => (bodyWeight.value.length ? bodyWeight.value[bodyWeight.value.length - 1].kg : null))
const age = computed(() => { const y = profile.value.birthYear; return y && props.todayIso ? parseInt(props.todayIso.slice(0, 4), 10) - y : null })
const bmr = computed(() => {
  const w = latestWeight.value, h = profile.value.heightCm, a = age.value, s = profile.value.sex
  if (!w || !h || !a || !s) return null
  const base = 10 * w + 6.25 * h - 5 * a
  return Math.round(s === 'h' ? base + 5 : base - 161)
})
const maintenance = computed(() => (bmr.value ? Math.round(bmr.value * 1.55) : null))

const sessions = computed(() => sessionLog())
const totalSessions = computed(() => sessions.value.length)
const startOfWeekISO = computed(() => (props.todayIso && props.todayDow !== null ? startOfWeek(props.todayIso, props.todayDow) : null))
const sessionsThisWeek = computed(() => (startOfWeekISO.value ? sessions.value.filter(s => s.at.slice(0, 10) >= startOfWeekISO.value!).length : 0))
const avgDuration = computed(() => avgSessionDuration(sessions.value.map(s => s.durationMin)))
const volumeSince = (from: string | null) => {
  let v = 0
  for (const ss of Object.values(logs.value)) for (const s of ss) if (!from || s.date >= from) v += volumeOf(s.sets)
  return v
}
const totalVolume = computed(() => volumeSince(null))
const volumeThisWeek = computed(() => volumeSince(startOfWeekISO.value))

// ─── Volume par muscle ───────────────────────────────────────────────────────
// Par défaut la SEMAINE : c'est la seule fenêtre qui permet de repérer un trou.
// Le cumul « depuis toujours » ne bouge plus après quelques mois et n'alerte sur rien.
const muscleRange = ref<'week' | 'all'>('week')
const muscleFrom = computed(() => (muscleRange.value === 'week' ? startOfWeekISO.value : null))
const muscleVolume = computed(() => muscleSetsWithGaps(muscleFrom.value))
const muscleMax = computed(() => Math.max(WEEKLY_TARGET_MAX, ...muscleVolume.value.map(m => m[1])) || 1)
// Position de la zone cible (10–20 séries/semaine) sur la barre
const targetLo = computed(() => (WEEKLY_TARGET_MIN / muscleMax.value) * 100)
const targetHi = computed(() => (WEEKLY_TARGET_MAX / muscleMax.value) * 100)
const statusOf = (n: number) => weeklyStatus(n)
const weakSpots = computed(() => (muscleRange.value === 'week' ? muscleVolume.value.filter(m => m[1] < WEEKLY_TARGET_MIN).map(m => m[0]) : []))

// ─── Records ─────────────────────────────────────────────────────────────────
// Charge max, mais aussi 1RM estimé et meilleures reps à la charge record : à charge
// égale, faire plus de reps est une vraie progression.
const records = computed(() => ALL_EXERCISES.map((ex) => {
  const r = recordsOf(ex.id)
  if (!r || !r.charge) return null
  // Exos au poids du corps : la charge saisie inclut le poids de corps → on
  // affiche le LEST réellement ajouté, seul indicateur qui progresse vraiment.
  const bw = ex.bodyweight ? bodyWeightAt(r.chargeDate) : null
  const lest = bw !== null ? Math.round((r.charge - bw) * 10) / 10 : null
  return { id: ex.id, name: ex.name, ...r, lest }
}).filter((r): r is NonNullable<typeof r> => r !== null).sort((a, b) => b.charge - a.charge))

// ─── Fatigue & récupération ──────────────────────────────────────────────────
// La semaine en cours est PARTIELLE : elle est affichée à part et ne participe
// pas à la tendance, sinon on lirait une chute de volume tous les lundis.
const fat = computed(() => (props.todayIso && props.todayDow !== null ? fatigue(props.todayIso, props.todayDow) : null))
const fatWeeks = computed(() => {
  const f = fat.value
  if (!f) return []
  const shown = f.weeks.slice(-6)
  const max = Math.max(1, ...shown.map(w => w.volume), f.current.volume)
  return [
    ...shown.map(w => ({ label: fmtDate(w.start), volume: w.volume, pct: (w.volume / max) * 100, current: false })),
    { label: fmtDate(f.current.start), volume: f.current.volume, pct: (f.current.volume / max) * 100, current: true },
  ]
})
const FATIGUE_ICON: Record<string, string> = { unknown: '·', fresh: '🟢', building: '🟡', high: '🟠', deload: '🔴' }

// ─── Sauvegarde ──────────────────────────────────────────────────────────────
// Tout vit dans le navigateur : vider les données du site effacerait tout. On
// rappelle donc l'âge de la dernière sauvegarde.
const EXPORT_STALE_DAYS = 30
const exportAge = computed(() => (props.todayIso ? daysSinceExport(props.todayIso) : null))
const exportStale = computed(() => exportAge.value === null || exportAge.value > EXPORT_STALE_DAYS)
const hasData = computed(() => totalSessions.value > 0 || latestWeight.value !== null)
</script>

<template>
  <div class="stack">
    <div v-if="!hasData" class="card empty">Ton rapport se construit au fil des séances.<br>Renseigne ta taille dans <b>Profil</b>, pèse-toi, et enregistre une séance.</div>
    <template v-else>
      <!-- Suivi du corps : pesées, composition, pas. Le poids se saisit ICI et
           nulle part ailleurs — il servait aux séances comme à la nutrition, il
           avait fini par exister en trois exemplaires. -->
      <SportBody @navigate="emit('navigate', $event)" />

      <div class="card">
        <div class="section-label mb-8">Énergie</div>
        <div class="stat-grid">
          <div class="stat"><div class="stat-v mono">{{ bmr ?? '—' }}<span v-if="bmr" class="stat-u">kcal</span></div><div class="stat-l">Métabolisme de base</div></div>
          <div class="stat"><div class="stat-v mono">{{ maintenance ?? '—' }}<span v-if="maintenance" class="stat-u">kcal</span></div><div class="stat-l">Maintien estimé</div></div>
        </div>
        <div class="muted mt-6">
          Le maintien affiché ici est une moyenne large (Mifflin-St Jeor × 1,55). La cible
          du jour, elle, est recalculée dans le Journal à partir des pas réellement marchés
          et de la séance réellement enregistrée : c'est elle qui fait foi.
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
        <div class="row-between mb-8">
          <div class="section-label">Séries par muscle</div>
          <div class="mv-toggle">
            <button class="mv-tab" :class="{ active: muscleRange === 'week' }" @click="muscleRange = 'week'">Cette semaine</button>
            <button class="mv-tab" :class="{ active: muscleRange === 'all' }" @click="muscleRange = 'all'">Depuis le début</button>
          </div>
        </div>
        <div class="mv-list">
          <div v-for="[label, count] in muscleVolume" :key="label" class="mv-row">
            <span class="mv-label">{{ label }}</span>
            <div class="mv-bar">
              <!-- Zone cible 10–20 séries/semaine, en repère derrière la barre -->
              <div v-if="muscleRange === 'week'" class="mv-target" :style="{ left: targetLo + '%', width: (targetHi - targetLo) + '%' }"></div>
              <div class="mv-fill" :class="muscleRange === 'week' ? statusOf(count) : ''" :style="{ width: Math.min(100, count / muscleMax * 100) + '%' }"></div>
            </div>
            <span class="mv-count mono" :class="muscleRange === 'week' ? statusOf(count) : ''">{{ count }}</span>
          </div>
        </div>
        <div v-if="muscleRange === 'week'" class="muted mt-6">
          Cible <b>{{ WEEKLY_TARGET_MIN }}–{{ WEEKLY_TARGET_MAX }} séries/semaine</b> par muscle. Le muscle principal d'un exercice compte 1, les muscles assistants 0,5 — une série de développé couché n'est pas une série de triceps.
          <template v-if="weakSpots.length"><br>⚠️ Sous la cible cette semaine : <b>{{ weakSpots.join(', ') }}</b>.</template>
        </div>
        <div v-else class="muted mt-6">Cumul depuis le début — utile pour l'équilibre global, mais c'est la vue « cette semaine » qui révèle un manque.</div>
      </div>
      <div v-if="records.length" class="card">
        <div class="section-label mb-8">Records</div>
        <div class="rec-list">
          <div v-for="r in records" :key="r.id" class="rec-row rec-row-wide">
            <div class="rec-main">
              <span class="rec-name">{{ r.name }}</span>
              <span class="rec-when muted">{{ fmtDate(r.chargeDate) }}</span>
            </div>
            <div class="rec-vals">
              <span class="mono rec-val">{{ r.charge }} kg</span>
              <span v-if="r.lest !== null" class="rec-sub muted">dont {{ r.lest > 0 ? '+' + r.lest + ' kg de lest' : 'poids du corps' }}</span>
              <span v-if="r.reps > 1" class="rec-sub muted">{{ r.reps }} reps à cette charge</span>
              <span v-if="r.e1rm" class="rec-sub muted">1RM estimé {{ r.e1rm }} kg</span>
            </div>
          </div>
        </div>
      </div>
      <div v-if="fat" class="card" :class="'fat-' + fat.level">
        <div class="row-between mb-8">
          <div class="section-label">Fatigue &amp; récupération</div>
          <span class="fat-badge" :class="fat.level">{{ FATIGUE_ICON[fat.level] }} {{ FATIGUE_LABELS[fat.level] }}</span>
        </div>
        <div v-if="fat.level !== 'unknown'" class="fat-gauge"><div class="fat-gauge-fill" :class="fat.level" :style="{ width: fat.score + '%' }"></div></div>
        <div class="fat-advice">{{ fat.advice }}</div>
        <ul v-if="fat.reasons.length" class="fat-reasons">
          <li v-for="(r, i) in fat.reasons" :key="i">{{ r }}</li>
        </ul>
        <!-- Volume par semaine : la dernière barre est la semaine en cours, encore incomplète -->
        <div class="fat-weeks">
          <div v-for="(w, i) in fatWeeks" :key="i" class="fat-week" :class="{ current: w.current }">
            <div class="fat-week-bar"><div class="fat-week-fill" :style="{ height: Math.max(2, w.pct) + '%' }"></div></div>
            <span class="fat-week-lbl mono">{{ w.label }}</span>
          </div>
        </div>
        <div class="muted">
          Volume par semaine (la dernière barre est la semaine en cours, encore incomplète — elle ne compte pas dans la tendance).
          <template v-if="fat.hardRatio !== null"><br>Ressenti récent : {{ Math.round(fat.hardRatio * 100) }} % des exercices notés « dur » ou « échec ».</template>
          <template v-else><br>Note le ressenti de tes exercices pour affiner cet indicateur.</template>
          <br><span class="fat-caveat">Indicateur composite construit sur ton volume, ton ressenti et ta stagnation — un repère pour décider, pas une mesure physiologique.</span>
        </div>
      </div>
      <div class="card" :class="{ 'backup-warn': exportStale }">
        <div class="section-label mb-8">Sauvegarde</div>
        <div v-if="exportAge === null" class="muted">
          ⚠️ <b>Jamais sauvegardé.</b> Tout est stocké dans ce navigateur : vider les données du site effacerait tout ton historique. Fais un export depuis <b>Profil → Données</b>.
        </div>
        <div v-else class="muted">
          <template v-if="exportStale">⚠️ Dernière sauvegarde il y a <b>{{ exportAge }} jours</b> ({{ lastExportAt }}) — pense à refaire un export depuis <b>Profil → Données</b>.</template>
          <template v-else>✓ Dernière sauvegarde il y a {{ exportAge }} jour(s) ({{ lastExportAt }}).</template>
        </div>
      </div>
    </template>
  </div>
</template>
