<script setup lang="ts">
import { computed } from 'vue'
import type { Macros, MacroTargets } from '~/lib/nutritionStats'
import { KCAL_G, KCAL_L, KCAL_P, macroGaps } from '~/lib/nutritionStats'

// Détail des écarts par macronutriment. Ouvert en touchant le camembert : le cercle
// dit « de quoi c'est fait », cette feuille dit « ce qu'il manque, et quoi en faire ».
const props = defineProps<{ eaten: Macros, targets: MacroTargets, remaining: number }>()
const emit = defineEmits<{ close: [] }>()

const gaps = computed(() => macroGaps(props.eaten, props.targets))
const eatenKcal = computed(() =>
  Math.round(props.eaten.p * KCAL_P + props.eaten.g * KCAL_G + props.eaten.l * KCAL_L))

const TONE_LABEL = { ok: 'dans la cible', low: 'il en manque', high: 'au-dessus' } as const
</script>

<template>
  <div class="sheet-overlay" @click.self="emit('close')">
    <div class="sheet macro-sheet">
      <div class="sheet-handle" />
      <div class="sheet-head">
        <div>
          <div class="sheet-title">Où j'en suis</div>
          <div class="muted mono">{{ eatenKcal }} kcal sur {{ targets.kcal }}</div>
        </div>
        <button class="sheet-close" aria-label="Fermer" @click="emit('close')">×</button>
      </div>

      <div class="sheet-body">
        <div v-for="g in gaps" :key="g.key" class="ms-row" :class="[g.key, g.tone]">
          <div class="ms-top">
            <span class="ms-name">{{ g.label }}</span>
            <span class="ms-state mono">{{ TONE_LABEL[g.tone] }}</span>
            <span class="ms-num mono"><b>{{ g.eaten }}</b> / {{ g.target }} g</span>
          </div>
          <!-- La barre va jusqu'à 150 % : un dépassement doit se voir dépasser,
               pas se faire écraser contre le bord droit. -->
          <div class="ms-track">
            <div class="ms-ref" />
            <div class="ms-fill" :style="{ width: `${Math.min(100, g.pct / 1.5 * 100)}%` }" />
          </div>
          <div class="ms-foot">
            <span class="mono">{{ g.delta > 0 ? '+' : '' }}{{ g.delta }} g · {{ g.kcal }} kcal</span>
          </div>
          <p class="ms-advice">{{ g.advice }}</p>
        </div>

        <p class="nu-note">
          Protéines et lipides sont des <b>planchers</b>, calculés sur ton poids : l'un
          protège le muscle, l'autre l'équilibre hormonal, et aucun des deux ne se
          négocie quand les calories baissent. Les glucides prennent ce qui reste —
          c'est la variable d'ajustement, et c'est pour ça que le plan ne retire jamais
          que des féculents.
        </p>
        <p class="muted ms-caveat">
          Les tables de composition se trompent couramment de 10 % : un écart de quelques
          grammes n'est pas un signal. Seuls les écarts francs, répétés plusieurs jours,
          valent qu'on change quelque chose.
        </p>
      </div>
    </div>
  </div>
</template>
