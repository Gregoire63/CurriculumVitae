<template>
  <div class="language-selector">
    <div class="flag" :class="{ flipped: frSelect }">
      <img
        v-if="frSelect"
        src="@/assets/lang/fr.png"
        alt="Francais"
        class="langCircle"
        @click="_SiteStore.setLangage('en')"
        :style="`border: 2px solid #4E4E50;`"
      />
      <img
        v-else
        src="@/assets/lang/ang.png"
        alt="English"
        class="langCircle"
        @click="_SiteStore.setLangage('fr')"
        :style="`border: 2px solid #4E4E50;`"
      />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { SiteStore } from '../../stores/Site'

const darkActive = computed(() => SiteStore().getDarkTheme)
const _SiteStore = SiteStore()
const frSelect = computed(() => {
  return _SiteStore.getLangage == 'fr'
})
</script>

<style scoped>
.language-selector {
  width: 20px;
  height: 20px;
  cursor: pointer;
  perspective: 800px;
}

.flag {
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
  transition: transform 0.5s;
  transform-origin: center;
}

.flipped {
  transform: rotateY(180deg);
}

.langCircle {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border-color: var(--primary);
  object-fit: cover;
}
</style>
