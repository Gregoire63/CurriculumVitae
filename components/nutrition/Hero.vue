<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNutrition } from '~/composables/useNutrition'
import { useProfile } from '~/composables/useProfile'
import { useWorkout } from '~/composables/useWorkout'
import {
  adjustRemaining, applySteps, bmrMifflin, buildDay, carryAdjustedTarget, dayBurn, dayEnergy, dayIntake, donutArcs, hhmm, isDayPlayed, macroTargets, mondayOf, nextMeal, proteinTarget, sessionsOn, sumMacros, timelineOf, weekBalance,
} from '~/lib/nutritionStats'
import { shiftIso } from '~/utils/sportStats'

// Bandeau d'accueil : où j'en suis, et une saisie en trois secondes.
//
// C'est le seul écran qu'on regarde plusieurs fois par jour. Il répond donc à une
// seule question — combien il me reste — et propose un seul geste : remplir. Le
// détail des repas s'ouvre en feuille, comme une séance : c'est une action, pas
// une destination, et ça n'a jamais mérité un onglet permanent.
const props = defineProps<{ todayIso: string }>()

const {
  hydrate, dayPlanFor, dayFor, stepsFor, toggleEaten, eatenSlots, extrasFor, addExtra,
  removeExtra, prepMode, library,
} = useNutrition()

// Le bandeau peut être monté sans passer par l'onglet Nutrition : il hydrate lui-même.
onMounted(hydrate)
const { profile } = useProfile()
const { bodyWeight, sessionLog } = useWorkout()

const open = ref(false)
const eatSheet = ref(false)
const macroSheet = ref(false)
const label = ref('')
const kcal = ref('')
const time = ref(hhmm(new Date()))
const nowHour = new Date().getHours()

const kg = computed(() => [...bodyWeight.value].sort((a, b) => b.date.localeCompare(a.date))[0]?.kg ?? null)
const age = computed(() => (profile.value.birthYear ? new Date(props.todayIso + 'T00:00:00').getFullYear() - profile.value.birthYear : null))
const bmr = computed(() => bmrMifflin(kg.value, profile.value.heightCm, age.value, profile.value.sex))

const DEFAULT_BURN = 440

/** Bilan d'une journée quelconque : sert pour aujourd'hui et pour le report hebdo. */
function energyOf(iso: string) {
  if (bmr.value === null || !kg.value) return null
  const r = dayFor(iso)
  const rec = sessionsOn(sessionLog(), iso)
  const played = isDayPlayed(iso, props.todayIso, nowHour)
  const burn = rec.length ? dayBurn(rec, kg.value, bmr.value) : (r.gym && !played ? DEFAULT_BURN : 0)
  return { r, burn, energy: dayEnergy({ bmr: bmr.value, kg: kg.value, tt: r.tt, steps: stepsFor(iso), sessionKcal: burn }) }
}

const planOf = (iso: string, trained: boolean) => dayPlanFor(iso, trained)

const today = computed(() => energyOf(props.todayIso))

// Ce qui a déjà été avalé : repas validés + extras. L'ajustement ne doit porter que
// sur les repas restants, sinon un écart déjà encaissé se paierait deux fois.
const eatenSoFar = computed(() => {
  const base = planOf(props.todayIso, (today.value?.burn ?? 0) > 0)
  const done = new Set(eatenSlots(props.todayIso))
  const meals = base.meals.filter(m => done.has(m.slot)).map(m => m.macros)
  const ex = extrasFor(props.todayIso).map(e => ({ kcal: e.kcal, p: e.p, g: e.g, l: e.l }))
  return sumMacros([...meals, ...ex]).kcal
})

const day = computed(() => {
  const base = planOf(props.todayIso, (today.value?.burn ?? 0) > 0)
  if (!today.value) return base
  const adj = adjustRemaining(
    base, today.value.energy.target,
    eatenSlots(props.todayIso), eatenSoFar.value,
    prepMode.value, library.value.foods,
  )
  return applySteps(base, adj, library.value.foods)
})

// ─── Report hebdomadaire ─────────────────────────────────────────────────────
// Un écart ne se rattrape pas le lendemain : il se lisse sur les jours qui restent.
const balance = computed(() => {
  const monday = mondayOf(props.todayIso)
  const rows = Array.from({ length: 7 }, (_, i) => {
    const iso = shiftIso(monday, i)
    const e = energyOf(iso)
    if (!e) return null
    const intake = dayIntake(planOf(iso, e.burn > 0), eatenSlots(iso), extrasFor(iso), e.energy.target)
    return { iso, target: e.energy.target, eaten: intake.eaten.kcal, closed: iso < props.todayIso }
  }).filter(Boolean) as { iso: string, target: number, eaten: number, closed: boolean }[]
  return rows.length ? weekBalance(rows) : null
})

