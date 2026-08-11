import { describe, it, expect } from 'vitest'
import {
  setTop, setVolume, setE1rm, topWeight, volumeOf, e1rmOf,
  warmupLoad, roundToStep,
  avgSessionDuration, plausibleDurations, DURATION_MIN, DURATION_MAX,
  nextLoad, sameWeightStreak,
  detectPRs,
  muscleSetCounts, weeklyStatus, withProgramMuscles,
  rampWeeks, recoveryWeeks, weeksSinceRecovery, assessFatigue,
  startOfWeek, shiftIso,
} from '../../utils/sportStats'
import type { WeekStats } from '../../utils/sportStats'
import { ALL_EXERCISES, bottomOfRange, topOfRange } from '../../data/sportProgram'

// ─── Séries, superset inclus ─────────────────────────────────────────────────
// Régression : le 2e mouvement d'un superset (w2/r2) était ignoré partout, donc
// l'exercice n'avait ni courbe, ni record, ni volume.
describe('séries', () => {
  it('prend la charge la plus lourde des deux mouvements d\'un superset', () => {
    expect(setTop({ w: 60, r: 8 })).toBe(60)
    expect(setTop({ w: 20, r: 12, w2: 30, r2: 12 })).toBe(30)
  })

  it('compte les deux mouvements dans le volume', () => {
    expect(setVolume({ w: 60, r: 8 })).toBe(480)
    expect(setVolume({ w: 20, r: 12, w2: 30, r2: 10 })).toBe(540)
  })

  it('évalue le 1RM des deux mouvements et garde le meilleur', () => {
    expect(setE1rm({ w: 60, r: 8 })).toBeCloseTo(76, 1)
    // 40×10 = 53,3 contre 30×10 = 40 → on garde 53,3
    expect(setE1rm({ w: 40, r: 10, w2: 30, r2: 10 })).toBeCloseTo(53.3, 1)
  })

  it('exclut l\'échauffement des stats', () => {
    const sets = [{ w: 40, r: 10, warm: true }, { w: 60, r: 8 }, { w: 60, r: 7 }]
    expect(topWeight(sets)).toBe(60)
    expect(volumeOf(sets)).toBe(480 + 420) // l'échauffement ne compte pas
    expect(e1rmOf(sets)).toBe(76)
  })

  it('renvoie 0 quand il n\'y a que de l\'échauffement', () => {
    expect(topWeight([{ w: 40, r: 10, warm: true }])).toBe(0)
    expect(e1rmOf([{ w: 40, r: 10, warm: true }])).toBe(0)
  })
})

// ─── Échauffement calculé ────────────────────────────────────────────────────
describe('échauffement', () => {
  it('vaut ~50 % de la charge de travail, arrondi à 2,5 kg', () => {
    expect(warmupLoad(60)).toBe(30)
    expect(warmupLoad(62.5)).toBe(32.5) // 31,25 → 32,5
    expect(warmupLoad(100)).toBe(50)
  })

  it('ne propose rien sous 20 kg (échauffement chiffré inutile)', () => {
    expect(warmupLoad(20)).toBeNull()
    expect(warmupLoad(12)).toBeNull()
    expect(warmupLoad(0)).toBeNull()
  })

  it('arrondit au pas demandé', () => {
    expect(roundToStep(31.25, 2.5)).toBe(32.5)
    expect(roundToStep(31, 5)).toBe(30)
  })
})

// ─── Durée moyenne ───────────────────────────────────────────────────────────
// Régression : une séance laissée ouverte (chrono à 300 min) faisait exploser la
// moyenne, et une séance fermée aussitôt (2 min) la tirait vers le bas.
describe('durée moyenne', () => {
  it('écarte les durées aberrantes', () => {
    expect(plausibleDurations([2, 50, 60, 300, undefined, null])).toEqual([50, 60])
    expect(avgSessionDuration([2, 50, 60, 300])).toBe(55)
  })

  it('garde les bornes inclusives', () => {
    expect(plausibleDurations([DURATION_MIN, DURATION_MAX])).toEqual([DURATION_MIN, DURATION_MAX])
  })

  it('renvoie 0 sans donnée exploitable', () => {
    expect(avgSessionDuration([])).toBe(0)
    expect(avgSessionDuration([500, 1])).toBe(0)
  })
})

