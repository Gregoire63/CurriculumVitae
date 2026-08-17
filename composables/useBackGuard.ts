import { onScopeDispose, ref, watch } from 'vue'
import type { Ref } from 'vue'

// ─────────────────────────────────────────────────────────────────────────────
// Empêcher le geste « retour » de fermer l'application en pleine séance.
// ─────────────────────────────────────────────────────────────────────────────
//
// Sur Android, /sport est la première page de l'historique de la PWA. Un balayage
// de retour n'a donc rien où revenir : il sort de l'application, purement et
// simplement. Et comme la feuille de séance n'est pas une route mais un état, le
// système n'a aucune raison de croire qu'il interrompt quelque chose — il ferme.
//
// La séance elle-même est sauvegardée en continu, donc rien n'est perdu : elle se
// rouvre au lancement suivant. Mais c'est un détail qu'on ignore au moment où
// l'écran devient noir, un pied sous la barre. Ce qu'on veut, c'est que le geste ne
// surprenne pas.
//
// Le procédé est celui des applications natives : on empile une entrée d'historique
// FACTICE dès que la séance démarre. Le premier retour la consomme — l'application
// reste ouverte, et on demande confirmation. On réempile aussitôt, pour que le
// deuxième retour soit intercepté lui aussi ; sinon la question ne serait posée
// qu'une fois, et le geste réflexe qui suit ferait exactement ce qu'on voulait
// éviter.
//
// `beforeunload` couvre l'autre porte — rechargement, fermeture d'onglet — mais pas
// toutes : en mode autonome sur iOS, le navigateur ne le déclenche pas toujours. Il
// vient en complément, jamais en remplacement.

export interface BackGuard {
  /** Une sortie a été tentée : l'écran doit demander confirmation. */
  asking: Ref<boolean>
  /** L'utilisateur reste : on referme la question et on réarme la garde. */
  stay: () => void
  /** L'utilisateur assume : on désarme et on exécute l'action de sortie. */
  leave: (then: () => void) => void
}

const MARK = 'gr-session-guard'

/**
 * Arme la garde tant que `active` est vrai.
 *
 * @param active Séance en cours — c'est la seule chose qui mérite qu'on retienne
 *   un geste de l'utilisateur. Hors séance, le retour doit rester le retour.
 */
export function useBackGuard(active: Ref<boolean>): BackGuard {
  const asking = ref(false)
  let armed = false

  const push = () => {
    if (!import.meta.client || armed) return
    history.pushState({ [MARK]: true }, '')
    armed = true
  }

  /** Consomme l'entrée factice si elle est encore là — sans elle, on reculerait
   *  d'un cran de trop et on quitterait quand même. */
  const disarm = () => {
    if (!armed) return
    armed = false
    if (import.meta.client && (history.state as Record<string, unknown> | null)?.[MARK]) history.back()
  }

  const onPop = () => {
    if (!active.value) return
    // L'entrée factice vient d'être consommée par le geste : on n'est plus armé.
    armed = false
    asking.value = true
    // Réarmer tout de suite, sinon le retour suivant sortirait pour de bon.
    push()
  }

  const onUnload = (e: BeforeUnloadEvent) => {
    if (!active.value) return
    e.preventDefault()
    // Les navigateurs affichent leur propre texte ; la valeur ne sert qu'aux plus anciens.
    e.returnValue = ''
  }

  if (import.meta.client) {
    window.addEventListener('popstate', onPop)
    window.addEventListener('beforeunload', onUnload)
    watch(active, (on) => { on ? push() : disarm() }, { immediate: true })
    onScopeDispose(() => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('beforeunload', onUnload)
      armed = false
    })
  }

  return {
    asking,
    stay: () => { asking.value = false; push() },
    leave: (then: () => void) => {
      asking.value = false
      disarm()
      then()
    },
  }
}
