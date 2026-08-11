<script setup lang="ts">
import { computed } from 'vue'
import { useNutrition } from '~/composables/useNutrition'
import { expandItems, ingredientLines, keepsOf, macrosOf, roundMacros } from '~/lib/nutritionStats'

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

/**
 * Les ingrédients, sauce comprise, chacun une seule fois.
 *
 * Le citron du dîner poisson apparaissait deux fois — 20 g dans le plat, 10 g dans la
 * sauce — et pareil pour l'ail et les herbes. Devant le frigo, ça oblige à faire
 * l'addition de tête. On additionne ici, et la part sauce reste en annotation.
 */
const lines = computed(() => (recipe.value ? ingredientLines(recipe.value, library.value) : []))
</script>

<template>
  <Sheet v-if="recipe" sheet-class="rs" @close="emit('close')">
      <!-- La photo occupe le bord haut de la feuille et lui sert de poignée : on la
           tire vers le bas pour fermer. Le composant Sheet porte le découpage aux
           coins arrondis et le geste. -->
      <template #cover>
        <NutritionPhoto :id="recipe.id" :label="recipe.name" size="cover" />
      </template>

      <template #head>
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
      </template>

      <template #default>
        <!-- UNE seule liste, sauce comprise. Chaque ingrédient n'y figure qu'une fois,
             avec son total : c'est la réponse à « qu'est-ce que je sors du frigo ».
             La part qui va dans le pot est en annotation, pas sur une deuxième ligne. -->
        <div class="section-label">Ingrédients<template v-if="sauce"> — sauce comprise</template></div>
        <ul class="rs-items">
          <li v-for="l in lines" :key="l.food" class="rs-item">
            <span class="rs-q mono">{{ l.g }} g</span>
            <span class="rs-n">
              {{ foodName(l.food) }}
              <span v-if="l.sauceOnly" class="rs-tag">pour la sauce</span>
              <span v-else-if="l.sauceG" class="rs-tag">dont {{ l.sauceG }} g pour la sauce</span>
              <span v-if="foodBuy(l.food)" class="muted">{{ foodBuy(l.food) }}</span>
            </span>
          </li>
        </ul>
        <p class="muted italic rs-raw">Viandes, poissons et féculents : toujours pesés crus.</p>

        <!-- La sauce se prépare à part, dans un pot : sa préparation mérite son bloc.
             Ses ingrédients, eux, sont déjà dans la liste ci-dessus. -->
        <template v-if="sauce">
          <div class="section-label">{{ sauce.name }}</div>
          <p class="nu-note">{{ sauce.steps }}</p>
          <p v-if="sauceMacros" class="muted mono rs-raw">
            Elle compte pour {{ sauceMacros.kcal }} kcal et {{ sauceMacros.p }} g de protéines,
            déjà inclus dans le total ci-dessus.
          </p>
        </template>

        <div class="section-label">La recette</div>
        <p class="nu-steps rs-steps">{{ recipe.steps }}</p>

        <button class="btn rs-done" @click="emit('close')">Fermer</button>
    </template>
  </Sheet>
</template>
