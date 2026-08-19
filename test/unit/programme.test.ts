import { describe, expect, it } from 'vitest'
import { LEGACY_NAMES, allExercises, mergeProgram, retiredExercises, sessionOf } from '../../lib/program'
import { programFor, slugify } from '../../lib/proposals'
import type { RawProposal } from '../../lib/proposals'
import type { Exercise, Session } from '../../data/sportProgram'

// ─────────────────────────────────────────────────────────────────────────────
// Le programme modifiable, et la seule chose qu'il n'a pas le droit de casser.
// ─────────────────────────────────────────────────────────────────────────────
//
// Un programme qu'on peut changer depuis une conversation, c'est un programme qu'on
// peut casser depuis une conversation. Le risque n'est pas d'écrire une bêtise
// visible — 40 séries se voient — mais d'effacer une donnée qu'on ne pourra pas
// reconstituer : les séances enregistrées sont indexées par identifiant d'exercice.
//
// D'où deux invariants, testés en premier parce que ce sont eux qui coûtent cher :
// retirer ne supprime rien, et un identifiant déjà pris n'est jamais réutilisé.

const ex = (id: string, over: Partial<Exercise> = {}): Exercise => ({
  id, name: id, sets: 4, reps: '8-10', muscles: ['pecs'], cues: [], machine: '', ...over,
})
const LIVRE: Session[] = [
  { id: 's1', name: 'Pecs', tag: 'Lun', color: '#a00', sprint: null, exercises: [ex('dc'), ex('ecarte'), ex('dips')] },
  { id: 's2', name: 'Dos', tag: 'Mar', color: '#0a0', sprint: null, exercises: [ex('traction'), ex('rowing')] },
]

const prop = (patch: Record<string, unknown>): RawProposal =>
  ({ id: '1', at: '', action: 'programme', summary: '', patch, status: 'pending' })

/** Le contexte réel : actifs, retirés, séances — tel que le construisent le coffre
 *  et le serveur. Les trois prédicats se distinguent, et c'est le point. */
const ctxDe = (sessions: Session[], retires: string[] = []) => ({
  sessionKnown: (id: string) => sessions.some(s => s.id === id),
  exerciseKnown: (id: string) => sessions.some(s => s.exercises.some(e => e.id === id)) || retires.includes(id),
  exercisesOf: (sid: string) => sessions.find(s => s.id === sid)?.exercises.map(e => e.id) ?? [],
})

describe('la fusion du programme', () => {
  it('rend le livré tel quel quand rien n’a été modifié', () => {
    expect(mergeProgram(LIVRE)).toEqual(LIVRE)
  })

  it('patche SANS écraser ce que le patch ne mentionne pas', () => {
    const [s1] = mergeProgram(LIVRE, { patches: { dc: { sets: 5, reps: '5', rest: 180 } } })
    const dc = s1.exercises[0]
    expect(dc.sets).toBe(5)
    expect(dc.reps).toBe('5')
    expect(dc.rest).toBe(180)
    // Ce qui n'était pas dans le patch doit être resté : c'est toute la différence
    // entre patcher et réécrire.
    expect(dc.muscles).toEqual(['pecs'])
    expect(dc.name).toBe('dc')
  })

  it('ne laisse pas un patch vide ou absurde effacer une valeur', () => {
    const [s1] = mergeProgram(LIVRE, { patches: { dc: { sets: 0, reps: '   ', name: '' } } })
    expect(s1.exercises[0].sets).toBe(4)
    expect(s1.exercises[0].reps).toBe('8-10')
    expect(s1.exercises[0].name).toBe('dc')
  })

  it('ajoute un exercice à la bonne séance, et à elle seule', () => {
    const p = mergeProgram(LIVRE, { added: { s2: [ex('tirage')] } })
    expect(p[1].exercises.map(e => e.id)).toEqual(['traction', 'rowing', 'tirage'])
    expect(p[0].exercises).toHaveLength(3)
  })

  it('retire du PROGRAMME sans rien supprimer de l’historique', () => {
    const custom = { disabled: ['ecarte'] }
    expect(allExercises(mergeProgram(LIVRE, custom)).map(e => e.id)).not.toContain('ecarte')
    // La fiche reste consultable : sans elle, une séance de mars afficherait
    // « ecarte » en identifiant brut là où elle affichait un nom.
    expect(retiredExercises(LIVRE, custom).ecarte.name).toBe('ecarte')
    // Et le livré n'a pas bougé d'un octet.
    expect(LIVRE[0].exercises.map(e => e.id)).toEqual(['dc', 'ecarte', 'dips'])
  })

  it('réordonne, et laisse APRÈS ceux qu’on n’a pas cités', () => {
    const [s1] = mergeProgram(LIVRE, { order: { s1: ['dips'] } })
    expect(s1.exercises.map(e => e.id)).toEqual(['dips', 'dc', 'ecarte'])
  })

  it('retrouve la séance d’un exercice, et garde les noms d’avant', () => {
    expect(sessionOf(LIVRE, 'rowing')?.id).toBe('s2')
    expect(sessionOf(LIVRE, 'inconnu')).toBeNull()
    expect(LEGACY_NAMES['curl-ez']).toBe('Curl barre EZ')
  })
})

