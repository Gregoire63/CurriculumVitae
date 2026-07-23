<script setup lang="ts">
import { computed, ref } from 'vue'
import { useWorkout } from '~/composables/useWorkout'
import { useProfile } from '~/composables/useProfile'
import { useRestTimer } from '~/composables/useRestTimer'

// Vue « Profil » extraite de /sport (chargée à la demande). État partagé via composables.
const props = defineProps<{ todayIso: string | null }>()
const emit = defineEmits<{ flash: [msg: string] }>()

const { bodyWeight, addBodyWeight, exportJSON, importJSON } = useWorkout()
const { profile, weekPlan, setHeight, setSex, setBirthYear, resetPlan, restore: restoreProfile } = useProfile()
const { soundEnabled, soundVolume, soundType, testSound, SOUND_OPTIONS } = useRestTimer()
const volPct = computed({
  get: () => Math.round(soundVolume.value * 100),
  set: (v: number) => { soundVolume.value = Math.min(1, Math.max(0, (Number(v) || 0) / 100)) },
})

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

// Nouvelle pesée : enregistre le poids à la date du jour (addBodyWeight garde
// un point par jour, l'historique se construit au fil des jours pour le graphe).
const newWeight = ref<number | null>(null)
function saveWeighIn() {
  const kg = Number(newWeight.value)
  if (!kg || kg < 30 || kg > 250) { emit('flash', 'Poids invalide (30–250 kg)'); return }
  addBodyWeight(kg)
  newWeight.value = null
  emit('flash', 'Pesée enregistrée ✓')
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

    <div class="card">
      <div class="row-between mb-8">
        <div class="section-label">Suivi du poids</div>
        <div v-if="latestWeight" class="mono weight-now">{{ latestWeight }} kg<span v-if="bwTrend !== 0" class="bmi-inline" :class="bwTrend < 0 ? 'trend-down' : 'trend-up'"> · {{ bwTrend > 0 ? '+' : '' }}{{ bwTrend }} kg</span></div>
      </div>
      <div class="weigh-row">
        <input v-model.number="newWeight" type="number" inputmode="decimal" step="0.1" placeholder="Ton poids (kg)" @keyup.enter="saveWeighIn">
        <button class="btn-primary" @click="saveWeighIn">＋ Nouvelle pesée</button>
      </div>
      <div class="muted mt-6">Chaque pesée est datée du jour → l'historique se construit au fil des jours. Si tu repèses aujourd'hui, la valeur du jour est mise à jour.</div>
      <div v-if="bwData.length" class="chart-wrap mt-6"><LazySportSvgChart :data="bwData" y-key="kg" color="#b07d2e" :height="170" /></div>
    </div>

    <!-- Son de fin de repos -->
    <div class="card">
      <div class="row-between mb-8">
        <div class="section-label">Son de fin de repos</div>
        <button class="btn" :class="{ sel: soundEnabled }" @click="soundEnabled = !soundEnabled">{{ soundEnabled ? 'Activé' : 'Désactivé' }}</button>
      </div>
      <div class="form-grid">
        <label class="field">
          <span>Son</span>
          <select v-model="soundType" class="select">
            <option v-for="o in SOUND_OPTIONS" :key="o.key" :value="o.key">{{ o.label }}</option>
          </select>
        </label>
        <label class="field">
          <span>Volume · {{ volPct }} %</span>
          <input v-model.number="volPct" type="range" min="0" max="100" step="5" class="range">
        </label>
      </div>
      <div class="nav-row mt-6">
        <button class="btn flex-1" @click="testSound">🔊 Tester le son</button>
      </div>
      <div v-if="!soundEnabled" class="muted mt-6">Son coupé — la vibration de fin de repos reste active.</div>
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