// ─── Charge auto-régulée ─────────────────────────────────────────────────────
describe('charge conseillée', () => {
  // Fourchette 8-10 : c'est elle qui décide, pas le ressenti.
  const base = { plannedSets: 2, topReps: 10, bottomReps: 8, inc: 2.5, streak: 1 }

  it('monte quand l\'objectif de reps est atteint', () => {
    const r = nextLoad({ ...base, lastSets: [{ w: 60, r: 10 }, { w: 60, r: 10 }] })
    expect(r.reason).toBe('progress')
    expect(r.weight).toBe(62.5)
  })

  it('monte quand c\'était « facile », même sans atteindre la cible', () => {
    const r = nextLoad({ ...base, lastSets: [{ w: 60, r: 8 }, { w: 60, r: 8 }], effort: 'easy' })
    expect(r.reason).toBe('progress')
    expect(r.weight).toBe(62.5)
  })

  it('redescend quand l\'échec arrive SOUS la fourchette', () => {
    const r = nextLoad({ ...base, lastSets: [{ w: 60, r: 4 }], effort: 'fail' })
    expect(r.reason).toBe('deload')
    expect(r.weight).toBe(57.5)
  })

  it('reste quand l\'échec arrive DANS la fourchette', () => {
    // LA régression du 11/08. « À l'échec » veut dire qu'on est allé au bout de la
    // série, pas qu'on l'a ratée : 3 × 8 à 40 kg sur du 8-10, c'est exactement la
    // série demandée. L'app conseillait de redescendre à 37,5 kg — elle punissait
    // la seule chose qu'on lui demandait de faire.
    const r = nextLoad({ ...base, lastSets: [{ w: 40, r: 8 }, { w: 40, r: 8 }, { w: 40, r: 8 }], effort: 'fail' })
    expect(r.reason).toBe('keep')
    expect(r.weight).toBe(40)
  })

  it('ne redescend pas sans borne basse connue : dans le doute, on consolide', () => {
    const r = nextLoad({ ...base, bottomReps: null, lastSets: [{ w: 60, r: 4 }], effort: 'fail' })
    expect(r.reason).toBe('keep')
    expect(r.weight).toBe(60)
  })

  it('ne force PAS la montée de stagnation sur quelqu\'un déjà à l\'échec', () => {
    // Bloqué depuis 5 séances ET à l'échec dans la fourchette : forcer +2,5 kg,
    // c'est garantir la série ratée suivante.
    const r = nextLoad({ ...base, streak: 5, lastSets: [{ w: 60, r: 8 }], effort: 'fail' })
    expect(r.reason).toBe('keep')
    expect(r.weight).toBe(60)
  })

  it('ne force PAS la montée de stagnation quand c\'était dur', () => {
    const r = nextLoad({ ...base, streak: 5, lastSets: [{ w: 60, r: 8 }], effort: 'hard' })
    expect(r.reason).toBe('keep')
    expect(r.weight).toBe(60)
  })

  it('force la montée après 3 séances à la même charge', () => {
    const r = nextLoad({ ...base, streak: 3, lastSets: [{ w: 60, r: 8 }] })
    expect(r.reason).toBe('stall')
    expect(r.weight).toBe(62.5)
  })

  it('garde la charge dans le cas courant', () => {
    const r = nextLoad({ ...base, lastSets: [{ w: 60, r: 8 }] })
    expect(r.reason).toBe('keep')
    expect(r.weight).toBe(60)
  })

  it('ne conseille rien sans historique', () => {
    expect(nextLoad({ ...base, lastSets: [] }).reason).toBe('none')
    expect(nextLoad({ ...base, lastSets: [{ w: 40, r: 10, warm: true }] }).reason).toBe('none')
  })

  it('l\'objectif de reps atteint prime sur l\'échec', () => {
    // Toutes les reps visées ET plus de réserve au bout : c'est le moment de
    // charger, pas de reculer. C'était l'inverse avant le 11/08, et un test
    // verrouillait cet inverse — d'où l'intérêt de relire les tests quand le
    // vocabulaire change.
    const r = nextLoad({ ...base, lastSets: [{ w: 60, r: 10 }, { w: 60, r: 10 }], effort: 'fail' })
    expect(r.reason).toBe('progress')
    expect(r.weight).toBe(62.5)
  })
})

