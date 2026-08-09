<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useScrollLock } from '~/composables/useScrollLock'
// Feuille « mes repas ». Même geste que pour une séance : on ouvre, on coche, on
// ferme. L'alimentation du jour n'a pas besoin d'un onglet permanent — c'est une
// action, pas une destination, et elle se déclenche depuis l'accueil.
//
// Elle ne porte QUE les repas : le télétravail se règle dans le planning, et la
// photo d'un plat se prend dans la bibliothèque. Ici on ne fait que manger.
defineProps<{ todayIso: string }>()
const emit = defineEmits<{ close: [] }>()

// La page derrière ne doit pas bouger pendant qu'on lit cette feuille.
const { lock, unlock } = useScrollLock()
onMounted(lock)
onUnmounted(unlock)
</script>

<template>
  <div class="sheet-overlay" @click.self="emit('close')">
    <div class="sheet eat-sheet">
      <div class="sheet-handle" />
      <div class="sheet-head">
        <div>
          <div class="sheet-title">Mes repas</div>
          <div class="muted mono">Coche au fur et à mesure</div>
        </div>
        <button class="sheet-close" aria-label="Fermer" @click="emit('close')">×</button>
      </div>
      <div class="sheet-body">
        <NutritionDay :today-iso="todayIso" />
      </div>
    </div>
  </div>
</template>
