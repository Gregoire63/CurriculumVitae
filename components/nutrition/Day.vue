<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNutrition } from '~/composables/useNutrition'
import { useProfile } from '~/composables/useProfile'
import { useWorkout } from '~/composables/useWorkout'
import type { DayMeal, DayStatus } from '~/lib/nutritionStats'
import {
  DAY_NAMES, STATUS_LABELS, adjustRemaining, applySteps, bmrMifflin, buildDay, dayBurn,
  dayEnergy, dayIntake, dayStatus, dowIndex, extraFromRecipe, isDayPlayed, macroSplit,
  proteinTarget, quickExtra, roundMacros, sessionsOn, sumMacros,
} from '~/lib/nutritionStats'

// Vue « Aujourd'hui » : le tableau de bord du jour.
// Trois postes de dépense explicites — métabolisme, pas, séance — au lieu d'un
// facteur d'activité opaque. Le télétravail n'est donc pas un coefficient magique :
// c'est simplement une journée où on marche beaucoup moins.
const props = defineProps<{ todayIso: string }>()

const {
  indexFor, dayFor, stepsFor, isEaten, toggleEaten, eatenSlots,
  extrasFor, addExtra, removeExtra, prepMode, library,
} = useNutrition()
const { profile } = useProfile()
const { bodyWeight, sessionLog } = useWorkout()

const sheet = ref<DayMeal | null>(null)
const adding = ref(false)
const quickLabel = ref('')
const quickKcal = ref('')
const nowHour = new Date().getHours()

const index = computed(() => indexFor(props.todayIso))
const resolved = computed(() => dayFor(props.todayIso))

// ─── Profil ──────────────────────────────────────────────────────────────────
const kg = computed(() => {
  const sorted = [...bodyWeight.value].sort((a, b) => b.date.localeCompare(a.date))
  return sorted[0]?.kg ?? null
})
const age = computed(() => (profile.value.birthYear ? new Date(props.todayIso + 'T00:00:00').getFullYear() - profile.value.birthYear : null))
const bmr = computed(() => bmrMifflin(kg.value, profile.value.heightCm, age.value, profile.value.sex))

// ─── Séance réellement enregistrée ──────────────────────────────────────────
const todaySessions = computed(() => sessionsOn(sessionLog(), props.todayIso))
const status = computed<DayStatus>(() => dayStatus({
  planned: resolved.value.gym,
  recorded: todaySessions.value.length,
  skipped: !resolved.value.gym,
  isPast: isDayPlayed(props.todayIso, props.todayIso, nowHour),
}))
/** Dépense d'une séance moyenne, tant que la vraie n'est pas connue. */
const DEFAULT_BURN = 440

const burn = computed(() => {
  if (!kg.value || bmr.value === null) return 0
  if (status.value === 'pending') return DEFAULT_BURN
  return dayBurn(todaySessions.value, kg.value, bmr.value)
})

// ─── Énergie du jour ─────────────────────────────────────────────────────────
const energy = computed(() => {
  if (bmr.value === null || !kg.value) return null
  return dayEnergy({
    bmr: bmr.value,
    kg: kg.value,
    tt: resolved.value.tt,
    steps: stepsFor(props.todayIso),
    sessionKcal: burn.value,
  })
})

const trained = computed(() => burn.value > 0)
const base = computed(() => buildDay(index.value, trained.value, library.value, resolved.value.menu))

/**
 * Ce qui a déjà été avalé : repas validés + extras notés. L'ajustement ne porte que
 * sur ce qui reste, sinon un déjeuner déjà allégé de sa propre initiative se voyait
 * retirer autant une seconde fois le soir.
 */
const eatenSoFar = computed(() => {
  const done = new Set(eatenSlots(props.todayIso))
  const meals = base.value.meals.filter(m => done.has(m.slot)).map(m => m.macros)
  const ex = extrasFor(props.todayIso).map(e => ({ kcal: e.kcal, p: e.p, g: e.g, l: e.l }))
  return sumMacros([...meals, ...ex]).kcal
})

const adjustment = computed(() => {
  if (!energy.value || status.value === 'pending') return null
  return adjustRemaining(
    base.value, energy.value.target,
    eatenSlots(props.todayIso), eatenSoFar.value,
    prepMode.value, library.value.foods,
  )
})
const day = computed(() => applySteps(base.value, adjustment.value, library.value.foods))

// ─── Ce qui a été mangé ──────────────────────────────────────────────────────
const extras = computed(() => extrasFor(props.todayIso))
const intake = computed(() => (energy.value
  ? dayIntake(day.value, eatenSlots(props.todayIso), extras.value, energy.value.target)
  : null))
const split = computed(() => (intake.value ? macroSplit(intake.value.eaten) : null))
const pTarget = computed(() => (kg.value ? proteinTarget(kg.value) : null))