describe('une modification de programme proposée', () => {
  const ctx = ctxDe(LIVRE)

  it('modifie un exercice existant', () => {
    const plan = programFor(prop({ action: 'modifier', seance: 's1', exercice: 'dc', patch: { series: 5, reps: '5', repos: 180 } }), ctx)
    expect(plan).toEqual({ kind: 'programme', seance: 's1', action: 'modifier', exercice: 'dc', patch: { sets: 5, reps: '5', rest: 180 } })
  })

  it('accepte les mots français comme les anglais', () => {
    const a = programFor(prop({ action: 'modifier', seance: 's1', exercice: 'dc', patch: { sets: 3, rest: 90 } }), ctx)
    const b = programFor(prop({ geste: 'modifier', session: 's1', exercice: 'dc', vers: { series: 3, pause: 90 } }), ctx)
    expect(a).toEqual(b)
  })

  it('refuse un exercice, une séance ou un geste inconnus', () => {
    expect(programFor(prop({ action: 'modifier', seance: 's1', exercice: 'fantome', patch: { sets: 3 } }), ctx)).toBeNull()
    expect(programFor(prop({ action: 'modifier', seance: 's9', exercice: 'dc', patch: { sets: 3 } }), ctx)).toBeNull()
    expect(programFor(prop({ action: 'supprimer', seance: 's1', exercice: 'dc' }), ctx)).toBeNull()
  })

  it('refuse un patch qui ne dit rien, ou des valeurs hors bornes', () => {
    expect(programFor(prop({ action: 'modifier', seance: 's1', exercice: 'dc', patch: {} }), ctx)).toBeNull()
    // 40 séries et 2 secondes de repos passent le typage et donnent un écran
    // inutilisable qu'il faudrait corriger à la main sans savoir d'où ça vient.
    expect(programFor(prop({ action: 'modifier', seance: 's1', exercice: 'dc', patch: { series: 40 } }), ctx)).toBeNull()
    expect(programFor(prop({ action: 'modifier', seance: 's1', exercice: 'dc', patch: { repos: 2 } }), ctx)).toBeNull()
  })

  it('ajoute un exercice, et déduit son identifiant du nom', () => {
    const plan = programFor(prop({ action: 'ajouter', seance: 's2', nouveau: { nom: 'Tirage horizontal', series: 4, reps: '10-12', repos: 120, muscles: ['dos'] } }), ctx)
    expect(plan?.action).toBe('ajouter')
    expect(plan?.nouveau).toEqual({ id: 'tirage-horizontal', name: 'Tirage horizontal', sets: 4, reps: '10-12', muscles: ['dos'], cues: [], machine: '', rest: 120 })
  })

  it('refuse un identifiant DÉJÀ PRIS', () => {
    // Le réutiliser rangerait des séries réellement soulevées sous un mouvement
    // qu'on n'a jamais fait. C'est le refus qui coûte le plus cher à ne pas avoir.
    expect(programFor(prop({ action: 'ajouter', seance: 's1', nouveau: { id: 'dc', nom: 'Autre chose', series: 3, reps: '10' } }), ctx)).toBeNull()
  })

  it('refuse un exercice neuf sans nom, séries ou reps', () => {
    expect(programFor(prop({ action: 'ajouter', seance: 's1', nouveau: { nom: 'Sans rien' } }), ctx)).toBeNull()
    expect(programFor(prop({ action: 'ajouter', seance: 's1', nouveau: { series: 3, reps: '10' } }), ctx)).toBeNull()
  })

  it('retire, puis réactive — et refuse chacun des deux quand il ne ferait rien', () => {
    expect(programFor(prop({ action: 'retirer', seance: 's1', exercice: 'ecarte' }), ctx))
      .toEqual({ kind: 'programme', seance: 's1', action: 'retirer', exercice: 'ecarte' })
    // Déjà actif : « réactiver » s'archiverait en « appliquée » sans rien changer.
    expect(programFor(prop({ action: 'reactiver', seance: 's1', exercice: 'ecarte' }), ctx)).toBeNull()

    const apres = mergeProgram(LIVRE, { disabled: ['ecarte'] })
    const ctx2 = ctxDe(apres, ['ecarte'])
    expect(programFor(prop({ action: 'reactiver', seance: 's1', exercice: 'ecarte' }), ctx2))
      .toEqual({ kind: 'programme', seance: 's1', action: 'reactiver', exercice: 'ecarte' })
    expect(programFor(prop({ action: 'retirer', seance: 's1', exercice: 'ecarte' }), ctx2)).toBeNull()
  })

  it('réordonne, et refuse un exercice d’une AUTRE séance', () => {
    expect(programFor(prop({ action: 'ordre', seance: 's1', ordre: ['dips', 'dc', 'ecarte'] }), ctx)?.ordre)
      .toEqual(['dips', 'dc', 'ecarte'])
    // Le citer ne le déplacerait pas : l'ordre s'applique séance par séance, et on
    // obtiendrait silencieusement un ordre différent de celui demandé.
    expect(programFor(prop({ action: 'ordre', seance: 's1', ordre: ['dips', 'rowing'] }), ctx)).toBeNull()
    expect(programFor(prop({ action: 'ordre', seance: 's1', ordre: ['dc', 'dc'] }), ctx)).toBeNull()
    expect(programFor(prop({ action: 'ordre', seance: 's1', ordre: [] }), ctx)).toBeNull()
  })

  it('ne répond qu’aux propositions de programme', () => {
    expect(programFor({ ...prop({ action: 'modifier', seance: 's1', exercice: 'dc', patch: { sets: 3 } }), action: 'plat' }, ctx)).toBeNull()
  })

  it('translittère les accents dans un identifiant déduit', () => {
    expect(slugify('Développé incliné haltères')).toBe('developpe-incline-halteres')
    expect(slugify('  Élévations latérales !  ')).toBe('elevations-laterales')
  })
})

