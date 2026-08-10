<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useNutrition } from '~/composables/useNutrition'
import { expandItems, keepsOf, macrosOf, roundMacros } from '~/lib/nutritionStats'
import { useScrollLock } from '~/composables/useScrollLock'

// LA fiche d'un plat : photo, ingrédients, recette. Une seule, ouverte depuis
// n'importe quelle carte de l'application.
//
// Il y en avait une version réduite recopiée dans la journée, et les cartes de la
// bibliothèque ne s'ouvraient pas du tout : on lisait trois lignes d'ingrédients
// tronquées et il fallait passer par le bouton « modifier » pour voir la recette —
// c'est-à-dire ouvrir un formulaire d'édition pour lire un mode d'emploi.
const props = defineProps<{ id: string }>()
const emit = defineEmits<{ close: [] }>()

const { library } = useNutrition()

const KIND_LABELS: Record<string, string> = {
  pdj: 'Petit-déjeuner',
  boite: 'Déjeuner (boîte)',
  diner: 'Dîner',
  collation: 'Collation',
  sauce: 'Sauce / condiment',
}

const recipe = computed(() => library.value.recipes[props.id] ?? null)
const sauce = computed(() => {
  const sid = recipe.value?.sauce
  return sid ? library.value.recipes[sid] ?? null : null
})
const foodName = (id: string) => library.value.foods[id]?.name ?? id
const foodBuy = (id: string) => library.value.foods[id]?.buy ?? ''

/** Macros du plat TEL QU'IL SE MANGE, sauce comprise : c'est ce qu'on avale. */
const macros = computed(() => (recipe.value
  ? roundMacros(macrosOf(expandItems(recipe.value, library.value), library.value.foods))
  : null))
const sauceMacros = computed(() => (sauce.value
  ? roundMacros(macrosOf(sauce.value.items, library.value.foods))
  : null))
const keeps = computed(() => (recipe.value ? keepsOf(recipe.value, library.value) : null))

// La page derrière ne doit pas bouger pendant qu'on lit cette feuille.
const { lock, unlock } = useScrollLock()
onMounted(lock)
onUnmounted(unlock)
</script>

<template>
  <div class="sheet-overlay" @click.self="emit('close')">
    <div v-if="recipe" class="sheet rs">
      <div class="sheet-handle" />

      <!-- La photo en premier, pleine largeur : c'est elle qu'on cherche quand on
           ouvre une fiche, et c'est aussi le seul endroit où l'on peut en prendre
           une sans passer par l'éditeur. -->
      <div class="rs-cover">
        <NutritionPhoto :id="recipe.id" :label="recipe.name" size="cover" />
      </div>

      <div class="sheet-head">
        <div>
          <div class="rs-kind mono">
            {{ KIND_LABELS[recipe.kind] ?? recipe.kind }}
            <template v-if="recipe.batch"> · se prépare à l'avance</template>
          </div>
          <div class="sheet-title">{{ recipe.name }}</div>
          <div v-if="macros" class="muted mono">
            {{ macros.kcal }} kcal · {{ macros.p }} P / {{ macros.g }} G / {{ macros.l }} L
            <template v-if="keeps"> · se garde {{ keeps }} j au frigo</template>
          </div>
        </div>
        <button class="sheet-close" aria-label="Fermer" @click="emit('close')">×</button>
      </div>

      <div class="sheet-body">
        <div class="section-label">Ingrédients</div>
        <ul class="rs-items">
          <li v-for="it in recipe.items" :key="it.food" class="rs-item">
            <span class="rs-q mono">{{ it.g }} g</span>
            <span class="rs-n">
              {{ foodName(it.food) }}
              <span v-if="foodBuy(it.food)" class="muted">{{ foodBuy(it.food) }}</span>
            </span>
          </li>
        </ul>
        <p class="muted italic rs-raw">Viandes, poissons et féculents : toujours pesés crus.</p>

        <!-- La sauce est une recette à part — elle se prépare dans un pot — mais ses
             calories sont déjà comptées ci-dessus. Il faut donc la voir ici. -->
        <template v-if="sauce">
          <div class="section-label">Avec {{ sauce.name.toLowerCase() }}</div>
          <ul class="rs-items">
            <li v-for="it in sauce.items" :key="it.food" class="rs-item">
              <span class="rs-q mono">{{ it.g }} g</span>
              <span class="rs-n">{{ foodName(it.food) }}</span>
            </li>
          </ul>
          <p class="nu-note">{{ sauce.steps }}</p>
          <p v-if="sauceMacros" class="muted mono rs-raw">
            La sauce compte pour {{ sauceMacros.kcal }} kcal et {{ sauceMacros.p }} g de protéines,
            déjà inclus dans le total ci-dessus.
          </p>
        </template>

        <div class="section-label">La recette</div>
        <p class="nu-steps rs-steps">{{ recipe.steps }}</p>

        <button class="btn rs-done" @click="emit('close')">Fermer</button>
      </div>
    </div>
  </div>
</template>