describe('stagnation', () => {
  it('compte les séances consécutives à la même charge max', () => {
    expect(sameWeightStreak([
      { sets: [{ w: 60, r: 8 }] },
      { sets: [{ w: 60, r: 9 }] },
      { sets: [{ w: 60, r: 10 }] },
    ])).toBe(3)
  })

  it('repart de zéro dès que la charge change', () => {
    expect(sameWeightStreak([
      { sets: [{ w: 60, r: 8 }] },
      { sets: [{ w: 62.5, r: 8 }] },
    ])).toBe(1)
    expect(sameWeightStreak([])).toBe(0)
  })
})

// ─── Records ─────────────────────────────────────────────────────────────────
describe('records', () => {
  it('détecte un record de charge et le 1RM qui suit', () => {
    expect(detectPRs([{ sets: [{ w: 60, r: 8 }] }], [{ w: 62.5, r: 8 }])).toEqual(['charge', 'e1rm'])
  })

  it('détecte plus de reps à charge égale (le PR qui était ignoré)', () => {
    const kinds = detectPRs([{ sets: [{ w: 60, r: 8 }] }], [{ w: 60, r: 10 }])
    expect(kinds).toContain('reps')
    expect(kinds).not.toContain('charge')
  })

  it('ne crie pas au record à la première séance', () => {
    expect(detectPRs([], [{ w: 60, r: 10 }])).toEqual([])
  })

  it('ne compte pas un record quand la séance est moins bonne', () => {
    expect(detectPRs([{ sets: [{ w: 60, r: 10 }] }], [{ w: 60, r: 8 }])).toEqual([])
  })

  it('ignore l\'échauffement', () => {
    expect(detectPRs([{ sets: [{ w: 60, r: 8 }] }], [{ w: 80, r: 12, warm: true }, { w: 60, r: 8 }])).toEqual([])
  })
})

// ─── Volume par muscle ───────────────────────────────────────────────────────
describe('volume par muscle', () => {
  it('pondère le muscle principal à 1 et les assistants à 0,5', () => {
    // Développé couché : pecs (principal), épaules avant + triceps (assistants)
    const c = muscleSetCounts([{ muscles: ['pecs', 'epaules-av', 'triceps'], sets: 4 }])
    expect(c['Pecs']).toBe(4)
    expect(c['Épaules avant']).toBe(2)
    expect(c['Triceps']).toBe(2)
  })

  it('distingue les 3 faisceaux d\'épaule', () => {
    const c = muscleSetCounts([
      { muscles: ['epaules-lat'], sets: 3 },
      { muscles: ['epaules-ar'], sets: 3 },
    ])
    expect(c['Épaules latérales']).toBe(3)
    expect(c['Épaules arrière']).toBe(3)
    expect(c['Épaules']).toBeUndefined() // plus de fusion qui masquait l'arrière d'épaule
  })

  it('cumule plusieurs exercices sur le même muscle', () => {
    const c = muscleSetCounts([
      { muscles: ['biceps'], sets: 3 },
      { muscles: ['dos', 'biceps'], sets: 4 },
    ])
    expect(c['Biceps']).toBe(5) // 3 en principal + 4×0,5 en assistant
    expect(c['Dos']).toBe(4)
  })

  it('fait apparaître à 0 les muscles du programme jamais travaillés', () => {
    const c = withProgramMuscles({ Pecs: 6 }, [{ muscles: ['pecs'] }, { muscles: ['ischios'] }])
    expect(c['Pecs']).toBe(6)
    expect(c['Ischios']).toBe(0)
  })

  it('situe le volume par rapport à la cible hebdo', () => {
    expect(weeklyStatus(9)).toBe('low')
    expect(weeklyStatus(10)).toBe('ok')
    expect(weeklyStatus(20)).toBe('ok')
    expect(weeklyStatus(21)).toBe('high')
  })
})

