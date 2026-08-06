<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useWorkout } from '~/composables/useWorkout'
import { useNutrition } from '~/composables/useNutrition'
import { useWithings } from '~/composables/useWithings'
import { useProfile } from '~/composables/useProfile'
import { useRestTimer } from '~/composables/useRestTimer'
import { DAY_NAMES } from '~/lib/nutritionStats'

// Vue « Profil » extraite de /sport (chargée à la demande). État partagé via composables.
const props = defineProps<{ todayIso: string | null, withingsError?: string | null }>()
const emit = defineEmits<{ flash: [msg: string] }>()

const { bodyWeight, exportJSON, importJSON, lastExportAt, daysSinceExport, backupDate, restoreBackup } = useWorkout()

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
// Le module nutrition part dans la même sauvegarde : une seule sauvegarde à gérer.
const { exportData: nutritionData, restore: restoreNutrition, week, setWeekDay, resetWeek, hydrate: hydrateNutrition } = useNutrition()
hydrateNutrition()
// Les pesées Withings partent dans la même sauvegarde : c'est le même suivi.
const {
  snapshot: withingsData, restore: restoreWithings, hydrate: hydrateWithings,
  connected: withingsOn, connect: connectWithings, disconnect: disconnectWithings, entries: weighIns,
} = useWithings()
hydrateWithings()
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

async function onImport(ev: Event) {
  const file = (ev.target as HTMLInputElement).files?.[0]
  if (!file) return
  try {
    await importJSON(file, (data) => {
      restoreProfile(data as { profile?: typeof profile.value; weekPlan?: typeof weekPlan.value })
      restoreNutrition(data as Parameters<typeof restoreNutrition>[0])
      restoreWithings(data)
    })
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
      <div v-else class="muted">Renseigne taille, sexe et année de naissance : tout le reste en découle. La pesée, elle, se fait dans <b>Rapport</b>.</div>
    </div>

    <!-- Ma semaine type : c'est un réglage, pas un suivi. Il pilote le calendrier du
         Journal (jours de salle, jours de télétravail) sans qu'on ait à le retoucher. -->
    <div class="card">
      <div class="row-between mb-8">
        <div class="section-label">Ma semaine type</div>
        <button class="btn" @click="resetWeek()">↺ Défaut</button>
      </div>
      <div class="nu-weekgrid">
        <div v-for="(n, i) in DAY_NAMES" :key="i" class="nu-weekday">
          <div class="nu-weekday-name mono">{{ n.slice(0, 3) }}</div>
          <button class="nu-chip" :class="{ on: week.gym[i] }" @click="setWeekDay(i, 'gym', !week.gym[i])">🏋️</button>
          <button class="nu-chip tt" :class="{ on: week.tt[i] }" @click="setWeekDay(i, 'tt', !week.tt[i])">🏠</button>
        </div>
      </div>
      <div class="muted mt-6">
        🏋️ salle, 🏠 télétravail — les deux sont indépendants, un mardi peut être les deux.
        Pour corriger un jour en particulier, touche-le dans le calendrier du Journal :
        ça ne change que ce jour-là.
      </div>
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

    <!-- Appareils : la balance se branche ici, avec la montre. C'est un réglage
         d'appareil, pas une donnée de suivi — le Rapport affiche les mesures et
         renvoie vers cet écran quand rien n'est connecté. -->
    <div class="card">
      <div class="row-between mb-8">
        <div class="section-label">Balance Withings</div>
        <span class="muted" :class="{ 'export-warn': !withingsOn }">{{ withingsOn ? 'Connectée' : 'Non connectée' }}</span>
      </div>
      <p v-if="props.withingsError" class="muted export-warn">
        ⚠️ La dernière tentative a échoué ({{ props.withingsError }}). Réessaie : le code
        d'autorisation n'est valable que quelques secondes.
      </p>
      <div v-if="!withingsOn" class="muted">
        Une seule autorisation, puis l'appli récupère chaque pesée toute seule : poids,
        masse grasse, muscle, eau, os — et les pas si l'appli Withings est reliée à
        Samsung Health (Profil → Apps). Les jetons restent sur ce téléphone.
      </div>
      <div v-else class="muted">
        {{ weighIns.length }} pesée(s) récupérée(s). Les mesures et les statistiques sont
        dans <b>Rapport</b>.
      </div>
      <div class="nav-row mt-6">
        <button v-if="!withingsOn" class="btn-primary flex-1" @click="connectWithings()">⚖️ Connecter la balance</button>
        <button v-else class="btn flex-1" @click="disconnectWithings()">Déconnecter</button>
      </div>
      <div v-if="withingsOn" class="muted mt-6">
        Se déconnecter ne supprime rien : les pesées déjà récupérées sont à toi, elles restent.
      </div>
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
        <button class="btn flex-1" @click="exportJSON({ profile, weekPlan, nutrition: nutritionData(), ...withingsData() })">⬇ Exporter</button>
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
