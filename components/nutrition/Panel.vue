<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useNutrition } from '~/composables/useNutrition'
import { usePhotos } from '~/composables/usePhotos'
import { isoOf } from '~/utils/sportStats'

// Onglet « Nutrition » : deux destinations, pas plus.
//
// Il y en avait cinq (Jour, Plats, Courses, Cuisine, Corps) et on s'y perdait. Elles
// ne répondaient pourtant qu'à trois besoins, à trois rythmes différents :
//  - tous les jours, manger → parti sur l'accueil, en feuille : c'est une action,
//    pas une destination, exactement comme démarrer une séance ;
//  - toutes les semaines, acheter puis cuisiner → « Cuisine », dans cet ordre,
//    parce que c'est une séquence et non deux sujets ;
//  - de temps en temps, régler les plats → « Plats ».
// Le suivi du corps, lui, est parti dans Rapport.
const props = defineProps<{ todayIso: string | null }>()

const { hydrate } = useNutrition()
// Les photos vivent dans IndexedDB : on ne charge ici que leurs métadonnées,
// jamais les blobs (chaque vignette est lue à la demande par le composant Photo).
const { hydrate: hydratePhotos } = usePhotos()

type Sub = 'cuisine' | 'plats'
const SUBS: { id: Sub, icon: string, label: string, hint: string }[] = [
  { id: 'cuisine', icon: '🛒', label: 'Cuisine', hint: 'Courses puis préparation' },
  { id: 'plats', icon: '📖', label: 'Plats', hint: 'Recettes, aliments, micros' },
]
const sub = ref<Sub>('cuisine')

const iso = computed(() => props.todayIso ?? isoOf(new Date()))

onMounted(() => {
  hydrate()
  hydratePhotos()
})
</script>

<template>
  <div class="nu-panel">
    <nav class="nu-subnav">
      <button
        v-for="s in SUBS" :key="s.id"
        class="nu-subtab wide" :class="{ active: sub === s.id }"
        @click="sub = s.id"
      >
        <span class="nu-sub-icon">{{ s.icon }}</span>
        <span class="nu-sub-label mono">{{ s.label }}</span>
        <span class="nu-sub-hint">{{ s.hint }}</span>
      </button>
    </nav>

    <!-- Courses puis préparation, empilés dans l'ordre où on les fait : on achète
         samedi, on cuisine dimanche. Deux sous-onglets auraient coupé en deux un
         geste qui n'en est qu'un. -->
    <template v-if="sub === 'cuisine'">
      <NutritionShopping :today-iso="iso" />
      <NutritionBatch :today-iso="iso" />
    </template>
    <NutritionLibrary v-else />
  </div>
</template>
