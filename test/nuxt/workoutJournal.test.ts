import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ALL_EXERCISES } from '../../data/sportProgram'

// Le journal des séances : enregistrement, records, suggestion de charge, poids de
// corps, sauvegarde.
//
// Les calculs purs (e1RM, détection de records, prochaine charge) sont testés dans
// test/unit/sportStats.ts. Ici on teste le CÂBLAGE : ce qui se persiste, ce qui se
// relit, et ce qui se dérive des données stockées.
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

const load = async () => {
  const { useWorkout } = await import('../../composables/useWorkout')
  return useWorkout()
}

/** Un exercice bien réel du programme : les suggestions dépendent de ses réglages. */
const EX = ALL_EXERCISES[0]
const sets = (w: number, r: number, n = 3) => Array.from({ length: n }, () => ({ w, r }))

describe('enregistrement d\'une séance', () => {
  it('range les séries et les rend au journal', async () => {
    const wk = await load()
    wk.recordSession([{ exId: EX.id, sets: sets(60, 8) }], 55, { sessionId: 's1', name: 'Haut du corps' })

    expect(wk.sessionLog()).toHaveLength(1)
    expect(wk.sessionLog()[0].name).toBe('Haut du corps')
    expect(wk.bestCharge(EX.id)).toBe(60)
  })

  it('ignore un exercice sans aucune série', async () => {
    // Un exercice ouvert puis abandonné ne doit pas créer une ligne vide dans
    // l'historique — elle fausserait ensuite le volume et les moyennes.
    const wk = await load()
    wk.recordSession([{ exId: EX.id, sets: [] }], 40, { sessionId: 's1', name: 'Séance vide' })
    expect(wk.bestCharge(EX.id)).toBe(0)
  })

  it('survit à un rechargement', async () => {
    const wk = await load()
    wk.recordSession([{ exId: EX.id, sets: sets(60, 8) }], 55, { sessionId: 's1', name: 'Haut du corps' })
    vi.resetModules()
    const again = await load()
    expect(again.bestCharge(EX.id)).toBe(60)
    expect(again.sessionLog()).toHaveLength(1)
  })

  it('signale un record quand la charge monte, pas quand elle stagne', async () => {
    const wk = await load()
    wk.recordSession([{ exId: EX.id, sets: sets(60, 8) }], 55, { sessionId: 's1', name: 'A' })
    const rien = wk.recordSession([{ exId: EX.id, sets: sets(60, 8) }], 55, { sessionId: 's1', name: 'B' })
    expect(rien.flatMap(p => p.kinds)).not.toContain('charge')

    const pr = wk.recordSession([{ exId: EX.id, sets: sets(70, 8) }], 55, { sessionId: 's1', name: 'C' })
    expect(pr.flatMap(p => p.kinds)).toContain('charge')
    // Le nom affiché est celui de l'exercice, pas son identifiant technique.
    expect(pr[0].name).toBe(EX.name)
  })
})

describe('records dérivés', () => {
  it('rend null tant que l\'exercice n\'a jamais été fait', async () => {
    const wk = await load()
    expect(wk.recordsOf(EX.id)).toBeNull()
  })

  it('retient la charge maximale ET la date où elle a été posée', async () => {
    // Les records sont dérivés des logs, jamais stockés à part : c'est ce qui évite
    // qu'ils se désynchronisent après une correction de séance.
    const wk = await load()
    wk.recordSession([{ exId: EX.id, sets: sets(60, 8) }], 55, { sessionId: 's1', name: 'A' })
    wk.recordSession([{ exId: EX.id, sets: sets(80, 5) }], 55, { sessionId: 's1', name: 'B' })
    const r = wk.recordsOf(EX.id)!
    expect(r.charge).toBe(80)
    expect(r.chargeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('suggestion de charge', () => {
  it('ne suggère rien sans historique', async () => {
    const wk = await load()
    expect(wk.suggestWeight(EX).reason).toBe('none')
    expect(wk.progressionHint(EX)).toBeNull()
  })

  it('propose de monter quand l\'objectif de répétitions est atteint', async () => {
    // Double progression : on monte la charge une fois le haut de la fourchette
    // atteint sur toutes les séries.
    const wk = await load()
    const top = Number.parseInt(String(EX.reps).split('-').at(-1)!, 10)
    wk.recordSession(
      [{ exId: EX.id, sets: sets(60, top, EX.sets), effort: 'facile' }],
      55,
      { sessionId: 's1', name: 'A' },
    )
    const s = wk.suggestWeight(EX)
    expect(s.reason).toBe('progress')
    expect(s.weight).toBeGreaterThan(60)
    expect(wk.progressionHint(EX)).toContain(String(s.weight))
  })
})

describe('poids de corps', () => {
  it('retrouve le poids connu le plus proche, sans jamais regarder l\'avenir', async () => {
    // Sert à retrouver le LEST réellement ajouté sur les tractions et les dips :
    // prendre un poids postérieur à la séance donnerait un record faux.
    const wk = await load()
    wk.setBodyWeightAt('2026-08-01', 93)
    wk.setBodyWeightAt('2026-08-08', 92.6)
    expect(wk.bodyWeightAt('2026-08-05')).toBe(93)
    expect(wk.bodyWeightAt('2026-08-08')).toBe(92.6)
    expect(wk.bodyWeightAt('2026-08-20')).toBe(92.6)
  })

  it('retombe sur la première pesée connue pour une date antérieure à tout', async () => {
    const wk = await load()
    wk.setBodyWeightAt('2026-08-08', 92.6)
    expect(wk.bodyWeightAt('2026-01-01')).toBe(92.6)
  })

  it('remplace le poids du jour au lieu d\'empiler les doublons', async () => {
    const wk = await load()
    wk.setBodyWeightAt('2026-08-08', 92.6)
    wk.setBodyWeightAt('2026-08-08', 92.4)
    expect(wk.bodyWeight.value.filter(e => e.date === '2026-08-08')).toHaveLength(1)
    expect(wk.bodyWeightAt('2026-08-08')).toBe(92.4)
  })

  it('garde la série triée quelle que soit l\'ordre de saisie', async () => {
    // La série est lue par index ailleurs (« la dernière pesée »), donc l'ordre
    // n'est pas cosmétique.
    const wk = await load()
    wk.setBodyWeightAt('2026-08-08', 92.6)
    wk.setBodyWeightAt('2026-08-01', 93)
    const dates = wk.bodyWeight.value.map(e => e.date)
    expect(dates).toEqual([...dates].sort())
  })

  it('refuse un poids absurde plutôt que de polluer la série', async () => {
    const wk = await load()
    wk.setBodyWeightAt('2026-08-08', 0)
    wk.setBodyWeightAt('', 92)
    expect(wk.bodyWeight.value).toHaveLength(0)
  })
})

describe('remise à zéro', () => {
  it('efface tout et ne recharge pas les données de démonstration', async () => {
    const wk = await load()
    wk.recordSession([{ exId: EX.id, sets: sets(60, 8) }], 55, { sessionId: 's1', name: 'A' })
    wk.setBodyWeightAt('2026-08-08', 92.6)
    wk.clearAll()
    expect(wk.sessionLog()).toHaveLength(0)
    expect(wk.bodyWeight.value).toHaveLength(0)
    // Le drapeau « déjà semé » empêche le rechargement automatique de la démo :
    // sans lui, repartir de zéro rendait les fausses séances aussitôt après.
    expect(localStorage.getItem('gr-seeded-v1')).toBe('1')
  })
})