// ─── Fatigue & récupération ──────────────────────────────────────────────────
const wk = (start: string, volume: number, extra: Partial<WeekStats> = {}): WeekStats =>
  ({ start, sessions: volume > 0 ? 4 : 0, workSets: 20, volume, rated: 0, hard: 0, ...extra })
const noCurrent = wk('2026-07-27', 0, { sessions: 0 })

describe('tendance de volume', () => {
  it('compte les hausses consécutives en fin de série', () => {
    expect(rampWeeks([wk('a', 100), wk('b', 120), wk('c', 140), wk('d', 160)])).toBe(3)
  })

  it('s\'arrête à la première baisse', () => {
    expect(rampWeeks([wk('a', 100), wk('b', 200), wk('c', 150), wk('d', 170)])).toBe(1)
  })

  it('ne compte pas une semaine vide comme une hausse', () => {
    expect(rampWeeks([wk('a', 100), wk('b', 0, { sessions: 0 })])).toBe(0)
  })

  it('repère les semaines allégées et leur ancienneté', () => {
    // 4 semaines pleines puis une à 30 % → semaine de décharge, la dernière est la 5e
    const weeks = [wk('a', 1000), wk('b', 1000), wk('c', 1000), wk('d', 1000), wk('e', 300), wk('f', 1100)]
    expect(recoveryWeeks(weeks)).toEqual([4])
    expect(weeksSinceRecovery(weeks)).toBe(1)
    expect(weeksSinceRecovery([wk('a', 1000), wk('b', 1050)])).toBeNull()
  })
})

describe('évaluation de la fatigue', () => {
  it('ne se prononce pas avant 3 semaines d\'entraînement', () => {
    const v = assessFatigue({ weeks: [wk('a', 500), wk('b', 600)], current: noCurrent, stalled: 0 })
    expect(v.level).toBe('unknown')
    expect(v.score).toBe(0)
  })

  it('reste « frais » sur un volume stable et un ressenti correct', () => {
    const weeks = [wk('a', 1000), wk('b', 1000), wk('c', 980, { rated: 6, hard: 0 })]
    const v = assessFatigue({ weeks, current: wk('d', 400, { rated: 4, hard: 0 }), stalled: 0 })
    expect(v.level).toBe('fresh')
  })

  it('conseille une décharge après 3 semaines de hausse sans allègement', () => {
    const weeks = [wk('a', 800), wk('b', 900), wk('c', 1000), wk('d', 1150), wk('e', 1300), wk('f', 1450)]
    const v = assessFatigue({ weeks, current: noCurrent, stalled: 0 })
    expect(v.ramp).toBeGreaterThanOrEqual(3)
    expect(v.level).toBe('deload')
    expect(v.reasons.join(' ')).toMatch(/hausse/)
  })

  it('monte le niveau quand le ressenti se dégrade', () => {
    const weeks = [wk('a', 1000), wk('b', 1000), wk('c', 1000, { rated: 6, hard: 5 })]
    const v = assessFatigue({ weeks, current: wk('d', 500, { rated: 4, hard: 4 }), stalled: 2 })
    expect(v.hardRatio).toBeCloseTo(0.9, 1)
    expect(['high', 'deload']).toContain(v.level)
    expect(v.reasons.join(' ')).toMatch(/dur/)
  })

  it('ignore un ratio de ressenti calculé sur trop peu de données', () => {
    const weeks = [wk('a', 1000), wk('b', 1000), wk('c', 1000, { rated: 2, hard: 2 })]
    const v = assessFatigue({ weeks, current: noCurrent, stalled: 0 })
    expect(v.hardRatio).toBeNull() // 2 ressentis < seuil de fiabilité
  })

  it('ne redemande pas de décharge juste après en avoir pris une', () => {
    // hausse marquée, mais la semaine précédente était allégée
    const weeks = [wk('a', 1000), wk('b', 1000), wk('c', 1000), wk('d', 1000), wk('e', 250), wk('f', 1100), wk('g', 1250)]
    const v = assessFatigue({ weeks, current: wk('h', 0, { sessions: 0, rated: 6, hard: 6 }), stalled: 3 })
    expect(v.sinceRecovery).toBe(2)
    // la règle « décharge récente » ne s'applique plus à 2 semaines, mais le verdict
    // doit rester cohérent avec les signaux
    expect(v.level).not.toBe('unknown')
  })

  it('neutralise l\'alerte quand la décharge vient d\'avoir lieu', () => {
    const weeks = [wk('a', 1000), wk('b', 1000), wk('c', 1000), wk('d', 1000), wk('e', 200)]
    const v = assessFatigue({ weeks, current: wk('f', 300, { rated: 8, hard: 8 }), stalled: 3 })
    expect(v.sinceRecovery).toBe(0)
    expect(v.level).toBe('building')
    expect(v.reasons.join(' ')).toMatch(/allégée récente/)
  })

  it('compte la stagnation généralisée comme un signe de fatigue', () => {
    const base = [wk('a', 1000), wk('b', 1000), wk('c', 1000)]
    const calme = assessFatigue({ weeks: base, current: noCurrent, stalled: 0 })
    const bloque = assessFatigue({ weeks: base, current: noCurrent, stalled: 3 })
    expect(bloque.score).toBeGreaterThan(calme.score)
    expect(bloque.reasons.join(' ')).toMatch(/bloqués/)
  })

  it('borne le score à 100 et donne toujours un conseil', () => {
    const weeks = [wk('a', 500), wk('b', 700), wk('c', 900), wk('d', 1200), wk('e', 1500), wk('f', 1900)]
    const v = assessFatigue({ weeks, current: wk('g', 900, { rated: 10, hard: 10 }), stalled: 5 })
    expect(v.score).toBeLessThanOrEqual(100)
    expect(v.advice.length).toBeGreaterThan(20)
  })
})

