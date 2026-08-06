<script setup lang="ts">
import { computed, ref } from 'vue'
import { CYCLE_LENGTH, FOOD_BY_ID } from '~/data/nutritionProgram'
import { useNutrition } from '~/composables/useNutrition'
import type { DayPlan } from '~/utils/nutritionStats'
import { DAY_NAMES, DEFAULT_TRAINED, buildDay, roundMacros } from '~/utils/nutritionStats'

// Vue « Plan » : les 14 jours du cycle d'un coup d'œil, pour se projeter et faire
// les courses. Le jour en cours est repéré à partir de la date de démarrage.
const props = defineProps<{ todayIso: string }>()

const { indexFor } = useNutrition()

const current = computed(() => indexFor(props.todayIso))
const selected = ref<number | null>(null)

const days = computed(() => Array.from({ length: CYCLE_LENGTH }, (_, i) => {
  const trained = DEFAULT_TRAINED(i)
  const plan = buildDay(i, trained)
  return {
    i,
    week: Math.floor(i / 7) + 1,
    name: DAY_NAMES[i % 7],
    trained,
    total: roundMacros(plan.total),
    lunch: plan.meals.find(m => m.slot === 'lunch')?.name ?? '',
    dinner: plan.meals.find(m => m.slot === 'dinner')?.name ?? '',
    plan,
  }
}))

const detail = computed<DayPlan | null>(() => (selected.value === null ? null : days.value[selected.value].plan))
const detailLabel = computed(() => (selected.value === null ? '' : `${days.value[selected.value].name} · semaine ${days.value[selected.value].week}`))

const gymAvg = computed(() => {
  const g = days.value.filter(d => d.trained)
  return Math.round(g.reduce((s, d) => s + d.total.kcal, 0) / g.length)
})
const restAvg = computed(() => {
  const r = days.value.filter(d => !d.trained)
  return Math.round(r.reduce((s, d) => s + d.total.kcal, 0) / r.length)
})
const avg = computed(() => Math.round(days.value.reduce((s, d) => s + d.total.kcal, 0) / days.value.length))
const protAvg = computed(() => Math.round(days.value.reduce((s, d) => s + d.total.p, 0) / days.value.length))

const foodName = (id: string) => FOOD_BY_ID[id]?.name ?? id
</script>

<template>
  <div class="stack">
    <div class="stat-grid">
      <div class="stat">
        <div class="stat-v">{{ gymAvg }}<span class="stat-u">kcal</span></div>
        <div class="stat-l">Moyenne jour de salle</div>
      </div>
      <div class="stat">
        <div class="stat-v">{{ restAvg }}<span class="stat-u">kcal</span></div>
        <div class="stat-l">Moyenne jour de repos</div>
      </div>
      <div class="stat">
        <div class="stat-v">{{ avg }}<span class="stat-u">kcal</span></div>
        <div class="stat-l">Moyenne sur 14 jours</div>
      </div>
      <div class="stat">
        <div class="stat-v pos">{{ protAvg }}<span class="stat-u">g</span></div>
        <div class="stat-l">Protéines par jour</div>
      </div>
    </div>

    <template v-for="w in [1, 2]" :key="w">
      <div class="section-label">Semaine {{ w }}</div>
      <div class="card no-pad">
        <button
          v-for="d in days.filter(x => x.week === w)" :key="d.i"
          class="nu-row" :class="{ rest: !d.trained, now: d.i === current }"
          @click="selected = d.i"
        >
          <span class="nu-row-day">{{ d.name.slice(0, 3) }}</span>
          <span class="nu-row-meals">
            <span>{{ d.lunch }}</span>
            <span class="muted">{{ d.dinner }}</span>
          </span>
          <span class="nu-row-kcal mono">{{ d.total.kcal }}</span>
        </button>
      </div>
    </template>

    <p class="muted">
      Les jours sans séance sont grisés : mêmes protéines, mêmes légumes, féculents réduits
      de 30 %. Touche un jour pour voir le détail des repas.
    </p>

    <transition name="sheet">
      <div v-if="detail" class="sheet-overlay" @click.self="selected = null">
        <div class="sheet">
          <div class="sheet-handle" />
          <div class="sheet-head">
            <div>
              <div class="sheet-title">{{ detailLabel }}</div>
              <div class="muted mono">
                {{ roundMacros(detail.total).kcal }} kcal ·
                {{ roundMacros(detail.total).p }} P / {{ roundMacros(detail.total).g }} G / {{ roundMacros(detail.total).l }} L
              </div>
            </div>
            <button class="sheet-close" aria-label="Fermer" @click="selected = null">×</button>
          </div>
          <div class="sheet-body">
            <div v-for="m in detail.meals" :key="m.slot" class="nu-detail">
              <div class="row-between">
                <strong>{{ m.time }} · {{ m.name }}</strong>
                <span class="mono muted">{{ Math.round(m.macros.kcal) }} kcal</span>
              </div>
              <div class="muted">{{ m.items.map(i => `${foodName(i.food)} ${i.g} g`).join(' · ') }}</div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>
