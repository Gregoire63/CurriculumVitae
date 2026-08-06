<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { usePhotos } from '~/composables/usePhotos'

// Vignette d'un plat, en lecture seule. Volontairement séparée de `Photo.vue` :
// celui-ci ouvre un sélecteur de fichier et un aperçu plein écran, ce qui n'a rien
// à faire dans un écran où l'on ne fait que cocher des repas.
const props = defineProps<{ id: string, label?: string }>()

const { has, urlOf } = usePhotos()

const url = ref<string | null>(null)
const demo = ref<string | null>(null)

// Même repli que dans la bibliothèque : une illustration livrée plutôt qu'un carré vide.
watch(() => props.id, async (id) => {
  demo.value = `/plats-demo/${id}.webp`
  url.value = has(id) ? await urlOf(id, 'thumb') : null
}, { immediate: true })

const shown = computed(() => url.value ?? demo.value)
</script>

<template>
  <div class="nu-thumb">
    <img v-if="shown" :src="shown" :alt="label ?? ''" loading="lazy" @error="demo = null">
    <span v-else class="nu-thumb-empty">🍽</span>
  </div>
</template>
