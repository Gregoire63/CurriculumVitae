import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_PLAN } from '../../composables/useProfile'

// Profil et planning hebdomadaire.
//
// Petit module, mais il alimente le métabolisme de base : une taille ou une année de
// naissance mal validée et TOUTE la cible calorique part de travers, sans qu'aucune
// erreur ne s'affiche.
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

const load = async () => {
  const { useProfile } = await import('../../composables/useProfile')
  const p = useProfile()
  p.hydrate()
  return p
}

describe('profil', () => {
  it('retient taille, sexe et année de naissance', async () => {
    const p = await load()
    p.setHeight(179)
    p.setSex('h')
    p.setBirthYear(1997)
    expect(p.profile.value).toEqual({ heightCm: 179, sex: 'h', birthYear: 1997 })

    vi.resetModules()
    const again = await load()
    expect(again.profile.value.heightCm).toBe(179)
  })

  it('refuse les valeurs impossibles en les ramenant à « inconnu »', async () => {
    // `null` est un état utile : il fait afficher « renseigne ton profil » au lieu de
    // calculer une cible sur une taille de 0 cm.
    const p = await load()
    p.setHeight(0)
    expect(p.profile.value.heightCm).toBeNull()
    p.setHeight(-5)
    expect(p.profile.value.heightCm).toBeNull()
    p.setBirthYear(1800)
    expect(p.profile.value.birthYear).toBeNull()
  })
})

describe('planning hebdomadaire', () => {
  it('part du planning livré et le garde stable', async () => {
    // L'ancien planning « adaptatif » se réécrivait à chaque séance et finissait par
    // dériver. Il ne bouge plus qu'à la main.
    const p = await load()
    expect(p.weekPlan.value).toEqual(DEFAULT_PLAN)
  })

  it('change un jour sans toucher aux autres', async () => {
    const p = await load()
    p.setDay(2, 's3')
    expect(p.weekPlan.value[2]).toBe('s3')
    expect(p.weekPlan.value[0]).toBe(DEFAULT_PLAN[0])
    expect(p.weekPlan.value).toHaveLength(7)
  })

  it('accepte un jour de repos', async () => {
    const p = await load()
    p.setDay(0, null)
    expect(p.weekPlan.value[0]).toBeNull()
  })

  it('se remet au planning livré sur demande', async () => {
    const p = await load()
    p.setDay(2, 's3')
    p.resetPlan()
    expect(p.weekPlan.value).toEqual(DEFAULT_PLAN)
  })

  it('survit à un rechargement une fois la migration passée', async () => {
    const p = await load()
    p.setDay(2, 's3')
    vi.resetModules()
    const again = await load()
    expect(again.weekPlan.value[2]).toBe('s3')
  })
})

describe('restauration depuis une sauvegarde', () => {
  it('reprend profil et planning', async () => {
    const p = await load()
    p.restore({ profile: { heightCm: 179, sex: 'h', birthYear: 1997 }, weekPlan: ['s1', null, null, null, null, null, null] })
    expect(p.profile.value.heightCm).toBe(179)
    expect(p.weekPlan.value[0]).toBe('s1')
  })

  it('rejette un planning de mauvaise longueur au lieu de le charger à moitié', async () => {
    // Un planning à 5 entrées ferait planter la lecture par index ailleurs, et le
    // symptôme apparaîtrait très loin d'ici.
    const p = await load()
    p.restore({ weekPlan: ['s1', 's2'] })
    expect(p.weekPlan.value).toHaveLength(7)
    expect(p.weekPlan.value).toEqual(DEFAULT_PLAN)
  })

  it('une sauvegarde vide ou partielle passe sans erreur', async () => {
    const p = await load()
    expect(() => p.restore({})).not.toThrow()
    expect(() => p.restore({ profile: { heightCm: 179 } })).not.toThrow()
    expect(p.profile.value.heightCm).toBe(179)
    // Les champs absents ne sont pas écrasés par `undefined`.
    expect(p.weekPlan.value).toEqual(DEFAULT_PLAN)
  })
})
