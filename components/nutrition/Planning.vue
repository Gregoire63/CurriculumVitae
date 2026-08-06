<script setup lang="ts">
import { computed, ref } from 'vue'
import { useNutrition } from '~/composables/useNutrition'
import { useProfile } from '~/composables/useProfile'
import { useWorkout } from '~/composables/useWorkout'
import {
  DAY_NAMES, activeRecipes, bmrMifflin, buildDay, dayBurn, dayEnergy, mondayOf, roundMacros, sessionsOn, weekLabel,
} from '~/lib/nutritionStats'
import { shiftIso } from '~/utils/sportStats'

// Vue « Planning » : la semaine type d'un côté, les exceptions de l'autre.
// Tout est au même endroit — séance, télétravail, plats du jour et calories —
// parce que ce sont les mêmes données vues sous des angles différents.
// `monday` encastre le planning dans le Journal : il suit alors la semaine que
// l'utilisateur a sélectionnée dans le calendrier, au lieu d'avoir sa propre
// navigation. Deux barres de navigation de semaine côte à côte, ce serait deux
// endroits où se perdre.
const props = withDefaults(defineProps<{ todayIso: string, monday?: string | null }>(), { monday: null })

const {
  week, setWeekDay, resetWeek, dayFor, setOverride, clearOverride, hasOverride,
  indexFor, stepsFor, library,
} = useNutrition()
const { profile } = useProfile()
const { bodyWeight, sessionLog } = useWorkout()

const offset = ref(0)
const editing = ref<string | null>(null)

const monday = computed(() => props.monday ?? shiftIso(mondayOf(props.todayIso), offset.value * 7))
const isoOfDow = (i: number) => shiftIso(monday.value, i)

const kg = computed(() => [...bodyWeight.value].sort((a, b) => b.date.localeCompare(a.date))[0]?.kg ?? null)
const age = computed(() => (profile.value.birthYear ? new Date(props.todayIso + 'T00:00:00').getFullYear() - profile.value.birthYear : null))
const bmr = computed(() => bmrMifflin(kg.value, profile.value.heightCm, age.value, profile.value.sex))

const DEFAULT_BURN = 440

/** Une ligne par jour : ce qui est prévu, ce qui a été fait, ce qu'il faut manger. */
const days = computed(() => Array.from({ length: 7 }, (_, i) => {
  const iso = isoOfDow(i)
  const r = dayFor(iso)
  const recorded = sessionsOn(sessionLog(), iso)
  const burn = !kg.value || bmr.value === null
    ? 0
    : (recorded.length ? dayBurn(recorded, kg.value, bmr.value) : (r.gym ? DEFAULT_BURN : 0))
  const energy = bmr.value !== null && kg.value
    ? dayEnergy({ bmr: bmr.value, kg: kg.value, tt: r.tt, steps: stepsFor(iso), sessionKcal: burn })
    : null
  const idx = indexFor(iso)
  const plan = idx === null ? null : buildDay(idx, burn > 0, library.value, r.menu)
  return {
    i,
    iso,
    name: DAY_NAMES[i],
    resolved: r,
    recorded: recorded.length,
    burn,
    energy,
    plan,
    total: plan ? roundMacros(plan.total).kcal : null,
    lunch: plan?.meals.find(m => m.slot === 'lunch')?.name ?? '',
    dinner: plan?.meals.find(m => m.slot === 'dinner')?.name ?? '',
    isToday: iso === props.todayIso,
  }
}))

const lunches = computed(() => activeRecipes(library.value, 'boite'))
const dinners = computed(() => activeRecipes(library.value, 'diner'))

const edited = computed(() => (editing.value ? days.value.find(d => d.iso === editing.value) ?? null : null))

const weekTitle = computed(() => {
  const d = new Date(monday.value + 'T00:00:00')
  const end = new Date(shiftIso(monday.value, 6) + 'T00:00:00')
  const f = (x: Date) => `${x.getDate()}/${String(x.getMonth() + 1).padStart(2, '0')}`
  return `${f(d)} → ${f(end)}`
})

function setMenu(iso: string, field: 'lunch' | 'dinner', ev: Event) {
  const v = (ev.target as HTMLSelectElement).value
  setOverride(iso, { [field]: v || undefined })
}
</script>