const dayLabel = computed(() => `${DAY_NAMES[dowIndex(props.todayIso)]} · semaine ${index.value < 7 ? 'A' : 'B'}`)
const statusIcon: Record<DayStatus, string> = {
  rest: '🛋️', pending: '⏳', done: '✅', bonus: '⭐', missed: '⚠️', skipped: '✕',
}

// ─── Actions ─────────────────────────────────────────────────────────────────

/** Plats de la bibliothèque proposés en extra, les plus légers d'abord. */
const addable = computed(() => Object.values(library.value.recipes)
  .map(r => ({ recipe: r, macros: roundMacros(extraFromRecipe(r, library.value, 'preview')) }))
  .sort((a, b) => a.macros.kcal - b.macros.kcal))

function addFromLibrary(id: string) {
  const r = library.value.recipes[id]
  if (!r) return
  const e = extraFromRecipe(r, library.value, 'tmp')
  addExtra(props.todayIso, { label: e.label, kcal: e.kcal, p: e.p, g: e.g, l: e.l, recipeId: e.recipeId })
  adding.value = false
}
function addQuick() {
  const kcal = Number.parseInt(quickKcal.value, 10)
  if (!Number.isFinite(kcal) || kcal <= 0) return
  const e = quickExtra(quickLabel.value.trim() || 'Extra', kcal, 'tmp')
  addExtra(props.todayIso, { label: e.label, kcal: e.kcal, p: e.p, g: e.g, l: e.l })
  quickLabel.value = ''
  quickKcal.value = ''
  adding.value = false
}

const foodName = (id: string) => library.value.foods[id]?.name ?? id
</script>

