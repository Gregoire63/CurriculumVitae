<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { PROGRAM, ALL_EXERCISES } from '~/data/sportProgram'
import { useWorkout } from '~/composables/useWorkout'
import type { SessionRecord } from '~/composables/useWorkout'
import { useNutrition } from '~/composables/useNutrition'
import { useProfile } from '~/composables/useProfile'
import { useWithings } from '~/composables/useWithings'
import { EFFORT_OPTIONS } from '~/utils/sportStats'
import {
  bmrMifflin, buildDay, dayBurn, dayEnergy, roundMacros, sessionsOn,
} from '~/lib/nutritionStats'
import { useScrollLock } from '~/composables/useScrollLock'

// Ce qui s'est passé une journée donnée — et deux façons d'y revenir : rouvrir la
// séance, ou rouvrir les repas.
//
// La feuille portait aussi la bascule « salle » et le choix des plats. C'était un
// deuxième endroit pour régler ce qui se règle déjà ailleurs, et ça transformait une
// page de consultation en formulaire.
//
// Le télétravail, lui, reste ici : c'est LE seul endroit où on le déclare. Il vivait
// aussi dans la feuille des repas, où il n'avait rien à faire — on y coche ce qu'on
// mange, pas où l'on travaille. Et il change la cible du jour, donc il appartient au
// planning.
const props = defineProps<{ iso: string, todayIso: string | null }>()
const emit = defineEmits<{ close: [], edit: [rec: SessionRecord] }>()

const { sessionLog, bodyWeight } = useWorkout()
const { dayFor, setOverride, dayPlanFor, stepsFor, eatenSlots } = useNutrition()
const { profile } = useProfile()
const { entries: bodyEntries, suspectAts } = useWithings()

const DOW = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const RETIRED: Record<string, string> = { 'ext-corde': 'Extension triceps corde', 'curl-incline': 'Curl incliné haltères', 'curl-ez': 'Curl barre EZ' }
const exName = (id: string) => ALL_EXERCISES.find(e => e.id === id)?.name ?? RETIRED[id] ?? id
const effortIcon = (e?: string) => EFFORT_OPTIONS.find(o => o.value === e)?.icon ?? ''
const recColor = (r: SessionRecord) => PROGRAM.find(p => p.id === r.sessionId)?.color || '#8b6f5c'

const eatSheet = ref(false)