const target = computed(() => (today.value
  ? carryAdjustedTarget(today.value.energy.target, balance.value?.perDay ?? 0)
  : null))

// Sans profil complet on ne peut pas donner de cible, mais on affiche quand même
// la journée : mieux vaut une frise sans compteur qu'un écran vide.
const intake = computed(() => dayIntake(day.value, eatenSlots(props.todayIso), extrasFor(props.todayIso), target.value ?? 0))

const line = computed(() => timelineOf(day.value, eatenSlots(props.todayIso), extrasFor(props.todayIso)))
const next = computed(() => nextMeal(line.value))

// ─── Camembert ───────────────────────────────────────────────────────────────
const R = 52
const C = 2 * Math.PI * R
const over = computed(() => intake.value.progress > 1)

const targets = computed(() => (kg.value && target.value ? macroTargets(kg.value, target.value) : null))

/**
 * Un arc par macro, bout à bout : leur somme est la progression totale, donc le
 * cercle répond aux deux questions d'un coup — où j'en suis, et de quoi c'est fait.
 * Un anneau d'une seule couleur disait le combien sans jamais dire le quoi, alors
 * que c'est le quoi qui décide si la perte vient du gras ou du muscle.
 */
const arcs = computed(() => {
  if (!target.value) return []
  return donutArcs(intake.value.eaten, target.value).map(a => ({
    ...a,
    // Tronqué à un tour : au-delà, les arcs se superposeraient et deviendraient illisibles.
    dash: `${C * Math.max(0, Math.min(1, a.to) - Math.min(1, a.from))} ${C}`,
    offset: -C * Math.min(1, a.from),
  })).filter(a => a.to > a.from)
})

// ─── Statistiques de tête ───────────────────────────────────────────────────
const pTarget = computed(() => (kg.value ? proteinTarget(kg.value) : null))
const stepsToday = computed(() => stepsFor(props.todayIso))
const doneCount = computed(() => line.value.filter(e => e.done).length)
const totalMeals = computed(() => line.value.filter(e => e.kind === 'plan').length)
const sessionToday = computed(() => sessionsOn(sessionLog(), props.todayIso)[0] ?? null)

const stats = computed(() => [
  {
    key: 'prot',
    label: 'Protéines',
    value: `${intake.value.eaten.p}`,
    unit: pTarget.value ? `/ ${pTarget.value} g` : 'g',
    // La protéine est le garde-fou de la masse maigre en déficit : elle mérite
    // d'être verte ou pas, contrairement aux glucides qui ne se pilotent pas.
    tone: pTarget.value && intake.value.eaten.p >= pTarget.value ? 'good' : '',
  },
  { key: 'repas', label: 'Repas pris', value: `${doneCount.value}`, unit: `/ ${totalMeals.value}`, tone: '' },
  {
    key: 'seance',
    label: 'Séance',
    value: sessionToday.value ? '✓' : (today?.value?.r.gym ? '—' : '·'),
    unit: sessionToday.value ? `${today?.value?.burn ?? 0} kcal` : (today?.value?.r.gym ? 'prévue' : 'repos'),
    tone: sessionToday.value ? 'good' : '',
  },
  {
    key: 'pas',
    label: 'Pas',
    value: stepsToday.value !== null ? stepsToday.value.toLocaleString('fr-FR') : '—',
    unit: stepsToday.value !== null ? 'mesurés' : 'estimés',
    tone: '',
  },
])

function addNow() {
  const v = Number.parseInt(kcal.value, 10)
  if (!Number.isFinite(v) || v <= 0) return
  addExtra(props.todayIso, { label: label.value.trim() || 'Extra', kcal: v, p: 0, g: 0, l: 0, time: time.value })
  label.value = ''
  kcal.value = ''
  open.value = false
}
</script>

