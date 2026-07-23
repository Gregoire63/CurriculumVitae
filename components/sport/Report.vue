<script setup lang="ts">
import { computed } from 'vue'
import { ALL_EXERCISES } from '~/data/sportProgram'
import { useWorkout } from '~/composables/useWorkout'
import { useProfile } from '~/composables/useProfile'

// Vue « Rapport » extraite de /sport (chargée à la demande). État partagé via composables.
const props = defineProps<{ todayIso: string | null; todayDow: number | null }>()

const { logs, bodyWeight, sessionLog, bestCharge } = useWorkout()
const { profile } = useProfile()

const MUSCLE_LABELS: Record<string, string> = {
  pecs: 'Pecs', 'epaules-av': 'Épaules', 'epaules-lat': 'Épaules', 'epaules-ar': 'Épaules',
  triceps: 'Triceps', biceps: 'Biceps', 'avant-bras': 'Avant-bras', abdos: 'Abdos',
  dos: 'Dos', lombaires: 'Lombaires', quadris: 'Quadris', ischios: 'Ischios', fessiers: 'Fessiers', mollets: 'Mollets',
}
const RETIRED_NAMES: Record<string, string> = { 'ext-corde': 'Extension triceps corde', 'curl-incline': 'Curl incliné haltères' }
const exName = (id: string) => ALL_EXERCISES.find(e => e.id === id)?.name ?? RETIRED_NAMES[id] ?? id
const p2 = (n: number) => String(n).padStart(2, '0')
const fmtVol = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} t` : `${Math.round(v)} kg`)

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
const startOfWeekISO = computed(() => {
  if (!props.todayIso || props.todayDow === null) return null
  const d = new Date(props.todayIso + 'T00:00:00')
  d.setDate(d.getDate() - ((props.todayDow + 6) % 7))
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
const hasData = computed(() => totalSessions.value > 0 || latestWeight.value !== null)
</script>

<template>
  <div class="stack">
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
</template>
