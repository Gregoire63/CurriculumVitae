<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePhotos } from '~/composables/usePhotos'
import type { PhotoKind } from '~/composables/usePhotos'

// Vignette d'un plat, en lecture seule. Volontairement séparée de `Photo.vue` :
// celui-ci ouvre un sélecteur de fichier et un aperçu plein écran, ce qui n'a rien
// à faire dans un écran où l'on ne fait que cocher des repas.
//
// La taille demandée est un PARAMÈTRE, et ce n'est pas un détail : ce composant
// servait la vignette de 192 px partout, y compris en couverture de carte sur 340 px
// de large. C'était toute l'explication du flou — pas la compression, mais l'image
// servie à la mauvaise taille.
const props = withDefaults(defineProps<{ id: string, label?: string, variant?: PhotoKind }>(), {
  label: '',
  variant: 'thumb',
})

const { has, urlOf } = usePhotos()

const url = ref<string | null>(null)

// Aucune illustration de repli : une image floue « qui situe le plat » se lit comme
// une photo ratée. Une place vide dit la vérité — il n'y a pas encore de photo.
watch(() => [props.id, props.variant] as const, async ([id, variant]) => {
  url.value = has(id) ? await urlOf(id, variant) : null
}, { immediate: true })

const shown = computed(() => url.value)
</script>

<template>
  <div class="nu-thumb">
    <img v-if="shown" :src="shown" :alt="label ?? ''" loading="lazy">
    <span v-else class="nu-thumb-empty">🍽</span>
  </div>
</template>