const title = computed(() => {
  const d = new Date(props.iso + 'T00:00:00')
  return `${DOW[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
})
const isToday = computed(() => props.iso === props.todayIso)

const resolved = computed(() => dayFor(props.iso))
const records = computed(() => sessionsOn(sessionLog(), props.iso))

// Poids le plus proche AVANT la date : le métabolisme d'un mardi ne doit pas être
// calculé avec le poids d'aujourd'hui quand on relit une semaine d'il y a un mois.
const kg = computed(() => {
  const before = [...bodyWeight.value].filter(e => e.date <= props.iso).sort((a, b) => a.date.localeCompare(b.date))
  return before.at(-1)?.kg ?? bodyWeight.value[0]?.kg ?? null
})
const age = computed(() => (profile.value.birthYear ? Number(props.iso.slice(0, 4)) - profile.value.birthYear : null))
const bmr = computed(() => bmrMifflin(kg.value, profile.value.heightCm, age.value, profile.value.sex))

const DEFAULT_BURN = 440
const burn = computed(() => {
  if (!kg.value || bmr.value === null) return 0
  if (records.value.length) return dayBurn(records.value, kg.value, bmr.value)
  return resolved.value.gym ? DEFAULT_BURN : 0
})
const energy = computed(() => (bmr.value !== null && kg.value
  ? dayEnergy({ bmr: bmr.value, kg: kg.value, tt: resolved.value.tt, steps: stepsFor(props.iso), sessionKcal: burn.value })
  : null))

const plan = computed(() => dayPlanFor(props.iso, burn.value > 0))
const planTotal = computed(() => (plan.value ? roundMacros(plan.value.total) : null))
const done = computed(() => new Set(eatenSlots(props.iso)))
const doneCount = computed(() => plan.value?.meals.filter(m => done.value.has(m.slot)).length ?? 0)

// Pesées du jour, hors quarantaine — l'onglet Rapport gère les cas litigieux.
const weighIns = computed(() =>
  bodyEntries.value.filter(e => e.date === props.iso && !suspectAts.value.has(e.at)))

// La page derrière ne doit pas bouger pendant qu'on lit cette feuille.
const { lock, unlock } = useScrollLock()
onMounted(lock)
onUnmounted(unlock)
</script>

<template>
  <div class="sheet-overlay" @click.self="emit('close')">
    <div class="sheet day-sheet">
      <div class="sheet-handle" />
      <div class="sheet-head">
        <div>
          <div class="sheet-title">
            {{ title }}<span v-if="isToday" class="ds-today">aujourd'hui</span>
          </div>
          <div class="muted mono">
            {{ records.length ? `${records.length} séance(s)` : 'aucune séance' }}
            <template v-if="resolved.tt"> · télétravail</template>
          </div>
        </div>
        <button class="sheet-close" aria-label="Fermer" @click="emit('close')">×</button>
      </div>

      <div class="sheet-body">
        <!-- Seul réglage de la feuille : il change la dépense du jour (environ
             4 000 pas d'écart), donc la cible. -->
        <button class="ds-tt" :class="{ on: resolved.tt }" @click="setOverride(iso, { tt: !resolved.tt })">
          <span class="ds-tt-ico">🏠</span>
          <span class="ds-tt-l">{{ resolved.tt ? 'Télétravail' : 'Sur site' }}</span>
          <span class="ds-tt-h muted">{{ resolved.tt ? 'moins de pas, cible plus basse' : 'trajets et escaliers comptés' }}</span>
        </button>

        <!-- Énergie du jour -->
        <div v-if="energy" class="ds-energy">
          <div class="ds-target">
            <span class="ds-target-v mono">{{ energy.target }}</span>
            <span class="ds-target-u">kcal à manger</span>
          </div>
          <div class="nu-energy">
            <span><b>{{ energy.baseKcal }}</b> métabolisme</span>
            <span>+ <b>{{ energy.stepsKcal }}</b> pas<template v-if="energy.stepsEstimated"> (estimés)</template></span>
            <span>+ <b>{{ energy.sessionKcal }}</b> séance<template v-if="records.length"> réelle</template></span>
            <span>− <b>{{ energy.deficit }}</b> déficit</span>
          </div>
        </div>
        <div v-else class="muted ds-nokcal">
          Renseigne taille, sexe et année de naissance dans Profil pour voir la cible calorique.
        </div>

        <!-- Séances réellement enregistrées. Rien de « prévu » ici : la feuille
             raconte ce qui a eu lieu, pas ce qui devait avoir lieu. -->
        <div class="ds-section">Séance</div>
        <div v-if="records.length" class="ds-sessions">
          <button
            v-for="(s, i) in records" :key="i"
            class="ds-session" :style="{ '--c': recColor(s) }"
            @click="emit('edit', s)"
          >
            <div class="ds-s-top">
              <span class="ds-s-dot" />
              <span class="ds-s-name">{{ s.name }}</span>
              <span class="mono muted">{{ s.at.slice(11, 16) }}<template v-if="s.durationMin"> · {{ s.durationMin }} min</template></span>
            </div>
            <div class="ds-s-ex">
              <span v-for="e in s.entries" :key="e.exId" class="ds-s-line">
                {{ exName(e.exId) }} <span v-if="effortIcon(e.effort)">{{ effortIcon(e.effort) }}</span>
                <span class="mono muted">{{ e.sets.map(x => `${x.w}×${x.r}`).join(' · ') }}</span>
              </span>
            </div>
            <div v-if="s.note" class="ds-s-note">📝 {{ s.note }}</div>
            <div class="ds-s-edit muted">✏️ Touche pour modifier cette séance</div>
          </button>
        </div>
        <div v-else class="muted ds-empty">Aucune séance enregistrée ce jour-là.</div>

        <!-- Repas -->
        <div class="ds-section">
          Repas
          <span v-if="planTotal" class="mono ds-section-n">{{ doneCount }}/{{ plan!.meals.length }} pris · {{ planTotal.kcal }} kcal prévus</span>
        </div>
        <p v-if="plan?.off" class="muted ds-empty">
          Jour marqué comme une absence dans ta semaine type : aucun repas prévu.
        </p>
        <div v-else-if="plan" class="ds-meals">
          <div v-for="m in plan.meals" :key="m.slot" class="ds-meal" :class="{ eaten: done.has(m.slot) }">
            <span class="ds-m-time mono">{{ m.time }}</span>
            <span class="ds-m-name">{{ m.name }}</span>
            <span class="ds-m-kcal mono">{{ done.has(m.slot) ? '✓' : Math.round(m.macros.kcal) }}</span>
          </div>
        </div>
        <button v-if="isToday" class="btn-primary ds-open" @click="eatSheet = true">🍽 Compléter les repas</button>
        <p v-else class="muted ds-empty">Les repas ne se cochent que le jour même.</p>

        <!-- Corps -->
        <template v-if="weighIns.length || stepsFor(iso) !== null">
          <div class="ds-section">Corps</div>
          <div class="ds-body">
            <div v-for="e in weighIns" :key="e.at" class="ds-weigh">
              <span class="mono">{{ e.at.slice(11) }}</span>
              <b>{{ e.kg.toFixed(1) }} kg</b>
              <span v-if="e.fatRatio" class="muted">{{ e.fatRatio }} % de gras</span>
              <span v-if="e.muscleMass" class="muted">{{ e.muscleMass }} kg de muscle</span>
            </div>
            <div v-if="stepsFor(iso) !== null" class="ds-weigh">
              <span class="mono">Pas</span><b>{{ stepsFor(iso)!.toLocaleString('fr-FR') }}</b>
            </div>
          </div>
        </template>
      </div>

      <!-- La feuille des repas se superpose : on revient à la journée en la fermant. -->
      <Teleport to="body">
        <div class="sport-app sport-portal">
          <transition name="sheet">
            <NutritionEatSheet v-if="eatSheet" :today-iso="iso" @close="eatSheet = false" />
          </transition>
        </div>
      </Teleport>
    </div>
  </div>
</template>
