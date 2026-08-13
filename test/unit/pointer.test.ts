import { describe, expect, it } from 'vitest'
import { getAt, isScalar, parsePointer, setAt } from '../../lib/pointer'

// ─────────────────────────────────────────────────────────────────────────────
// Désigner un endroit dans la sauvegarde, et n'y toucher que là.
//
// C'est le module qui rend « tout le fichier modifiable » acceptable. Ce qu'il
// REFUSE compte donc plus que ce qu'il accepte : chaque interdit ferme une façon
// de perdre une donnée qu'on ne pourra pas reconstituer.
const snap = () => ({
  sessions: [
    { at: '2026-08-13T13:00', name: 'Jambes', durationMin: 50, entries: [{ exId: 'squat', sets: [{ w: 100, r: 8 }] }] },
    { at: '2026-08-14T12:30', name: 'Pecs', durationMin: 45, entries: [] },
  ],
  bodyWeight: [{ date: '2026-08-12', kg: 77.4 }],
  profile: { heightCm: 179, sex: 'h', birthYear: 1997 },
  nutrition: { week: { gym: [true, false] } },
  'clé/bizarre': { 'a~b': 1 },
})

describe('lecture par pointeur', () => {
  it('trouve une valeur simple, à travers listes et objets', () => {
    const s = snap()
    expect(getAt(s, '/sessions/0/durationMin')).toBe(50)
    expect(getAt(s, '/profile/heightCm')).toBe(179)
    expect(getAt(s, '/sessions/0/entries/0/sets/0/w')).toBe(100)
    expect(getAt(s, '/nutrition/week/gym/1')).toBe(false)
  })

  it('résout les échappements de la norme', () => {
    // ~1 vaut « / » et ~0 vaut « ~ » — sans quoi une clé contenant une barre
    // oblique découperait le chemin au mauvais endroit.
    const s = snap()
    expect(parsePointer('/a~1b/c~0d')).toEqual(['a/b', 'c~d'])
    expect(getAt(s, '/cl~é/bizarre'.replace('~é', 'é'))).toBeUndefined()
    expect(getAt(s, '/clé~1bizarre/a~0b')).toBe(1)
  })

  it('ne trouve rien là où il n\'y a rien', () => {
    const s = snap()
    for (const p of ['/sessions/9/durationMin', '/profile/poids', '/sessions/0/durationMin/x', '', 'sessions/0', '/']) {
      expect(getAt(s, p)).toBeUndefined()
    }
  })

  it('ne remonte pas au prototype', () => {
    // `in` aurait laissé passer `/constructor` ou `/__proto__`, qui ne font pas
    // partie des données et ouvrent la porte à des écritures ailleurs.
    const s = snap()
    expect(getAt(s, '/constructor')).toBeUndefined()
    expect(getAt(s, '/profile/__proto__')).toBeUndefined()
    expect(getAt(s, '/profile/toString')).toBeUndefined()
  })
})

describe('écriture par pointeur', () => {
  it('remplace une valeur simple, dans un objet comme dans une liste', () => {
    const s = snap()
    expect(setAt(s, '/sessions/0/durationMin', 65)).toBe(true)
    expect(s.sessions[0].durationMin).toBe(65)
    expect(setAt(s, '/nutrition/week/gym/0', false)).toBe(true)
    expect(s.nutrition.week.gym[0]).toBe(false)
    expect(setAt(s, '/sessions/1/name', 'Pecs & Bras')).toBe(true)
    expect(setAt(s, '/profile/birthYear', null)).toBe(true)
    expect(s.profile.birthYear).toBeNull()
  })

  it('ne crée jamais un champ qui n\'existait pas', () => {
    // Une faute de frappe dans un nom de clé fabriquerait sinon un champ fantôme
    // que rien ne lit — et qui donnerait l'illusion que la correction a marché.
    const s = snap()
    expect(setAt(s, '/profile/poids', 78)).toBe(false)
    expect(setAt(s, '/sessions/0/duree', 65)).toBe(false)
    expect(s.profile).not.toHaveProperty('poids')
  })

  it('ne rallonge pas une liste', () => {
    const s = snap()
    expect(setAt(s, '/bodyWeight/5', 80)).toBe(false)
    expect(s.bodyWeight).toHaveLength(1)
  })

  it('refuse d\'écraser un objet ou une liste', () => {
    // C'est l'interdit central : réécrire une séance entière à partir d'une phrase
    // est exactement ce qu'on refuse depuis le début.
    const s = snap()
    expect(setAt(s, '/sessions/0', 'nawak')).toBe(false)
    expect(setAt(s, '/sessions', 'nawak')).toBe(false)
    expect(setAt(s, '/profile', 'nawak')).toBe(false)
    expect(s.sessions[0].name).toBe('Jambes')
  })

  it('refuse d\'écrire autre chose qu\'une valeur simple', () => {
    const s = snap()
    expect(setAt(s, '/sessions/0/durationMin', { a: 1 } as never)).toBe(false)
    expect(setAt(s, '/sessions/0/durationMin', [1] as never)).toBe(false)
    expect(s.sessions[0].durationMin).toBe(50)
  })

  it('reconnaît ce qui est une valeur simple', () => {
    expect([0, '', false, null, 3.5, 'a'].every(isScalar)).toBe(true)
    expect([{}, [], undefined].some(isScalar)).toBe(false)
  })
})
