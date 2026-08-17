import { onMounted, onUnmounted } from 'vue'
import { useScrollLock } from './useScrollLock'

// ─────────────────────────────────────────────────────────────────────────────
// Ce qui est vrai de TOUT calque posé sur l'application.
// ─────────────────────────────────────────────────────────────────────────────
//
// Une feuille du bas et une carte centrée n'ont ni la même forme ni la même
// arrivée, mais elles partagent trois comportements qu'on ne peut pas dupliquer
// sans les désynchroniser :
//
//   · la page derrière ne défile plus tant qu'un calque est ouvert ;
//   · Échap ferme LE calque du dessus, et lui seul ;
//   · le décompte des deux est le même, puisqu'ils s'empilent l'un sur l'autre.
//
// Le troisième point est la raison d'être de ce fichier. La pile vivait dans
// components/Sheet.vue : une carte ouverte par-dessus une feuille n'y figurait pas,
// donc Échap fermait la feuille du DESSOUS en laissant la carte orpheline, posée
// sur un écran qui avait changé sous elle. Une seule pile, partagée, et l'ordre
// redevient celui qu'on voit.
//
// La pile est déclarée AU NIVEAU DU MODULE, jamais dans la fonction : le corps de
// `useOverlay` est réexécuté à chaque calque monté. Une pile déclarée là-dedans
// donnerait un tableau vide par calque, chacun se croyant seul et donc au sommet —
// c'était exactement le bug d'origine, Échap fermant les deux feuilles d'un coup.

const stack: symbol[] = []

/**
 * Arme un calque : verrou de défilement, place dans la pile, sortie au clavier.
 *
 * @param close Ce que « fermer » veut dire pour ce calque-là. Appelé uniquement si
 *   le calque est au sommet — sinon c'est le calque du dessus qui répond.
 */
export function useOverlay(close: () => void) {
  const id = Symbol('overlay')
  const { lock, unlock } = useScrollLock()

  function onKey(e: KeyboardEvent) {
    if (e.key !== 'Escape') return
    if (stack.at(-1) !== id) return
    // Sans ça, la touche continue sa route et un calque du dessous se ferme aussi.
    e.stopPropagation()
    close()
  }

  onMounted(() => {
    lock()
    stack.push(id)
    // Sur `window` et non sur le calque : le focus peut être n'importe où dedans, et
    // un calque qu'on ne peut pas fermer au clavier est un calque qui piège.
    window.addEventListener('keydown', onKey)
  })

  onUnmounted(() => {
    unlock()
    // `lastIndexOf` et non `indexOf` : deux calques peuvent naître dans le même tick,
    // et c'est la place la plus récente qui est la nôtre.
    const i = stack.lastIndexOf(id)
    if (i >= 0) stack.splice(i, 1)
    window.removeEventListener('keydown', onKey)
  })
}