<template>
  <div class="stack">
    <!-- Le compteur : la seule chose à regarder dans la journée -->
    <div v-if="energy && intake" class="card nu-counter">
      <div class="row-between">
        <div>
          <div class="section-label">{{ dayLabel }}</div>
          <div class="nu-mode">{{ statusIcon[status] }} {{ STATUS_LABELS[status] }}</div>
        </div>
        <div class="nu-counter-big">
          <span class="mono">{{ intake.remaining }}</span>
          <small>kcal restantes</small>
        </div>
      </div>

      <div class="nu-progress">
        <div
          class="nu-progress-fill" :class="{ over: intake.progress > 1 }"
          :style="{ width: `${Math.min(100, intake.progress * 100)}%` }"
        />
      </div>
      <div class="nu-progress-legend mono">
        <span>{{ intake.eaten.kcal }} mangées</span>
        <span>cible {{ energy.target }}</span>
      </div>

      <!-- Le détail de la dépense, poste par poste : aucun chiffre ne sort d'un chapeau -->
      <div class="nu-energy">
        <span><b>{{ energy.baseKcal }}</b> métabolisme</span>
        <span>+ <b>{{ energy.stepsKcal }}</b> pas</span>
        <span>+ <b>{{ energy.sessionKcal }}</b> séance</span>
        <span>− <b>{{ energy.deficit }}</b> déficit</span>
        <span class="nu-energy-eq">= <b>{{ energy.target }}</b> kcal</span>
      </div>
    </div>
    <div v-else class="card empty">
      Renseigne taille, sexe et année de naissance dans <b>Profil</b>, puis pèse-toi
      depuis <b>Rapport</b> : sans ces trois-là, aucune cible ne peut être calculée sur
      tes vraies données.
    </div>



    <div v-if="todaySessions.length" class="card nu-sessions">
      <div v-for="(s, i) in todaySessions" :key="i" class="nu-session">
        <span class="mono">{{ s.at.slice(11, 16) }}</span>
        <span class="flex-1">{{ s.name }}</span>
        <span class="mono">{{ s.durationMin ? `${s.durationMin} min` : '—' }}</span>
      </div>
    </div>

    <!-- L'ajustement -->
    <div v-if="adjustment" class="card nu-adjust" :class="{ up: adjustment.covered > 0 }">
      <div class="nu-adjust-head">
        <span class="nu-adjust-delta mono">{{ adjustment.covered > 0 ? '+' : '' }}{{ adjustment.covered }} kcal</span>
        <span class="nu-adjust-title">
          {{ adjustment.covered > 0 ? 'Tu peux manger un peu plus' : 'Allège les repas d\'aujourd\'hui' }}
        </span>
      </div>
      <p v-if="adjustment.portion" class="nu-adjust-label">{{ adjustment.portion.label }}</p>
      <ul v-else class="nu-adjust-steps">
        <li v-for="(st, i) in adjustment.steps" :key="i">{{ st.label }}</li>
      </ul>
    </div>

    <!-- Les repas à valider -->
    <div class="section-label">Les repas — coche au fur et à mesure</div>
    <div class="nu-meals">
      <div v-for="m in day.meals" :key="m.slot" class="card nu-meal" :class="{ done: isEaten(props.todayIso, m.slot) }">
        <button class="nu-meal-main" @click="sheet = m">
          <div class="nu-meal-top">
            <span class="nu-time mono">{{ m.time }}</span>
            <span class="nu-slot">{{ m.label }}</span>
            <span v-if="m.adjusted" class="nu-tag">ajusté</span>
            <span class="nu-kcal mono">{{ Math.round(m.macros.kcal) }} kcal</span>
          </div>
          <div class="nu-meal-name">{{ m.name }}</div>
          <div class="muted">{{ m.items.map(i => `${foodName(i.food)} ${i.g} g`).join(' · ') }}</div>
        </button>
        <div class="nu-meal-side">
          <!-- Photo en lecture seule : ici on coche des repas, on ne gère pas la
               bibliothèque. La prise de vue se fait dans Nutrition → Plats, une
               seule fois, puisqu'une photo appartient à la recette et pas au jour. -->
          <NutritionThumb :id="m.recipeId" :label="m.name" />
          <button
            class="check" :class="{ ok: isEaten(props.todayIso, m.slot) }"
            :aria-label="isEaten(props.todayIso, m.slot) ? 'Marquer comme non pris' : 'Marquer comme pris'"
            @click="toggleEaten(props.todayIso, m.slot)"
          >
            {{ isEaten(props.todayIso, m.slot) ? '✓' : '○' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Ce qui a été mangé en plus du plan -->
    <div class="section-label">En plus du plan</div>
    <div v-if="extras.length" class="card no-pad">
      <div v-for="e in extras" :key="e.id" class="nu-extra">
        <span class="flex-1">{{ e.label }}</span>
        <span class="mono">{{ e.kcal }} kcal</span>
        <button class="nu-del" aria-label="Retirer" @click="removeExtra(props.todayIso, e.id)">×</button>
      </div>
    </div>
    <button v-if="!adding" class="btn" @click="adding = true">＋ Ajouter ce que j'ai mangé</button>

    <div v-else class="card nu-addbox">
      <div class="section-label">Saisie rapide</div>
      <div class="nu-quick">
        <input v-model="quickLabel" type="text" placeholder="Restaurant, part de gâteau…">
        <input v-model="quickKcal" type="number" inputmode="numeric" min="0" step="10" placeholder="kcal">
        <button class="btn-primary" @click="addQuick()">Ajouter</button>
      </div>
      <div class="section-label mt-6">Ou un plat de la bibliothèque</div>
      <div class="nu-pick">
        <button v-for="a in addable" :key="a.recipe.id" class="btn" @click="addFromLibrary(a.recipe.id)">
          {{ a.recipe.name }} <span class="mono muted">{{ a.macros.kcal }}</span>
        </button>
      </div>
      <button class="btn mt-6" @click="adding = false">Annuler</button>
    </div>

    <!-- Bilan macros de ce qui a réellement été mangé -->
    <div v-if="split && intake" class="card nu-macros">
      <div class="section-label">Ce que tu as mangé aujourd'hui</div>
      <div class="nu-bar mt-6">
        <div class="nu-seg p" :style="{ flex: Math.max(1, split.p) }">{{ intake.eaten.p }} g</div>
        <div class="nu-seg g" :style="{ flex: Math.max(1, split.g) }">{{ intake.eaten.g }} g</div>
        <div class="nu-seg l" :style="{ flex: Math.max(1, split.l) }">{{ intake.eaten.l }} g</div>
      </div>
      <div class="nu-legend mono">
        <span><i class="nu-sw p" />Protéines {{ intake.eaten.p }} g<template v-if="pTarget"> / {{ pTarget }}</template></span>
        <span><i class="nu-sw g" />Glucides {{ intake.eaten.g }} g</span>
        <span><i class="nu-sw l" />Lipides {{ intake.eaten.l }} g</span>
      </div>
    </div>

    <transition name="sheet">
      <div v-if="sheet" class="sheet-overlay" @click.self="sheet = null">
        <div class="sheet">
          <div class="sheet-handle" />
          <div class="sheet-head">
            <div>
              <div class="sheet-title">{{ sheet.name }}</div>
              <div class="muted mono">
                {{ sheet.time }} · {{ Math.round(sheet.macros.kcal) }} kcal ·
                {{ Math.round(sheet.macros.p) }} P / {{ Math.round(sheet.macros.g) }} G / {{ Math.round(sheet.macros.l) }} L
              </div>
            </div>
            <button class="sheet-close" aria-label="Fermer" @click="sheet = null">×</button>
          </div>
          <div class="sheet-body">
            <div v-for="it in sheet.items" :key="it.food" class="nu-ing">
              <span>{{ foodName(it.food) }}</span>
              <span class="mono">{{ it.g }} g</span>
            </div>
          </div>
          <p class="nu-steps">{{ sheet.steps }}</p>
          <p class="muted italic">Viandes, poissons et féculents : toujours pesés crus.</p>
        </div>
      </div>
    </transition>
  </div>
</template>