<template>
  <div class="stack">
    <!-- Semaine type -->
    <div v-if="!props.monday" class="card nu-week">
      <div class="row-between">
        <div class="section-label">Ma semaine type</div>
        <button class="btn" @click="resetWeek()">↺ Défaut</button>
      </div>
      <p class="muted mt-6">
        C'est le cadre par défaut : 🏋️ salle, 🏠 télétravail. Les deux sont indépendants —
        un mardi peut être les deux. Tu corriges au jour le jour dans le calendrier
        en dessous, sans toucher à ce réglage.
      </p>
      <div class="nu-weekgrid">
        <div v-for="(n, i) in DAY_NAMES" :key="i" class="nu-weekday">
          <div class="nu-weekday-name mono">{{ n.slice(0, 3) }}</div>
          <button class="nu-chip" :class="{ on: week.gym[i] }" @click="setWeekDay(i, 'gym', !week.gym[i])">🏋️</button>
          <button class="nu-chip tt" :class="{ on: week.tt[i] }" @click="setWeekDay(i, 'tt', !week.tt[i])">🏠</button>
        </div>
      </div>
      <div class="nu-weeklegend">
        <span v-for="(n, i) in DAY_NAMES" :key="i" class="mono">
          {{ n.slice(0, 3) }} · {{ weekLabel(week, i) }}
        </span>
      </div>
    </div>

    <!-- La semaine réelle. Encastré dans le Journal, c'est son calendrier qui pilote. -->
    <div v-if="!props.monday" class="nav-row">
      <button class="btn" @click="offset--">‹ Semaine</button>
      <button class="btn" :class="{ sel: offset === 0 }" @click="offset = 0">{{ weekTitle }}</button>
      <button class="btn" @click="offset++">Semaine ›</button>
    </div>
    <div v-else class="section-label">Nutrition · {{ weekTitle }}</div>

    <div class="card no-pad">
      <div v-for="d in days" :key="d.iso" class="nu-pday" :class="{ now: d.isToday, over: hasOverride(d.iso) }">
        <div class="nu-pday-head">
          <span class="nu-pday-name mono">{{ d.name.slice(0, 3) }} {{ d.iso.slice(8) }}</span>
          <button
            class="nu-mini-btn" :class="{ on: d.resolved.gym }"
            :title="d.resolved.gym ? 'Séance prévue — cliquer pour retirer' : 'Pas de séance — cliquer pour ajouter'"
            @click="setOverride(d.iso, { gym: !d.resolved.gym })"
          >🏋️</button>
          <button
            class="nu-mini-btn tt" :class="{ on: d.resolved.tt }"
            :title="d.resolved.tt ? 'Télétravail — cliquer pour retirer' : 'Sur site — cliquer pour passer en télétravail'"
            @click="setOverride(d.iso, { tt: !d.resolved.tt })"
          >🏠</button>
          <span v-if="d.recorded" class="nu-mini done">✓ {{ d.burn }}</span>
          <span class="flex-1" />
          <span v-if="d.energy" class="nu-pday-kcal mono">{{ d.energy.target }}</span>
          <button class="nu-pday-edit" aria-label="Changer les plats de ce jour" @click="editing = d.iso">🍽</button>
        </div>
        <div v-if="d.plan" class="nu-pday-meals muted">
          {{ d.lunch }} · {{ d.dinner }}
        </div>
      </div>
    </div>
    <p class="muted">
      Touche 🏋️ ou 🏠 pour corriger un jour : ça ne change que ce jour-là, la semaine type
      reste intacte. Le chiffre de droite est la cible recalculée. 🍽 change les plats.
    </p>

    <!-- Exceptions du jour -->
    <transition name="sheet">
      <div v-if="edited" class="sheet-overlay" @click.self="editing = null">
        <div class="sheet">
          <div class="sheet-handle" />
          <div class="sheet-head">
            <div>
              <div class="sheet-title">{{ edited.name }} {{ edited.iso }}</div>
              <div class="muted mono">
                {{ hasOverride(edited.iso) ? 'Exception active' : 'Suit la semaine type' }}
              </div>
            </div>
            <button class="sheet-close" aria-label="Fermer" @click="editing = null">×</button>
          </div>

          <div class="field">
            <span>Déjeuner</span>
            <select :value="edited.resolved.menu.lunch ?? ''" @change="setMenu(edited.iso, 'lunch', $event)">
              <option value="">Celui du cycle ({{ edited.lunch }})</option>
              <option v-for="r in lunches" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>
          <div class="field">
            <span>Dîner</span>
            <select :value="edited.resolved.menu.dinner ?? ''" @change="setMenu(edited.iso, 'dinner', $event)">
              <option value="">Celui du cycle ({{ edited.dinner }})</option>
              <option v-for="r in dinners" :key="r.id" :value="r.id">{{ r.name }}</option>
            </select>
          </div>

          <div v-if="edited.energy" class="nu-energy">
            <span><b>{{ edited.energy.baseKcal }}</b> métabolisme</span>
            <span>+ <b>{{ edited.energy.stepsKcal }}</b> pas</span>
            <span>+ <b>{{ edited.energy.sessionKcal }}</b> séance</span>
            <span>− <b>{{ edited.energy.deficit }}</b> déficit</span>
            <span class="nu-energy-eq">= <b>{{ edited.energy.target }}</b> kcal</span>
          </div>

          <button v-if="hasOverride(edited.iso)" class="btn" @click="clearOverride(edited.iso)">
            ↺ Revenir à la semaine type
          </button>
        </div>
      </div>
    </transition>
  </div>
</template>