<template>
  <div class="card nu-hero">
    <!-- Sur large écran, le camembert et la séance partagent la première ligne.
         Sur téléphone, tout est en colonne et la séance passe APRÈS le bouton des
         repas : on ouvre l'appli pour manger cinq fois par jour et pour s'entraîner
         une, l'ordre de lecture doit suivre. C'est une grille nommée plutôt que des
         `order` en flex, pour que les deux dispositions restent lisibles côte à côte. -->
    <div class="nu-hero-left">
      <div class="section-label duo-title">🍽 Nutrition</div>
      <div class="nu-hero-top">
        <button
          v-if="target" class="nu-donut-btn" :title="`${intake.eaten.kcal} kcal sur ${target} — voir le détail par macro`"
          @click="macroSheet = true"
        >
          <svg class="nu-donut" viewBox="0 0 128 128" role="img" :aria-label="`${intake.eaten.kcal} kcal sur ${target}`">
            <circle class="nu-donut-bg" cx="64" cy="64" :r="R" />
            <circle
              v-for="a in arcs" :key="a.key"
              class="nu-donut-arc" :class="[a.key, { over }]" cx="64" cy="64" :r="R"
              :stroke-dasharray="a.dash" :stroke-dashoffset="a.offset" transform="rotate(-90 64 64)"
            />
            <text class="nu-donut-v" x="64" y="58">{{ intake.remaining }}</text>
            <text class="nu-donut-l" x="64" y="74">kcal restantes</text>
            <text class="nu-donut-s" x="64" y="88">{{ intake.eaten.kcal }} / {{ target }}</text>
          </svg>
          <span class="nu-donut-legend mono">
            <i class="p" />P <i class="g" />G <i class="l" />L · détail →
          </span>
        </button>
        <div v-else class="nu-donut nu-donut-empty">—</div>

        <div class="nu-hero-side">
          <div v-if="next" class="nu-hero-next-big">
            <div class="mono nu-hero-next-t">{{ next.time }}</div>
            <div class="nu-hero-next-l">{{ next.label }}</div>
            <button class="btn-primary nu-hero-eat" @click="toggleEaten(props.todayIso, next.slot!)">✓ Mangé</button>
          </div>
          <div v-else class="muted">Tous les repas du plan sont validés.</div>
        </div>
      </div>
      <NuxtLink v-if="!target" to="/sport" class="muted nu-hero-warn">
        Renseigne taille et année de naissance dans Profil, et pèse-toi : la cible en dépend.
      </NuxtLink>
    </div>

    <div class="nu-hero-sep" />

    <div class="nu-hero-right">
      <div class="section-label duo-title">🏋️ Séance du jour</div>
      <slot name="session" />
    </div>

    <!-- Les quelques chiffres qui disent si la journée est sur les rails -->
    <div class="nu-stats">
      <div v-for="st in stats" :key="st.key" class="nu-stat" :class="st.tone">
        <span class="nu-stat-v mono">{{ st.value }}</span>
        <span class="nu-stat-u">{{ st.unit }}</span>
        <span class="nu-stat-l">{{ st.label }}</span>
      </div>
    </div>

    <!-- Le report hebdomadaire, seulement quand il y a quelque chose à dire -->
    <p v-if="balance && (balance.perDay !== 0 || balance.giveUp)" class="nu-note">
      {{ balance.advice }}
    </p>

    <div class="nu-hero-actions">
      <button class="btn-primary flex-1" @click="eatSheet = true">🍽 Remplir mes repas</button>
      <button v-if="!open" class="btn" @click="open = true; time = hhmm(new Date())">＋ Extra</button>
    </div>
    <div v-if="open" class="nu-quick">
      <input v-model="time" type="time" aria-label="Heure">
      <input v-model="label" type="text" placeholder="Quoi ?">
      <input v-model="kcal" type="number" inputmode="numeric" min="0" step="10" placeholder="kcal">
      <button class="btn-primary" @click="addNow()">OK</button>
    </div>

    <!-- Téléporté dans <body> pour échapper aux transformations des cartes parentes,
         mais DANS un .sport-app : sinon la feuille sort de la portée du CSS du module
         et s'affiche sans aucun style. -->
    <Teleport to="body">
      <div class="sport-app sport-portal">
        <transition name="sheet">
          <NutritionEatSheet v-if="eatSheet" :today-iso="props.todayIso" @close="eatSheet = false" />
        </transition>
        <transition name="sheet">
          <NutritionMacroSheet
            v-if="macroSheet && targets"
            :eaten="intake.eaten" :targets="targets" :remaining="intake.remaining"
            @close="macroSheet = false"
          />
        </transition>
      </div>
    </Teleport>
  </div>
</template>
