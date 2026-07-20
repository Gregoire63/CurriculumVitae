<script setup lang="ts">
import { MUSCLE_PATHS_FRONT, MUSCLE_PATHS_BACK } from '~/data/sportProgram'

defineProps<{ muscles: string[] }>()

const views = [
  { label: 'Face', paths: MUSCLE_PATHS_FRONT },
  { label: 'Dos', paths: MUSCLE_PATHS_BACK },
]
</script>

<template>
  <div class="muscle-map">
    <div v-for="v in views" :key="v.label" class="silhouette">
      <svg viewBox="0 0 100 140" width="86" height="120" aria-hidden="true">
        <circle cx="50" cy="14" r="9" fill="#d9cbb4" />
        <path d="M33,28 Q50,22 67,28 L64,60 Q62,80 60,80 L62,108 L58,132 L52,132 L51,108 L49,108 L48,132 L42,132 L38,108 L40,80 Q38,80 36,60 Z" fill="#d9cbb4" />
        <path d="M22,29 L17,74 L24,76 L31,42 Z" fill="#d9cbb4" />
        <path d="M78,29 L83,74 L76,76 L69,42 Z" fill="#d9cbb4" />
        <template v-for="(d, m) in v.paths" :key="m">
          <path v-if="muscles.includes(m as string)" :d="d" fill="#b5502f" opacity="0.95" />
        </template>
      </svg>
      <div class="silhouette-label">{{ v.label }}</div>
    </div>
  </div>
</template>

<style scoped>
.muscle-map {
  display: flex;
  gap: 12px;
  justify-content: center;
  background: var(--bg-secondary);
  border: 1px solid var(--bg-accent);
  border-radius: 12px;
  padding: 10px 6px;
}
.silhouette { text-align: center; }
.silhouette-label {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-muted);
  letter-spacing: 0.1em;
  text-transform: uppercase;
}
</style>
