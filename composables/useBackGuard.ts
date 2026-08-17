import { onScopeDispose, watch } from 'vue'
import type { Ref } from 'vue'

// ─────────────────────────────────────────────────────────────────────────────
// Le geste « retour » referme la feuille, il ne quitte pas l'application.
// ─────────────────────────────────────────────────────────────────────────────
//
// Sur Android, /sport est la première page de l'historique de la PWA. Un balayage
// de retour n'a donc rien où revenir : il sort de l'application, purement et
// simplement. Et comme la feuille de séance n'est pas une route mais un état, le
// système n'a aucune raison de croire qu'il interrompt quelque chose — il ferme.
//
// Le procédé est celui des applications natives : on empile une entrée d'historique
// FACTICE tant que la feuille est ouverte. Le retour la consomme, l'application
// reste ouverte, et c'est l'appelant qui décide de ce que « retour » veut dire.
//
// Ici, la bonne réponse n'est PAS une question.
//
// La première version demandait confirmation — « ta séance est en cours, continuer
// ou réduire ? ». Deux défauts, et le second était bloquant. D'abord la question
// n'avait pas lieu d'être : réduire ne perd rien, le brouillon est écrit à chaque
// frappe et la mini-feuille garde la séance sous la main. Ensuite, désarmer la garde
// appelait `history.back()`, ce qui relançait un `popstate` — donc la question, en
// boucle. La feuille se réduisait bien, et la carte restait plantée par-dessus.
//
// D'où cette forme : pas d'état, pas de question. On intercepte, on réarme, on
// délègue. C'est l'appelant qui sait s'il faut simplement replier la feuille ou, en
// pleine modification d'une séance déjà enregistrée, ouvrir la confirmation qui
// existe déjà pour ce cas-là.
//
// Il n'y a PLUS de `beforeunload` non plus. Il avertissait avant un rechargement ou
// une fermeture, pour une perte qui n'arrive pas : le brouillon persiste la séance
// entière — séries, ressentis, notes, machine choisie — et jusqu'à l'identifiant de
// la séance en cours de modification, que `restoreDraft` recharge au démarrage
// suivant. Un avertissement qui protège de rien finit par s'apprendre comme du bruit.

const MARK = 'gr-session-guard'

/**
 * Détourne le geste « retour » tant que `active` est vrai.
 *
 * @param active Feuille ouverte — c'est la seule chose qui mérite qu'on retienne un
 *   geste. Feuille fermée, le retour doit rester le retour : il sort de l'app, et
 *   c'est ce qu'on attend d'un deuxième retour de suite.
 * @param onBack Ce que « retour » déclenche. Appelé APRÈS le réarmement, pour que le
 *   geste suivant soit intercepté lui aussi même si `active` n'a pas changé.
 */
export function useBackGuard(active: Ref<boolean>, onBack: () => void) {
  let armed = false

  const push = () => {
    if (!import.meta.client || armed) return
    history.pushState({ [MARK]: true }, '')
    armed = true
  }

  /** Consomme l'entrée factice si elle est encore là — sans ça, on reculerait d'un
   *  cran de trop la prochaine fois et on quitterait quand même. */
  const disarm = () => {
    if (!armed) return
    armed = false
    if (import.meta.client && (history.state as Record<string, unknown> | null)?.[MARK]) history.back()
  }

  const onPop = () => {
    // Le `history.back()` de `disarm` déclenche lui aussi un `popstate`. Sans cette
    // garde, refermer la feuille rappellerait `onBack`, qui refermerait la feuille…
    if (!active.value) return
    // L'entrée factice vient d'être consommée par le geste : on n'est plus armé.
    armed = false
    // Réarmer AVANT d'agir. Si l'action laisse la feuille ouverte — la confirmation
    // d'abandon en mode modification — le geste suivant doit être intercepté aussi ;
    // si elle la referme, le `watch` désarmera cette entrée toute seule.
    push()
    onBack()
  }

  if (import.meta.client) {
    window.addEventListener('popstate', onPop)
    watch(active, (on) => { on ? push() : disarm() }, { immediate: true })
    onScopeDispose(() => {
      window.removeEventListener('popstate', onPop)
      armed = false
    })
  }
}