describe('le geste proposé se rejoue vraiment sur le programme', () => {
  /** Une proposition validée doit produire l'effet annoncé — pas un effet voisin. */
  it('modifier, ajouter, retirer et ordre aboutissent au programme attendu', () => {
    const ctx = ctxDe(LIVRE)
    const p1 = programFor(prop({ action: 'modifier', seance: 's1', exercice: 'dc', patch: { series: 5, repos: 180 } }), ctx)!
    const p2 = programFor(prop({ action: 'ajouter', seance: 's1', nouveau: { nom: 'Pec deck', series: 3, reps: '12' } }), ctx)!
    const p3 = programFor(prop({ action: 'retirer', seance: 's1', exercice: 'ecarte' }), ctx)!
    const p4 = programFor(prop({ action: 'ordre', seance: 's1', ordre: ['dips', 'dc'] }), ctx)!

    const apres = mergeProgram(LIVRE, {
      patches: { [p1.exercice!]: p1.patch! },
      added: { s1: [p2.nouveau!] },
      disabled: [p3.exercice!],
      order: { s1: p4.ordre! },
    })
    expect(apres[0].exercises.map(e => e.id)).toEqual(['dips', 'dc', 'pec-deck'])
    expect(apres[0].exercises.find(e => e.id === 'dc')).toMatchObject({ sets: 5, rest: 180, reps: '8-10' })
    // Et l'autre séance n'a pas bougé.
    expect(apres[1].exercises.map(e => e.id)).toEqual(['traction', 'rowing'])
  })
})
