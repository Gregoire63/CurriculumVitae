import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { registerEndpoint } from '@nuxt/test-utils/runtime'
import Vault from '../../components/sport/Vault.vue'
import type { RawProposal } from '../../lib/proposals'

// ─────────────────────────────────────────────────────────────────────────────
// Ce qu'on lit AVANT de valider une modification de programme.
// ─────────────────────────────────────────────────────────────────────────────
//
// Une proposition n'est pas un message : c'est une écriture en attente. Elle
// s'affichait en JSON replié sous « Voir le détail » — « patch: {"sets":5,"rest":180} » —
// et ce détail-là ne se valide pas. Pour juger si c'est une bonne idée il faut savoir
// ce qu'il y avait AVANT, et personne ne se rappelle qu'un développé haltères était
// à 4 séries et 120 secondes.
//
// Le test vérifie donc la seule chose qui compte ici : les deux valeurs sont à
// l'écran, l'ancienne et la nouvelle. Pas la mise en forme — les chiffres.

const PROPOSITION: RawProposal = {
  id: 'p1',
  at: '2026-08-19T10:00:00.000Z',
  action: 'programme',
  summary: 'Développé haltères : 4×8-10 → 5×5, repos 3 min',
  patch: { action: 'modifier', seance: 's4', exercice: 'dev-halteres', patch: { series: 5, reps: '5', repos: 180 } },
  status: 'pending',
}

registerEndpoint('/api/auth/me', () => ({ connected: true, registered: true, bootstrapReady: true }))
registerEndpoint('/api/vault/health', () => ({ pret: true, env: {}, store: 'local', driver: 'fs' }))
registerEndpoint('/api/vault/pending', () => ({ mirrorAt: '2026-08-19T09:00:00.000Z', pending: [PROPOSITION], recent: [] }))
registerEndpoint('/api/vault/resolve', () => ({ ok: true }))

const attendre = () => new Promise(r => setTimeout(r, 60))

describe('une modification de programme, dans la boîte de réception', () => {
  it('montre l’avant ET l’après, pas seulement le patch', async () => {
    const w = mount(Vault, { props: { snapshot: () => ({}) }, attachTo: document.body, global: { stubs: { transition: false } } })
    await attendre(); await attendre()
    // La boîte s'ouvre au clic, dans une fenêtre TÉLÉPORTÉE : on lit donc <body>,
    // pas le composant. Chercher dans `w.text()` renverrait un vide trompeur.
    await w.get('.vt-inbox').trigger('click')
    await attendre(); await attendre()

    const txt = document.body.textContent ?? ''
    expect(txt).toContain('Développé couché haltères') // le nom réel, pas l'identifiant
    expect(txt).toContain('Modifier')
    // L'avant vient du programme, l'après de la proposition. Les deux, côte à côte.
    expect(txt).toMatch(/4[\s\S]*5/) // séries : 4 → 5
    expect(txt).toContain('8-10')
    expect(txt).toContain('2:00') // repos actuel
    expect(txt).toContain('3:00') // repos proposé
    w.unmount()
    document.body.querySelectorAll('.sport-portal').forEach(n => n.remove())
  })

  /**
   * Le bouton doit ÉCRIRE, pas seulement s'afficher.
   *
   * Une proposition dont la forme est reconnue mais que rien n'applique est le pire
   * des trois états : elle s'affiche, on la valide, elle s'archive en « appliquée »,
   * et le programme n'a pas bougé. On ne s'en aperçoit qu'à la séance suivante.
   */
  it('applique vraiment le geste au programme', async () => {
    localStorage.clear()
    const w = mount(Vault, { props: { snapshot: () => ({}) }, attachTo: document.body, global: { stubs: { transition: false } } })
    await attendre(); await attendre()
    await w.get('.vt-inbox').trigger('click')
    await attendre(); await attendre()

    const appliquer = [...document.body.querySelectorAll('button')].find(b => b.textContent === 'Appliquer')
    expect(appliquer, 'le bouton « Appliquer » doit être proposé').toBeTruthy()
    appliquer!.click()
    await attendre(); await attendre()

    expect(JSON.parse(localStorage.getItem('gr-prog-patch-v1') ?? '{}'))
      .toEqual({ 'dev-halteres': { sets: 5, reps: '5', rest: 180 } })
    w.unmount()
    document.body.querySelectorAll('.sport-portal').forEach(n => n.remove())
  })
})
