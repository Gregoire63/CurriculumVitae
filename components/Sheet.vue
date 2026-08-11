<script lang="ts">
/**
 * Pile des feuilles ouvertes.
 *
 * Elle est dans un bloc `<script>` CLASSIQUE et non dans `<script setup>`, et c'est
 * tout l'intérêt : le corps d'un `<script setup>` est compilé en fonction `setup()`,
 * donc réexécuté à chaque instance. Une pile déclarée là-bas donnerait un tableau
 * vide par feuille — ce qui était exactement le bug : Échap fermait les DEUX feuilles
 * empilées d'un coup, chacune se croyant seule et donc au sommet.
 *
 * Ici, le module n'est évalué qu'une fois : toutes les instances partagent la pile,
 * et seule celle du dessus répond à Échap.
 */
const stack: symbol[] = []
export default {}
</script>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useScrollLock } from '~/composables/useScrollLock'
import { useSheetDrag } from '~/composables/useSheetDrag'

// LA feuille de l'application. Une seule.
//
// Il y en avait sept copies : même balisage, même verrou de défilement, même bouton
// de fermeture, recopiés à la main. Chaque correction devait donc être faite sept
// fois — et ne l'était jamais complètement. La touche Échap ne fermait qu'une feuille
// sur sept, le geste de glissement une seule, et l'ascenseur qui débordait du coin
// arrondi a été corrigé une première fois sur une seule d'entre elles.
//
// Ce composant porte tout ce qui doit être vrai partout :
//   · le voile, et la fermeture au clic à côté ;
//   · le verrou de défilement de la page derrière (compteur, pour les feuilles
//     empilées — une fiche de plat par-dessus la feuille des repas) ;
//   · la touche Échap ;
//   · la poignée, et le glissement vers le bas pour fermer ;
//   · l'en-tête collant avec titre, sous-titre et croix.
//
// Ce qu'il ne porte PAS : le contenu, évidemment, mais aussi tout en-tête qui sort de
// « titre + sous-titre ». Le slot `head` est là pour ça.
const props = withDefaults(defineProps<{
  title?: string
  subtitle?: string
  /** Classe ajoutée à la feuille, pour les styles propres à un écran (`rs`, `day-sheet`…). */
  sheetClass?: string
  /** Cache la poignée quand un visuel occupe déjà le bord haut — la fiche d'un plat. */
  bare?: boolean
  /** Désactive la fermeture au clic sur le voile. À réserver aux formulaires en cours de saisie. */
  persistent?: boolean
}>(), { bare: false, persistent: false })

const emit = defineEmits<{ close: [] }>()

const close = () => emit('close')

// La page derrière ne doit pas bouger pendant qu'on lit la feuille.
const { lock, unlock } = useScrollLock()

/**
 * Glisser vers le bas pour fermer. La zone de préhension est la poignée — ou le slot
 * `cover` quand il y en a un, ce qui donne la photo d'un plat.
 *
 * Jamais le corps : il défile, et deux gestes verticaux concurrents sur la même
 * surface, c'est la garantie qu'aucun des deux ne marche.
 */
const drag = useSheetDrag(close)

const id = Symbol('sheet')

function onKey(e: KeyboardEvent) {
  if (e.key !== 'Escape') return
  // Seule la feuille du dessus se ferme.
  if (stack.at(-1) !== id) return
  e.stopPropagation()
  close()
}

onMounted(() => {
  lock()
  stack.push(id)
  // Sur `window` et non sur la feuille : le focus peut être n'importe où dedans, et
  // une feuille qu'on ne peut pas fermer au clavier est une feuille qui piège.
  window.addEventListener('keydown', onKey)
})
onUnmounted(() => {
  unlock()
  const i = stack.lastIndexOf(id)
  if (i >= 0) stack.splice(i, 1)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="sheet-overlay" @click.self="persistent || close()">
    <div
      class="sheet" :class="[sheetClass, { dragging: drag.dragging.value }]"
      role="dialog" aria-modal="true"
      :style="{ transform: drag.offset.value ? `translateY(${drag.offset.value}px)` : undefined }"
    >
      <!-- Un visuel qui occupe le bord haut : il sert aussi de poignée. -->
      <div
        v-if="$slots.cover" class="sheet-cover"
        @pointerdown="drag.start" @pointermove="drag.move"
        @pointerup="drag.end" @pointercancel="drag.cancel"
      >
        <slot name="cover" />
        <div class="sheet-handle sheet-handle-over" />
      </div>

      <div
        v-else-if="!bare" class="sheet-grip"
        @pointerdown="drag.start" @pointermove="drag.move"
        @pointerup="drag.end" @pointercancel="drag.cancel"
      >
        <div class="sheet-handle" />
      </div>

      <div class="sheet-head">
        <slot name="head">
          <div>
            <div class="sheet-title">
              {{ title }}<slot name="title-extra" />
            </div>
            <div v-if="subtitle" class="muted mono">{{ subtitle }}</div>
          </div>
        </slot>
        <button class="sheet-close" aria-label="Fermer" @click="close">×</button>
      </div>

      <div class="sheet-body">
        <slot />
      </div>

      <slot name="after" />
    </div>
  </div>
</template>
