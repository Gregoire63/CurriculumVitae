<script setup lang="ts">
import { computed } from 'vue'
import { useWorkout } from '~/composables/useWorkout'
import { useProfile } from '~/composables/useProfile'

// Vue « Profil » extraite de /sport (chargée à la demande). État partagé via composables.
const props = defineProps<{ todayIso: string | null }>()
const emit = defineEmits<{ flash: [msg: string] }>()

const { bodyWeight, addBodyWeight, exportJSON, importJSON } = useWorkout()
const { profile, weekPlan, setHeight, setSex, setBirthYear, resetPlan, restore: restoreProfile } = useProfile()

const latestWeight = computed(() => (bodyWeight.value.length ? bodyWeight.value[bodyWeight.value.length - 1].kg : null))
const bwData = computed(() => bodyWeight.value.map(e => ({ date: e.date.slice(5), kg: e.kg })))
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

function onWeight(ev: Event) {
  const kg = parseFloat((ev.target as HTMLInputElement).value)
  if (!kg || kg < 30 || kg > 250) return
  addBodyWeight(kg); emit('flash', 'Poids enregistré ✓')
}
async function onImport(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    await importJSON(file, data => restoreProfile(data as { profile?: typeof profile.value; weekPlan?: typeof weekPlan.value }))
    emit('flash', 'Données importées ✓')
  } catch { emit('flash', 'Fichier invalide') }
}
function onHeight(ev: Event) { setHeight(parseFloat((ev.target as HTMLInputElement).value) || null) }
function onYear(ev: Event) { setBirthYear(parseInt((ev.target as HTMLInputElement).value, 10) || null) }
</script>

<template>
  <div class="stack">
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

    <div v-if="bwData.length" class="card">
      <div class="row-between mb-8">
        <div class="section-label">Suivi du poids</div>
        <div v-if="bwTrend !== 0" class="mono bmi-inline" :class="bwTrend < 0 ? 'trend-down' : 'trend-up'">{{ bwTrend > 0 ? '+' : '' }}{{ bwTrend }} kg depuis le début</div>
      </div>
      <div class="chart-wrap"><LazySportSvgChart :data="bwData" y-key="kg" color="#b07d2e" :height="170" /></div>
    </div>

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
</template>