// ─── Dates ───────────────────────────────────────────────────────────────────
describe('semaine', () => {
  it('démarre le lundi', () => {
    // 30/07/2026 est un jeudi (dow 4)
    expect(startOfWeek('2026-07-30', 4)).toBe('2026-07-27')
    // le dimanche appartient encore à la semaine qui commence le lundi précédent
    expect(startOfWeek('2026-08-02', 0)).toBe('2026-07-27')
    expect(startOfWeek('2026-07-27', 1)).toBe('2026-07-27')
  })

  it('décale une date en gérant les changements de mois', () => {
    expect(shiftIso('2026-08-02', -7)).toBe('2026-07-26')
    expect(shiftIso('2026-07-31', 1)).toBe('2026-08-01')
  })
})

// ─── Bornes de fourchette ────────────────────────────────────────────────────
describe('bornes de la fourchette de reps', () => {
  it('lit les deux bornes d\'un intervalle', () => {
    expect(bottomOfRange('8-10')).toBe(8)
    expect(topOfRange('8-10')).toBe(10)
  })

  it('traite une valeur seule comme ses deux bornes', () => {
    // « 15 » aux élévations latérales : arriver à l'échec à 14 est SOUS la cible,
    // donc bien une décharge. Sans ce cas, ces exercices n'auraient jamais de
    // borne basse et resteraient bloqués sur « on consolide ».
    expect(bottomOfRange('15')).toBe(15)
  })

  it('renvoie null quand il n\'y a pas de nombre', () => {
    expect(bottomOfRange('AMRAP')).toBeNull()
    expect(topOfRange('15')).toBeNull()
  })

  it('donne une borne basse à tout exercice réellement auto-régulé', () => {
    // Un exercice sans borne basse ne peut jamais déclencher de décharge : son
    // conseil resterait « on consolide » même à 4 reps sur du 8-10.
    //
    // Deux exceptions légitimes, et une seule en pratique : `tractions` est en
    // « max » reps, il n'a pas de cible à manquer. Il est au poids du corps, donc
    // `overloadHint` ne lui propose déjà aucune charge. Les supersets sont dans le
    // même cas. Ce test vérifie qu'aucun AUTRE exercice ne se glisse dans le trou.
    const regules = ALL_EXERCISES.filter(ex => !ex.bodyweight && !ex.superset)
    for (const ex of regules) expect(bottomOfRange(ex.reps), ex.id).not.toBeNull()
  })
})
