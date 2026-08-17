import { afterEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { useBackGuard } from '../../composables/useBackGuard'

// Le geste « retour » ne se teste pas à l'écran : il n'a pas d'apparence. Ce qui se
// teste, c'est QUI est prévenu, COMBIEN DE FOIS, et ce qu'il reste dans l'historique.
//
// Le bug qui a motivé cette réécriture était exactement là. Refermer la feuille
// désarme la garde, et désarmer appelle `history.back()` — qui déclenche un second
// `popstate`. Sans garde, ce second passage rappelait l'action, qui refermait, qui
// désarmait… La feuille se repliait bien, et la carte de confirmation restait plantée
// par-dessus, impossible à fermer. C'est le troisième test de ce fichier.

const scopes: ReturnType<typeof effectScope>[] = []

/** Monte la garde dans une portée jetable, comme le ferait un composant. */
function monte(active: ReturnType<typeof ref<boolean>>, onBack: () => void) {
  const scope = effectScope()
  scopes.push(scope)
  scope.run(() => useBackGuard(active as never, onBack))
  return scope
}

/** Un vrai `popstate`, celui que le système envoie au balayage arrière. */
const retour = async () => {
  window.dispatchEvent(new PopStateEvent('popstate', { state: history.state }))
  await nextTick()
}

afterEach(() => {
  while (scopes.length) scopes.pop()!.stop()
})

describe('la garde de retour', () => {
  it('empile une entrée factice dès que la feuille est ouverte', async () => {
    const active = ref(true)
    monte(active, () => {})
    await nextTick()

    expect(history.state?.['gr-session-guard']).toBe(true)
  })

  it('n’empile rien tant que la feuille est fermée', async () => {
    history.replaceState(null, '')
    const active = ref(false)
    monte(active, () => {})
    await nextTick()

    expect(history.state?.['gr-session-guard']).toBeUndefined()
  })

  it('délègue le geste à l’appelant, une seule fois', async () => {
    const active = ref(true)
    const onBack = vi.fn()
    monte(active, onBack)
    await nextTick()

    await retour()

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  /**
   * LA régression. L'action referme la feuille ; le désarmement qui suit provoque un
   * second `popstate`. Il ne doit rien relancer.
   */
  it('ne se rappelle pas elle-même quand l’action referme la feuille', async () => {
    const active = ref(true)
    const onBack = vi.fn(() => { active.value = false })
    monte(active, onBack)
    await nextTick()

    await retour()
    // Le désarmement passe par `history.back()`, donc par un `popstate` de plus.
    await retour()
    await retour()

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  /**
   * Le cas modification : l'action ouvre une confirmation et LAISSE la feuille
   * ouverte. Le geste suivant doit être intercepté lui aussi — sinon la deuxième
   * pression sort de l'application, ce que la garde était censée empêcher.
   */
  it('se réarme quand l’action laisse la feuille ouverte', async () => {
    const active = ref(true)
    const onBack = vi.fn()
    monte(active, onBack)
    await nextTick()

    await retour()
    expect(history.state?.['gr-session-guard']).toBe(true)

    await retour()
    expect(onBack).toHaveBeenCalledTimes(2)
  })

  it('ignore le geste une fois la feuille refermée', async () => {
    const active = ref(true)
    const onBack = vi.fn()
    monte(active, onBack)
    await nextTick()

    active.value = false
    await nextTick()
    await retour()

    expect(onBack).not.toHaveBeenCalled()
  })

  it('se réarme si la feuille se rouvre', async () => {
    const active = ref(true)
    const onBack = vi.fn()
    monte(active, onBack)
    await nextTick()

    active.value = false
    await nextTick()
    active.value = true
    await nextTick()
    await retour()

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('lâche le geste quand la portée meurt — plus rien ne doit répondre', async () => {
    const active = ref(true)
    const onBack = vi.fn()
    const scope = monte(active, onBack)
    await nextTick()

    scope.stop()
    await retour()

    expect(onBack).not.toHaveBeenCalled()
  })

  /** Un `beforeunload` qui protège d'une perte qui n'arrive pas s'apprend comme du bruit. */
  it('ne pose plus d’avertissement avant fermeture', async () => {
    const active = ref(true)
    monte(active, () => {})
    await nextTick()

    const e = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(e)

    expect(e.defaultPrevented).toBe(false)
  })
})
