<script setup lang="ts">
import { computed } from 'vue'
import { BATCH_SESSIONS, GYM_BAG } from '~/data/nutritionProgram'
import { useNutrition } from '~/composables/useNutrition'
import type { PrepMode } from '~/lib/nutritionStats'
import { DAY_NAMES, PREP_LABELS, buildDay, mondayOf } from '~/lib/nutritionStats'
import { shiftIso } from '~/utils/sportStats'

// Onglet « Cuisine » : les deux sessions de batch cooking en todo, les recettes à
// préparer pour les jours couverts, et le démarrage du plan (qui ancre le cycle).
const props = defineProps<{ todayIso: string }>()

const { indexFor, isBatchDone, toggleBatch, resetBatch, prepMode, setPrepMode, library } = useNutrition()

const weekIso = computed(() => mondayOf(props.todayIso))
// Les tâches se cochent semaine par semaine : la clé porte le lundi courant.
const key = (sessionId: string, i: number) => `${weekIso.value}:${sessionId}:${i}`

/** Jours couverts par une session : dimanche → lun-mer, mercredi → jeu-dim. */
const COVERED: Record<string, number[]> = { dim: [0, 1, 2], mer: [3, 4, 5, 6] }

const PREP_MODES: PrepMode[] = ['separate', 'assembled']

/**
 * Recettes à préparer, avec le nombre de portions.
 * Les quantités sont TOUJOURS celles d'un jour avec séance : on peut laisser du riz
 * dans une boîte, on ne peut pas y ajouter celui qu'on n'a pas cuit.
 */
function recipesFor(sessionId: string) {
  const counts = new Map<string, number>()
  for (const offset of COVERED[sessionId] ?? []) {
    const iso = shiftIso(weekIso.value, offset)
    const day = buildDay(indexFor(iso), true, library.value)
    for (const meal of day.meals) {
      const r = library.value.recipes[meal.recipeId]
      if (!r?.batch) continue
      counts.set(r.id, (counts.get(r.id) ?? 0) + 1)
    }
  }
  return [...counts.entries()].map(([id, n]) => ({ recipe: library.value.recipes[id], portions: n }))
}

/** Dîners à cuisiner le soir même — ils ne se batchent pas. */
function freshFor(sessionId: string) {
  const out: { day: string, name: string }[] = []
  for (const offset of COVERED[sessionId] ?? []) {
    const iso = shiftIso(weekIso.value, offset)
    const dinner = buildDay(indexFor(iso), true, library.value).meals.find(m => m.slot === 'dinner')
    if (!dinner) continue
    const r = library.value.recipes[dinner.recipeId]
    if (r?.batch) continue
    out.push({ day: DAY_NAMES[offset], name: dinner.name })
  }
  return out
}

const sessions = computed(() => BATCH_SESSIONS.map(s => ({
  ...s,
  recipes: recipesFor(s.id),
  fresh: freshFor(s.id),
  done: s.tasks.filter((_, i) => isBatchDone(key(s.id, i))).length,
})))
</script>

<template>
  <div class="stack">
    <div class="card nu-prep">
      <div class="section-label">Comment tu prépares</div>
      <div class="nav-row mt-6">
        <button
          v-for="m in PREP_MODES" :key="m"
          class="btn" :class="{ sel: prepMode === m }"
          @click="setPrepMode(m)"
        >
          {{ PREP_LABELS[m] }}
        </button>
      </div>
      <p v-if="prepMode === 'separate'" class="nu-note">
        Le mode le plus souple : le riz et les pommes de terre cuisent en vrac dans un grand
        plat, et tu pèses ta portion en remplissant la boîte. C'est ce qui permet d'ajuster
        au gramme selon la séance que tu viens de faire.
      </p>
      <p v-else class="nu-note">
        <b>Tout est assemblé d'avance.</b> Les portions sont alors figées : impossible de
        repeser au moment de manger. L'appli change donc de consigne — elle te dira quoi
        <b>laisser dans la boîte</b> ou quoi supprimer du menu, plutôt qu'un poids à viser.
      </p>
    </div>

    <div v-if="prepMode === 'assembled'" class="card nu-warn">
      <div class="section-label">La règle qui change tout</div>
      <p class="nu-note">
        <b>Portionne toujours sur la version « jour avec séance »</b>, celle qui est affichée
        ci-dessous. Le week-end tu ne sais pas encore quelles séances tu feras : si tu prépares
        les petites portions et que la séance a bien lieu, tu ne peux rien rajouter à une boîte
        déjà fermée. Dans l'autre sens, laisser un tiers du riz dans la boîte ne coûte rien.
      </p>
      <p class="nu-note">
        Deuxième réflexe : <b>garde l'huile, le pain et les collations à part</b>. Ce sont les
        seuls leviers qui restent quand le reste est figé, et chacun vaut 70 à 100 kcal.
      </p>
    </div>

    <div v-for="s in sessions" :key="s.id" class="card nu-batch">
      <div class="row-between">
        <div>
          <div class="section-label">{{ s.when }}</div>
          <div class="muted">{{ s.duration }} · couvre {{ s.covers }}</div>
        </div>
        <span class="nu-count mono">{{ s.done }}/{{ s.tasks.length }}</span>
      </div>

      <div class="nu-tasks">
        <label v-for="(t, i) in s.tasks" :key="i" class="nu-task" :class="{ done: isBatchDone(key(s.id, i)) }">
          <input type="checkbox" :checked="isBatchDone(key(s.id, i))" @change="toggleBatch(key(s.id, i))">
          <span>{{ t }}</span>
        </label>
      </div>

      <template v-if="s.recipes.length">
        <div class="nu-sub">Recettes à préparer · portions « jour avec séance »</div>
        <div v-for="r in s.recipes" :key="r.recipe.id" class="nu-recipe">
          <div class="row-between">
            <strong class="flex-1">{{ r.recipe.name }}</strong>
            <span class="mono">× {{ r.portions }}</span>
            <!-- Le moment naturel pour la photo : le plat sort de la casserole. -->
            <NutritionPhoto :id="r.recipe.id" :label="r.recipe.name" />
          </div>
          <p class="nu-steps">{{ r.recipe.steps }}</p>
        </div>
      </template>

      <template v-if="s.fresh.length">
        <div class="nu-sub">À cuisiner le soir même</div>
        <div v-for="(f, i) in s.fresh" :key="i" class="nu-fresh">
          <span class="mono">{{ f.day }}</span><span>{{ f.name }}</span>
        </div>
      </template>

      <button class="btn mt-6" @click="resetBatch(`${weekIso}:${s.id}:`)">↺ Réinitialiser cette session</button>
    </div>

    <div class="card nu-bag">
      <div class="section-label">Sac de sport — chaque matin de séance</div>
      <ul class="nu-bag-list">
        <li v-for="(b, i) in GYM_BAG" :key="i">{{ b }}</li>
      </ul>
      <p class="muted">
        Si l'un des trois manque, la journée se décale — et un déjeuner improvisé après une
        séance, c'est systématiquement ~300 kcal de plus que prévu.
      </p>
    </div>

  </div>
</template>
