<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useWorkout } from '~/composables/useWorkout'
import { useProfile } from '~/composables/useProfile'
import { useRestTimer } from '~/composables/useRestTimer'

// Vue « Profil » extraite de /sport (chargée à la demande). État partagé via composables.
const props = defineProps<{ todayIso: string | null }>()
const emit = defineEmits<{ flash: [msg: string] }>()

const { bodyWeight, addBodyWeight, exportJSON, importJSON, lastExportAt, daysSinceExport, backupDate, restoreBackup } = useWorkout()

// Sauvegarde : tout vit dans le navigateur, donc on affiche l'âge du dernier export
// et on propose l'instantané de secours écrit automatiquement (1×/jour).
const EXPORT_STALE_DAYS = 30
const exportAge = computed(() => (props.todayIso ? daysSinceExport(props.todayIso) : null))
const exportStale = computed(() => exportAge.value === null || exportAge.value > EXPORT_STALE_DAYS)
const backupOn = ref<string | null>(null)
onMounted(() => { backupOn.value = backupDate() })
function onRestore() {
  if (!confirm('Remplacer les données actuelles par l’instantané de secours ? Fais un export avant si tu as un doute.')) return
  emit('flash', restoreBackup() ? 'Instantané restauré ✓' : 'Aucun instantané disponible')
}

const { profile, weekPlan, setHeight, setSex, setBirthYear, resetPlan, restore: restoreProfile } = useProfile()
const { soundEnabled, soundVolume, soundType, testSound, SOUND_OPTIONS, vibrationLevel, VIBRATION_OPTIONS, watchNotify, watchStatus, setWatchNotify, testWatch } = useRestTimer()

// Relais montre : la fin de repos part en notification téléphone même app ouverte,
// pour que la montre (FIT 100 S…) la répercute et vibre au poignet.
const WATCH_STATUS_LABEL: Record<string, string> = {
  granted: 'Notifications autorisées',
  denied: 'Notifications bloquées',
  default: 'Notifications à autoriser',
  unsupported: 'Non géré par ce navigateur',
  unknown: '…',
}
const watchStatusLabel = computed(() => WATCH_STATUS_LABEL[watchStatus.value] ?? '…')
const watchStatusOk = computed(() => watchStatus.value === 'granted')
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

    <!-- Son & vibration de fin de repos -->
    <div class="card">
      <div class="row-between mb-8">
        <div class="section-label">Son de fin de repos</div>
        <button class="btn" :class="{ sel: soundEnabled }" @click="soundEnabled = !soundEnabled">{{ soundEnabled ? 'Activé' : 'Désactivé' }}</button>
      </div>
      <div class="form-grid">
        <div class="field">
          <span>Son</span>
          <SportSelect v-model="soundType" :options="SOUND_OPTIONS" />
        </div>
        <label class="field">
          <span>Volume · {{ volPct }} %</span>
          <input v-model.number="volPct" type="range" min="0" max="100" step="5" class="range" :style="{ '--fill': volPct + '%' }">
        </label>
        <div class="field">
          <span>Vibration</span>
          <SportSelect v-model="vibrationLevel" :options="VIBRATION_OPTIONS" />
        </div>
      </div>
      <div class="nav-row mt-6">
        <button class="btn flex-1" @click="testSound">🔊 Tester son + vibration</button>
      </div>
      <div class="muted mt-6">Le téléphone ne permet pas de régler la <em>force</em> exacte de la vibration : « Légère / Moyenne / Forte » jouent des vibrations de plus en plus longues et répétées.<template v-if="!soundEnabled"> Son coupé — la vibration reste active.</template></div>
    </div>

    <!-- Relais vers la montre connectée (via les notifications du téléphone) -->
    <div class="card">
      <div class="row-between mb-8">
        <div class="section-label">Montre connectée</div>
        <span class="muted" :class="{ 'export-warn': !watchStatusOk }">{{ watchStatusLabel }}</span>
      </div>
      <div class="row-between">
        <span class="muted">Notifications sur la montre</span>
        <button class="btn" :class="{ sel: watchNotify }" @click="setWatchNotify(!watchNotify)">{{ watchNotify ? 'Activé' : 'Désactivé' }}</button>
      </div>
      <div class="nav-row mt-6">
        <button class="btn flex-1" :disabled="!watchNotify" @click="testWatch">⌚ Essayer</button>
      </div>
    </div>

    <div class="card">
      <div class="section-label mb-8">Données</div>
      <div class="nav-row">
        <button class="btn flex-1" @click="exportJSON({ profile, weekPlan })">⬇ Exporter</button>
        <label class="btn flex-1 center">⬆ Importer<input type="file" accept=".json" class="hidden-input" @change="onImport"></label>
        <button class="btn flex-1" @click="resetPlan()">↺ Réinit. planning</button>
      </div>
      <div class="muted mt-6" :class="{ 'export-warn': exportStale }">
        <template v-if="lastExportAt">{{ exportStale ? '⚠️' : '✓' }} Dernière sauvegarde : <b>{{ lastExportAt }}</b><template v-if="exportAge !== null"> (il y a {{ exportAge }} j)</template>.</template>
        <template v-else>⚠️ <b>Jamais sauvegardé.</b> Tout est stocké dans ce navigateur — vider les données du site effacerait tout ton historique.</template>
      </div>
      <div v-if="backupOn" class="muted mt-6">
        Filet de sécurité automatique du <b>{{ backupOn }}</b> conservé dans le navigateur.
        <button class="btn restore-btn" @click="onRestore">↩ Restaurer cet instantané</button>
      </div>
      <div class="muted mt-6">Le planning de la semaine est fixe (Lundi Pecs/Ép · Mardi Dos/Bic · Jeudi Jambes · Vendredi Pecs/Bras). Tu peux démarrer n'importe quelle séance n'importe quand — ça ne change pas le planning. « Réinit. » le remet par défaut.</div>
    </div>
  </div>
</template>
