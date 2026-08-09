import { describe, expect, it } from 'vitest'
import {
  CAT_ORDER, CYCLE, CYCLE_LENGTH, FOOD_BY_ID, KEEPS_DEFAULT, MICRO_REFS, RATIO_DINNER_GYM, RATIO_REST,
  KEEPS_FRESH, RECIPE_BY_ID, STARCHY_IDS, SLOTS_GYM, SLOTS_REST,
} from '../../data/nutritionProgram'
import {
  ADJUST_THRESHOLD, CARRY_MAX_PER_DAY, DEFAULT_WEEK, DEFICIT_MAX, DEFICIT_MIN, STEPS_TT,
  activeRecipes, applyAdjustment, assessTrend, basketTotal, bmrMifflin, buildDay,
  carryAdjustedTarget, dayEnergy, dayIntake, mergeFoods, mergeRecipes, nextMeal,
  resolveDay, slugify, timelineOf, validateFood, validateRecipe, weekBalance,
  CYCLE_EPOCH, cycleIndexOf, dayBurn, dayStatus, DEFAULT_TRAINED, dinnerAdjustment, fmtQty, isDayPlayed,
  macroSplit, macrosOf, microCoverage, mondayOf, proteinTarget, roundMacros, scaleItems,
  adjustPlanFor, applySteps, LEAVE_MAX, removalSteps, adjustRemaining, upcomingPlan, ADJUST_MAX,
  FAT_PER_KG, KCAL_L, KCAL_P, MACRO_BAND, donutArcs, macroGaps, macroTargets,
  builtinWeeks, cookPlaceFor, cookPlan, cookSelection, cookSlotFor, cookSteps, freezableOf, freshItemsOf,
  cookIngredients, expandItems, keepsOf, listDays,
  normalizeWeek,
  selectionTotals, shoppingFrom, shoppingFromWeek, stockOf, weekDayPlans, weekDaysOn, weekGrams,
  sessionBurn, sessionsOn, targetFor, targetOf, tdeeOf, usableDuration,
  workSetCount,
} from '../../lib/nutritionStats'
import type { TrainingLike } from '../../lib/nutritionStats'
import { shiftIso } from '../../utils/sportStats'

// Calculs purs du module nutrition. Le câblage localStorage est testé dans
// test/nuxt/nutritionData.test.ts.

// ─── Macros ──────────────────────────────────────────────────────────────────
describe('macros', () => {
  it('calcule au prorata des grammes', () => {
    // 100 g de filet de poulet = 110 kcal / 23 g de protéines
    const m = macrosOf([{ food: 'filet-de-poulet', g: 200 }])
    expect(Math.round(m.kcal)).toBe(220)
    expect(Math.round(m.p)).toBe(46)
  })

  it('ignore un aliment inconnu au lieu de planter la vue', () => {
    const m = macrosOf([{ food: 'inexistant', g: 500 }, { food: 'pomme', g: 100 }])
    expect(Math.round(m.kcal)).toBe(52)
  })

  it('répartit les calories en pourcentages qui font 100', () => {
    const s = macroSplit({ kcal: 2000, p: 200, g: 200, l: 44 })
    expect(s.p + s.g + s.l).toBeGreaterThanOrEqual(99)
    expect(s.p + s.g + s.l).toBeLessThanOrEqual(101)
  })
})

// ─── Modulation des féculents ────────────────────────────────────────────────
// Régression : la réduction ne doit JAMAIS toucher aux protéines ni aux légumes.
// C'est ce qui protège la masse maigre et la satiété quand les calories baissent.
describe('modulation des féculents', () => {
  const items = [
    { food: 'filet-de-poulet', g: 180 },
    { food: 'riz-basmati', g: 80 },
    { food: 'brocolis', g: 200 },
  ]

  it('ne réduit que les féculents', () => {
    const out = scaleItems(items, RATIO_REST)
    expect(out.find(i => i.food === 'filet-de-poulet')!.g).toBe(180)
    expect(out.find(i => i.food === 'brocolis')!.g).toBe(200)
    expect(out.find(i => i.food === 'riz-basmati')!.g).toBe(55) // 80 × 0,70 arrondi à 5 g
  })

  it('arrondit au multiple de 5 g, pesable à la balance de cuisine', () => {
    for (const it of scaleItems(items, RATIO_DINNER_GYM)) expect(it.g % 5).toBe(0)
  })

  it('laisse les portions intactes avec un ratio de 1', () => {
    expect(scaleItems(items, 1)).toEqual(items)
  })

  it('ne déclare comme modulable aucune source de protéines', () => {
    for (const id of STARCHY_IDS) expect(FOOD_BY_ID[id].cat).toBe('feculents')
  })
})

// ─── Construction d'une journée ──────────────────────────────────────────────
describe('journée', () => {
  it('sert plus de calories un jour avec séance qu\'un jour sans', () => {
    const gym = buildDay(0, true).total.kcal
    const rest = buildDay(0, false).total.kcal
    expect(gym).toBeGreaterThan(rest)
  })

  // Régression : la séance annulée doit retirer la banane ET le shaker, sinon on garde
  // ~220 kcal d'un effort qui n'a pas eu lieu.
  it('retire la banane et le shaker quand la séance saute', () => {
    const slots = buildDay(0, false).meals.map(m => m.slot)
    expect(slots).not.toContain('pre')
    expect(slots).not.toContain('post')
  })

  it('garde la créatine les jours sans séance', () => {
    // La saturation du muscle dépend de la régularité, pas de l'entraînement du jour.
    const rest = buildDay(2, false).meals.flatMap(m => m.items).map(i => i.food)
    const gym = buildDay(0, true).meals.flatMap(m => m.items).map(i => i.food)
    expect(rest).toContain('creatine-monohydrate')
    expect(gym).toContain('creatine-monohydrate')
  })

  it('tient la cible calorique à moins de 100 kcal près sur les 14 jours', () => {
    for (let i = 0; i < CYCLE_LENGTH; i++) {
      const trained = DEFAULT_TRAINED(i)
      const kcal = buildDay(i, trained).total.kcal
      expect(Math.abs(kcal - (trained ? 2180 : 1930))).toBeLessThan(100)
    }
  })

  it('apporte au moins 185 g de protéines chaque jour', () => {
    for (let i = 0; i < CYCLE_LENGTH; i++) {
      expect(roundMacros(buildDay(i, DEFAULT_TRAINED(i)).total).p).toBeGreaterThanOrEqual(185)
    }
  })

  it('boucle sur le cycle pour un index hors bornes', () => {
    expect(buildDay(CYCLE_LENGTH + 3, true).index).toBe(3)
    expect(buildDay(-1, true).index).toBe(CYCLE_LENGTH - 1)
  })
})

// ─── Dépense et cibles ───────────────────────────────────────────────────────
describe('dépense énergétique', () => {
  it('applique Mifflin-St Jeor', () => {
    // 179 cm, 94 kg, 29 ans, homme → 1 919 kcal
    expect(bmrMifflin(94, 179, 29, 'h')).toBe(1919)
  })

  it('renvoie null tant que le profil est incomplet', () => {
    expect(bmrMifflin(94, null, 29, 'h')).toBeNull()
    expect(bmrMifflin(null, 179, 29, 'h')).toBeNull()
  })

  it('creuse un déficit dans les deux configurations', () => {
    const b = bmrMifflin(94, 179, 29, 'h')!
    expect(targetOf(b, true)).toBeLessThan(tdeeOf(b, true))
    expect(targetOf(b, false)).toBeLessThan(tdeeOf(b, false))
  })

  it('vise 2,1 g de protéines par kilo', () => {
    expect(proteinTarget(94)).toBe(197)
  })
})

describe('verdict de tendance', () => {
  it('ne conclut rien sans données', () => {
    expect(assessTrend(null).verdict).toBe('unknown')
  })
  it('valide une perte dans la fourchette', () => {
    expect(assessTrend(-0.5).verdict).toBe('ok')
  })
  it('alerte quand ça descend trop vite — c\'est du muscle qui part', () => {
    expect(assessTrend(-1.4).verdict).toBe('fast')
  })
  it('alerte quand ça ne bouge pas', () => {
    expect(assessTrend(-0.05).verdict).toBe('slow')
  })
})

// ─── Cycle et dates ──────────────────────────────────────────────────────────
describe('position dans le cycle', () => {
  // Le cycle se déduit de la date : aucun « démarrage » à déclencher, donc rien à
  // oublier de lancer et rien à resynchroniser après une pause.
  it('déroule 14 jours puis recommence', () => {
    const monday = CYCLE_EPOCH
    expect(cycleIndexOf(monday)).toBe(0)
    expect(cycleIndexOf(shiftIso(monday, 6))).toBe(6)
    expect(cycleIndexOf(shiftIso(monday, 7))).toBe(7)
    expect(cycleIndexOf(shiftIso(monday, 13))).toBe(13)
    expect(cycleIndexOf(shiftIso(monday, 14))).toBe(0)
  })

  it('donne toujours le même menu pour une date donnée', () => {
    expect(cycleIndexOf('2026-08-06')).toBe(cycleIndexOf('2026-08-06'))
    // Deux semaines d'écart : même position dans le cycle.
    expect(cycleIndexOf('2026-08-06')).toBe(cycleIndexOf('2026-08-20'))
    // Une seule semaine d'écart : l'autre semaine du cycle.
    expect(Math.abs(cycleIndexOf('2026-08-06') - cycleIndexOf('2026-08-13'))).toBe(7)
  })

  it('aligne le lundi du plan sur un vrai lundi', () => {
    // 2026-08-03 est un lundi : sa position doit être un début de semaine du cycle.
    expect([0, 7]).toContain(cycleIndexOf('2026-08-03'))
  })
  it('ancre le démarrage sur un lundi', () => {
    expect(mondayOf('2026-08-06')).toBe('2026-08-03') // jeudi → lundi de la même semaine
    expect(mondayOf('2026-08-03')).toBe('2026-08-03')
    expect(mondayOf('2026-08-09')).toBe('2026-08-03') // dimanche appartient à la semaine qui précède
  })
})

// ─── Liste de courses et budget ──────────────────────────────────────────────
/**
 * Les courses d'une suite de jours du cycle. `shoppingFrom` ne prend que des
 * grammes : agréger les jours est le travail de l'appelant, et ce petit helper
 * évite de garder dans la bibliothèque une deuxième façon de bâtir une liste.
 */
function shoppingFor(indices: number[], trainedFor: (i: number) => boolean) {
  const grams: Record<string, number> = {}
  for (const i of indices) {
    for (const meal of buildDay(i, trainedFor(i)).meals) {
      for (const it of meal.items) grams[it.food] = (grams[it.food] ?? 0) + it.g
    }
  }
  return shoppingFrom(grams)
}
describe('liste de courses', () => {
  const all = Array.from({ length: CYCLE_LENGTH }, (_, i) => i)

  it('agrège toutes les quantités du cycle', () => {
    const list = shoppingFor(all, DEFAULT_TRAINED)
    const lines = list.flatMap(s => s.lines)
    expect(lines.length).toBeGreaterThan(20)
    // 5 g de créatine par jour, 14 jours
    expect(lines.find(l => l.food.id === 'creatine-monohydrate')!.grams).toBe(70)
  })

  it('trie chaque rayon du plus lourd au plus léger', () => {
    for (const { lines } of shoppingFor(all, DEFAULT_TRAINED)) {
      for (let i = 1; i < lines.length; i++) expect(lines[i - 1].grams).toBeGreaterThanOrEqual(lines[i].grams)
    }
  })

  it('achète moins de féculents si les séances sautent', () => {
    const normal = shoppingFor(all, DEFAULT_TRAINED).flatMap(s => s.lines)
    const skipped = shoppingFor(all, () => false).flatMap(s => s.lines)
    const riz = (l: typeof normal) => l.find(x => x.food.id === 'riz-basmati')!.grams
    expect(riz(skipped)).toBeLessThan(riz(normal))
  })

  it('formate les quantités en kg au-delà du kilo', () => {
    expect(fmtQty(850)).toBe('850 g')
    expect(fmtQty(1500)).toBe('1,5 kg')
  })
})

describe('budget', () => {
  const list = shoppingFor([0], DEFAULT_TRAINED)

  it('signale les prix manquants plutôt que de les compter à zéro', () => {
    const { total, missing } = basketTotal(list, {})
    expect(total).toBe(0)
    expect(missing.length).toBeGreaterThan(0)
  })

  it('facture au prorata du poids', () => {
    // 1 kg à 10 €/kg quel que soit le rayon : le total suit le poids total
    const prices = Object.fromEntries(list.flatMap(s => s.lines).map(l => [l.food.id, 10]))
    const grams = list.flatMap(s => s.lines).reduce((n, l) => n + l.grams, 0)
    const { total, missing } = basketTotal(list, prices)
    expect(missing).toHaveLength(0)
    expect(total).toBeCloseTo(grams / 100, 1)
  })

  it('ignore un prix nul ou négatif', () => {
    const { missing } = basketTotal(list, { 'filet-de-poulet': 0 })
    expect(missing).toContain('filet-de-poulet')
  })
})

// ─── Micronutriments ─────────────────────────────────────────────────────────
// Le but de cette vue est de dire ce qui manque VRAIMENT, pas de justifier des gélules :
// ces tests verrouillent le constat (seule la vitamine D est sous la référence).
describe('micronutriments', () => {
  const cov = microCoverage(Array.from({ length: CYCLE_LENGTH }, (_, i) => i), DEFAULT_TRAINED)

  it('couvre chaque nutriment de la table de référence', () => {
    expect(cov.map(c => c.key).sort()).toEqual(Object.keys(MICRO_REFS).sort())
  })

  it('classe du moins couvert au mieux couvert', () => {
    for (let i = 1; i < cov.length; i++) expect(cov[i - 1].pct).toBeLessThanOrEqual(cov[i].pct)
  })

  it('ne trouve que la vitamine D sous la référence', () => {
    expect(cov.filter(c => c.status !== 'ok').map(c => c.key)).toEqual(['vd'])
  })

  it('couvre largement les oméga-3 grâce au poisson gras', () => {
    expect(cov.find(c => c.key === 'o3')!.pct).toBeGreaterThan(100)
  })
})

// ─── Intégrité des données ───────────────────────────────────────────────────
describe('données du plan', () => {
  it('ne référence aucun aliment absent de la table', () => {
    for (const r of Object.values(RECIPE_BY_ID)) {
      for (const it of r.items) expect(FOOD_BY_ID[it.food], `${r.id} → ${it.food}`).toBeDefined()
    }
  })

  it('ne compte aucune calorie pour la créatine', () => {
    expect(FOOD_BY_ID['creatine-monohydrate'].kcal).toBe(0)
  })
})

// ─── Dépense réelle d'une séance ─────────────────────────────────────────────
// Le cœur du recalage dynamique : une séance expédiée ne vaut pas une séance dense.
const KG = 94
const BMR = 1919

const session = (over: Partial<TrainingLike> & { sets?: number } = {}): TrainingLike => ({
  at: '2026-08-06T13:00',
  durationMin: 55,
  entries: Array.from({ length: over.sets ?? 18 }, () => ({ sets: [{}] })),
  ...over,
})

describe('dépense d\'une séance', () => {
  it('compte les séries de travail sans l\'échauffement', () => {
    const s: TrainingLike = { at: '2026-08-06T13:00', entries: [{ sets: [{ warm: true }, {}, {}] }, { sets: [{}] }] }
    expect(workSetCount(s)).toBe(3)
  })

  it('écarte les durées aberrantes du journal', () => {
    // Le journal contient une séance saisie à 9 min pour 6 exercices : inexploitable.
    expect(usableDuration(session({ durationMin: 9 }))).toBe(55)
    expect(usableDuration(session({ durationMin: 400 }))).toBe(55)
    expect(usableDuration(session({ durationMin: 70 }))).toBe(70)
  })

  it('coûte plus cher quand la séance est plus dense', () => {
    const lente = sessionBurn(session({ durationMin: 70, sets: 14 }), KG, BMR)
    const dense = sessionBurn(session({ durationMin: 70, sets: 32 }), KG, BMR)
    expect(dense).toBeGreaterThan(lente)
  })

  it('coûte plus cher quand la séance est plus longue, à densité égale', () => {
    const courte = sessionBurn(session({ durationMin: 40, sets: 18 }), KG, BMR)
    const longue = sessionBurn(session({ durationMin: 80, sets: 36 }), KG, BMR)
    expect(longue).toBeGreaterThan(courte)
  })

  it('ajoute le coût des sprints', () => {
    const sans = sessionBurn(session(), KG, BMR)
    const avec = sessionBurn(session({ sprint: [{ kind: 'sprint', count: 4, duration: '30' }] }), KG, BMR)
    expect(avec).toBeGreaterThan(sans)
  })

  // Régression : sans soustraire le métabolisme de base sur la durée de la séance,
  // on compte deux fois la même heure et on surestime d'environ 80 kcal.
  it('renvoie une dépense NETTE, pas brute', () => {
    const burn = sessionBurn(session({ durationMin: 60, sets: 27 }), KG, BMR)
    const brut = 6 * KG // 6 METs × 94 kg × 1 h
    expect(burn).toBeLessThan(brut)
    expect(burn).toBeGreaterThan(brut - 150)
  })

  it('reste dans une fourchette plausible pour une vraie séance', () => {
    expect(sessionBurn(session({ durationMin: 54, sets: 18 }), KG, BMR)).toBeGreaterThan(250)
    expect(sessionBurn(session({ durationMin: 54, sets: 18 }), KG, BMR)).toBeLessThan(600)
  })

  it('cumule plusieurs séances dans la même journée', () => {
    const one = sessionBurn(session(), KG, BMR)
    expect(dayBurn([session(), session()], KG, BMR)).toBe(one * 2)
    expect(dayBurn([], KG, BMR)).toBe(0)
  })

  it('ne retient que les séances de la date demandée', () => {
    const all = [{ at: '2026-08-06T13:00' }, { at: '2026-08-06T19:00' }, { at: '2026-08-07T13:00' }]
    expect(sessionsOn(all, '2026-08-06')).toHaveLength(2)
  })
})

// ─── Cible dynamique ─────────────────────────────────────────────────────────
describe('cible calorique dynamique', () => {
  // Régression : les deux modes de calcul doivent coïncider, sinon un jour bascule
  // brutalement de cible quand une séance est enregistrée puis supprimée.
  it('monte avec la dépense mesurée', () => {
    expect(targetFor(BMR, 550)).toBeGreaterThan(targetFor(BMR, 350))
  })

  it('reste proche du forfait pour une séance moyenne', () => {
    expect(Math.abs(targetFor(BMR, 440) - targetOf(BMR, true))).toBeLessThanOrEqual(60)
  })
})

// ─── Dépense décomposée ──────────────────────────────────────────────────────
// Trois postes explicites plutôt qu'un facteur d'activité opaque. C'est ce qui donne
// un sens au bouton « télétravail » : une journée où l'on marche moins, pas un
// coefficient magique.
describe('dépense décomposée', () => {
  const base = { bmr: BMR, kg: KG }

  it('sépare métabolisme, pas et séance', () => {
    const e = dayEnergy({ ...base, tt: true, steps: 4000, sessionKcal: 400 })
    expect(e.baseKcal + e.stepsKcal + e.sessionKcal).toBe(e.need)
    expect(e.target).toBe(Math.round((e.need - e.deficit) / 10) * 10)
  })

  it('fait baisser la cible en télétravail, à séance égale', () => {
    const tt = dayEnergy({ ...base, tt: true, sessionKcal: 440 })
    const site = dayEnergy({ ...base, tt: false, sessionKcal: 440 })
    expect(tt.target).toBeLessThan(site.target)
  })

  it('estime les pas tant qu\'ils ne sont pas saisis, et le signale', () => {
    const est = dayEnergy({ ...base, tt: true })
    expect(est.stepsEstimated).toBe(true)
    expect(est.steps).toBe(STEPS_TT)
    const saisi = dayEnergy({ ...base, tt: true, steps: 11000 })
    expect(saisi.stepsEstimated).toBe(false)
    expect(saisi.stepsKcal).toBeGreaterThan(est.stepsKcal)
  })

  it('borne le déficit pour qu\'il reste tenable', () => {
    const petit = dayEnergy({ ...base, tt: true, steps: 0, sessionKcal: 0 })
    const gros = dayEnergy({ ...base, tt: false, steps: 25000, sessionKcal: 900 })
    expect(petit.deficit).toBeGreaterThanOrEqual(DEFICIT_MIN)
    expect(gros.deficit).toBeLessThanOrEqual(DEFICIT_MAX)
  })

  it('garde le déficit hebdomadaire dans la fourchette de perte visée', () => {
    // Semaine type : salle lun/mar/jeu/ven, télétravail mar/ven.
    const week = [
      { tt: false, s: 440 }, { tt: true, s: 440 }, { tt: false, s: 0 },
      { tt: false, s: 440 }, { tt: true, s: 440 }, { tt: false, s: 0 }, { tt: false, s: 0 },
    ]
    const total = week.reduce((n, d) => n + dayEnergy({ ...base, tt: d.tt, sessionKcal: d.s }).deficit, 0)
    const kgWeek = total / 7700
    expect(kgWeek).toBeGreaterThan(0.4)
    expect(kgWeek).toBeLessThan(0.8)
  })
})

// ─── Planning ────────────────────────────────────────────────────────────────
describe('semaine type et exceptions', () => {
  it('sépare la salle et le télétravail — un jour peut être les deux', () => {
    // Mardi : télétravail ET séance.
    const mardi = resolveDay('2026-08-04', DEFAULT_WEEK)
    expect(mardi.gym).toBe(true)
    expect(mardi.tt).toBe(true)
  })

  it('applique la semaine type par défaut', () => {
    const mercredi = resolveDay('2026-08-05', DEFAULT_WEEK)
    expect(mercredi.gym).toBe(false)
    expect(mercredi.tt).toBe(false)
  })

  it('laisse une exception écraser la semaine type', () => {
    const d = resolveDay('2026-08-05', DEFAULT_WEEK, { gym: true, steps: 12000 })
    expect(d.gym).toBe(true)
    expect(d.steps).toBe(12000)
    expect(d.overridden).toBe(true)
  })

  it('permet d\'imposer un plat sur un jour donné', () => {
    const d = resolveDay('2026-08-05', DEFAULT_WEEK, { dinner: 'din-saumon' })
    expect(d.menu.dinner).toBe('din-saumon')
    expect(d.menu.lunch).toBeUndefined()
  })
})

// ─── Bibliothèque ────────────────────────────────────────────────────────────
describe('bibliothèque', () => {
  it('ajoute un aliment perso sans toucher aux livrés', () => {
    const foods = mergeFoods([{ id: 'skyr', name: 'Skyr', cat: 'laitiers', kcal: 64, p: 11, g: 4, l: 0.2 }])
    expect(foods.skyr.name).toBe('Skyr')
    expect(foods['filet-de-poulet']).toBeDefined()
  })

  it('applique une modification sur un aliment livré', () => {
    const foods = mergeFoods([], { 'filet-de-poulet': { kcal: 120 } })
    expect(foods['filet-de-poulet'].kcal).toBe(120)
    expect(foods['filet-de-poulet'].name).toBe('Filet de poulet')
  })

  it('marque un plat mis de côté sans le supprimer', () => {
    const recipes = mergeRecipes([], {}, ['din-saumon'])
    expect(recipes['din-saumon'].disabled).toBe(true)
    expect(recipes['din-saumon'].name).toBeTruthy()
    expect(activeRecipes({ foods: FOOD_BY_ID, recipes }, 'diner').map(r => r.id)).not.toContain('din-saumon')
  })

  it('construit la journée avec la bibliothèque fournie', () => {
    const recipes = mergeRecipes([], { 'din-poisson': { name: 'Mon poisson', items: [{ food: 'saumon', g: 200 }] } })
    const day = buildDay(0, true, { foods: FOOD_BY_ID, recipes })
    expect(day.meals.find(m => m.slot === 'dinner')!.name).toBe('Mon poisson')
  })

  it('permet d\'imposer un plat sur une journée', () => {
    const day = buildDay(0, true, undefined, { dinner: 'din-saumon' })
    expect(day.meals.find(m => m.slot === 'dinner')!.recipeId).toBe('din-saumon')
  })

  it('génère des identifiants uniques et lisibles', () => {
    expect(slugify('Poulet rôti & riz')).toBe('poulet-roti-riz')
    expect(slugify('Poulet', ['poulet'])).toBe('poulet-2')
  })

  // Régression : une faute de frappe sur une étiquette passait sans broncher et
  // faussait ensuite tous les totaux du plat.
  it('refuse un aliment dont les macros ne collent pas aux calories', () => {
    expect(validateFood({ name: 'X', kcal: 100, p: 50, g: 50, l: 50 })).not.toHaveLength(0)
    expect(validateFood({ name: 'X', kcal: 110, p: 23, g: 0, l: 1.8 })).toHaveLength(0)
  })

  it('refuse un plat vide ou avec un ingrédient inconnu', () => {
    const lib = { foods: FOOD_BY_ID, recipes: RECIPE_BY_ID }
    expect(validateRecipe({ name: 'X', items: [] }, lib)).not.toHaveLength(0)
    expect(validateRecipe({ name: 'X', items: [{ food: 'inexistant', g: 100 }] }, lib)).not.toHaveLength(0)
    expect(validateRecipe({ name: 'X', items: [{ food: 'saumon', g: 150 }] }, lib)).toHaveLength(0)
  })
})

// ─── Écarts et rattrapage ────────────────────────────────────────────────────
// La question est revenue plusieurs fois : oui, un écart se rattrape — mais lissé
// sur les jours restants, jamais en coupant brutalement le lendemain.
describe('rattrapage d\'un écart', () => {
  const d = (target: number, eaten: number, closed: boolean) => ({ iso: 'x', target, eaten, closed })

  it('ne dit rien quand la semaine est dans les clous', () => {
    const b = weekBalance([d(2000, 2010, true), d(2000, 0, false)])
    expect(b.perDay).toBe(0)
  })

  it('étale l\'écart sur les jours restants au lieu de tout couper le lendemain', () => {
    const b = weekBalance([d(2000, 2600, true), d(2000, 0, false), d(2000, 0, false), d(2000, 0, false)])
    expect(b.surplus).toBe(600)
    expect(b.perDay).toBe(-200)
    expect(Math.abs(b.perDay)).toBeLessThan(b.surplus)
  })

  it('plafonne le report pour qu\'une journée reste vivable', () => {
    const b = weekBalance([d(2000, 3200, true), d(2000, 0, false)])
    expect(Math.abs(b.perDay)).toBeLessThanOrEqual(CARRY_MAX_PER_DAY)
    expect(b.capped).toBe(true)
  })

  it('renonce au rattrapage au-delà d\'un écart déraisonnable', () => {
    const b = weekBalance([d(2000, 3800, true), d(2000, 0, false), d(2000, 0, false)])
    expect(b.giveUp).toBe(true)
    expect(b.perDay).toBe(0)
  })

  it('propose de remonter quand la semaine est trop basse', () => {
    const b = weekBalance([d(2200, 1700, true), d(2200, 0, false), d(2200, 0, false)])
    expect(b.surplus).toBeLessThan(0)
    expect(b.perDay).toBeGreaterThan(0)
  })

  it('ne descend jamais la cible sous le plancher, quel que soit le report', () => {
    expect(carryAdjustedTarget(2000, -900)).toBeGreaterThanOrEqual(Math.round(2000 * 0.85) - 10)
  })
})

// ─── Frise de la journée ─────────────────────────────────────────────────────
describe('frise de la journée', () => {
  it('mélange repas du plan et extras dans l\'ordre des heures', () => {
    const day = buildDay(0, true)
    const line = timelineOf(day, ['pdj'], [
      { id: 'e1', label: 'Café gourmand', kcal: 250, p: 0, g: 0, l: 0, time: '15:00' },
    ])
    const times = line.map(e => e.time)
    expect(line.length).toBe(day.meals.length + 1)
    expect(times.indexOf('15:00')).toBeGreaterThan(0)
    expect(line.find(e => e.slot === 'pdj')!.done).toBe(true)
  })

  it('désigne le prochain repas non validé', () => {
    const day = buildDay(0, true)
    const line = timelineOf(day, ['pdj'], [])
    expect(nextMeal(line)!.slot).not.toBe('pdj')
  })
})

// ─── Consommation du jour ────────────────────────────────────────────────────
describe('ce qui a été mangé', () => {
  const day = buildDay(0, true)

  it('ne compte que les repas validés', () => {
    const vide = dayIntake(day, [], [], 2200)
    expect(vide.eaten.kcal).toBe(0)
    expect(vide.remaining).toBe(2200)
    const partiel = dayIntake(day, ['pdj'], [], 2200)
    expect(partiel.eaten.kcal).toBeGreaterThan(0)
    expect(partiel.remaining).toBeLessThan(2200)
  })

  it('ajoute les extras au compteur', () => {
    const avec = dayIntake(day, [], [{ id: 'e', label: 'Resto', kcal: 800, p: 30, g: 60, l: 40 }], 2200)
    expect(avec.eaten.kcal).toBe(800)
    expect(avec.eaten.p).toBe(30)
    expect(avec.remaining).toBe(1400)
  })

  it('signale le dépassement sans casser la barre', () => {
    const trop = dayIntake(day, [], [{ id: 'e', label: 'x', kcal: 4000, p: 0, g: 0, l: 0 }], 2000)
    expect(trop.remaining).toBeLessThan(0)
    expect(trop.progress).toBeLessThanOrEqual(1.5)
  })
})

describe('statut de la journée', () => {
  it('ne déclare pas une séance ratée avant qu\'elle ait eu lieu', () => {
    expect(dayStatus({ planned: true, recorded: 0, skipped: false, isPast: false })).toBe('pending')
    expect(dayStatus({ planned: true, recorded: 0, skipped: false, isPast: true })).toBe('missed')
  })
  it('reconnaît une séance enregistrée hors planning', () => {
    expect(dayStatus({ planned: false, recorded: 1, skipped: false, isPast: true })).toBe('bonus')
  })
  it('laisse la séance enregistrée primer sur le marquage manuel', () => {
    expect(dayStatus({ planned: true, recorded: 1, skipped: true, isPast: true })).toBe('done')
  })
  it('bascule la journée après l\'heure de la séance de midi', () => {
    expect(isDayPlayed('2026-08-06', '2026-08-06', 10)).toBe(false)
    expect(isDayPlayed('2026-08-06', '2026-08-06', 16)).toBe(true)
    expect(isDayPlayed('2026-08-05', '2026-08-06', 8)).toBe(true)
    expect(isDayPlayed('2026-08-07', '2026-08-06', 23)).toBe(false)
  })
})

// ─── Ajustement du dîner ─────────────────────────────────────────────────────
describe('ajustement du dîner', () => {
  const day = buildDay(0, true)
  const dinner = day.meals.find(m => m.slot === 'dinner')!

  it('ne dit rien quand l\'écart tient dans l\'incertitude du calcul', () => {
    expect(dinnerAdjustment(day.total.kcal, day.total.kcal + ADJUST_THRESHOLD - 1, dinner)).toBeNull()
  })

  it('propose une portion plus petite quand la séance a moins coûté que prévu', () => {
    const a = dinnerAdjustment(day.total.kcal, day.total.kcal - 150, dinner)!
    expect(a.applied).toBeLessThan(0)
    expect(a.toG).toBeLessThan(a.fromG)
    expect(a.label).toContain('au lieu de')
  })

  it('propose une portion plus grande quand la séance a plus coûté', () => {
    const a = dinnerAdjustment(day.total.kcal, day.total.kcal + 150, dinner)!
    expect(a.applied).toBeGreaterThan(0)
    expect(a.toG).toBeGreaterThan(a.fromG)
  })

  it('agit sur un féculent, jamais sur les protéines', () => {
    const a = dinnerAdjustment(day.total.kcal, day.total.kcal - 150, dinner)!
    expect(STARCHY_IDS).toContain(a.foodId!)
  })

  // Régression : sans plancher, un écart important vidait l'assiette de son féculent.
  it('ne descend pas la portion sous 40 % ni au-dessus de 180 %', () => {
    const bas = dinnerAdjustment(day.total.kcal, day.total.kcal - 2000, dinner)!
    const haut = dinnerAdjustment(day.total.kcal, day.total.kcal + 2000, dinner)!
    expect(bas.toG).toBeGreaterThanOrEqual(bas.fromG * 0.4 - 5)
    expect(haut.toG).toBeLessThanOrEqual(haut.fromG * 1.8 + 5)
  })

  it('arrondit la portion à 5 g près', () => {
    const a = dinnerAdjustment(day.total.kcal, day.total.kcal - 137, dinner)!
    expect(a.toG % 5).toBe(0)
  })

  it('applique l\'ajustement au plan et recalcule les totaux', () => {
    const a = dinnerAdjustment(day.total.kcal, day.total.kcal - 150, dinner)!
    const adjusted = applyAdjustment(day, a)
    expect(adjusted.total.kcal).toBeLessThan(day.total.kcal)
    expect(adjusted.meals.find(m => m.slot === 'dinner')!.adjusted).toBe(true)
    // On n'a touché qu'au féculent : les protéines ne bougent qu'à la marge (un féculent
    // en apporte un peu), jamais assez pour passer sous la cible.
    expect(day.total.p - adjusted.total.p).toBeLessThan(5)
    expect(adjusted.total.p).toBeGreaterThan(190)
  })

  it('laisse le plan intact sans ajustement', () => {
    expect(applyAdjustment(day, null)).toBe(day)
  })
})

// ─── Repas cuisinés d'avance ─────────────────────────────────────────────────
// Le week-end, tout est cuisiné d'un coup et les portions sont figées : « 165 g au
// lieu de 255 g » devient inapplicable. La consigne doit devenir un retrait.
describe('boîtes assemblées à l\'avance', () => {
  const day = buildDay(0, true)

  it('dit quoi laisser dans la boîte au lieu de donner un poids à peser', () => {
    const plan = adjustPlanFor(day, day.total.kcal - 150, 'assembled')!
    expect(plan.portion).toBeNull()
    expect(plan.steps.length).toBeGreaterThan(0)
    expect(plan.steps[0].label).toContain('Laisse')
    expect(plan.steps[0].kcal).toBeLessThan(0)
  })

  it('donne un poids à peser quand les féculents sont à part', () => {
    const plan = adjustPlanFor(day, day.total.kcal - 150, 'separate')!
    expect(plan.portion).not.toBeNull()
    expect(plan.steps).toHaveLength(0)
  })

  // Régression : sans plafond, la consigne devenait « laisse tout le riz », ce qui
  // revient à ne pas l'avoir cuisiné.
  it('ne fait jamais laisser plus de la moitié d\'une portion', () => {
    const steps = removalSteps(day, 5000)
    const dinner = day.meals.find(m => m.slot === 'dinner')!
    const starchy = dinner.items.find(i => STARCHY_IDS.includes(i.food))!
    const step = steps.find(s => s.slot === 'dinner' && s.kind === 'partial')!
    const leftG = -step.kcal / (FOOD_BY_ID[starchy.food].kcal / 100)
    expect(leftG).toBeLessThanOrEqual(starchy.g * LEAVE_MAX)
  })

  it('enchaîne sur les repas annexes quand le féculent ne suffit pas', () => {
    const steps = removalSteps(day, 600)
    expect(steps.some(s => s.kind === 'drop')).toBe(true)
    // Le fromage blanc du soir passe en dernier : c'est la caséine nocturne.
    const drops = steps.filter(s => s.kind === 'drop').map(s => s.slot)
    if (drops.includes('night')) expect(drops.indexOf('snack')).toBeLessThan(drops.indexOf('night'))
  })

  it('propose un ajout simple quand la séance a coûté plus cher', () => {
    const plan = adjustPlanFor(day, day.total.kcal + 150, 'assembled')!
    expect(plan.steps[0].kind).toBe('add')
    expect(plan.steps[0].kcal).toBeGreaterThan(0)
  })

  it('ne touche jamais aux protéines, même en retirant beaucoup', () => {
    const plan = adjustPlanFor(day, day.total.kcal - 300, 'assembled')!
    const after = applySteps(day, plan)
    expect(after.total.p).toBeGreaterThan(170)
  })

  it('recalcule les totaux pour refléter ce qui sera vraiment mangé', () => {
    const target = day.total.kcal - 150
    const plan = adjustPlanFor(day, target, 'assembled')!
    const after = applySteps(day, plan)
    expect(after.total.kcal).toBeLessThan(day.total.kcal)
    expect(Math.abs(after.total.kcal - target)).toBeLessThan(80)
  })

  it('supprime réellement le repas sauté du plan', () => {
    const plan = adjustPlanFor(day, day.total.kcal - 300, 'assembled')!
    const after = applySteps(day, plan)
    for (const s of plan.steps.filter(x => x.kind === 'drop')) {
      expect(after.meals.map(m => m.slot)).not.toContain(s.slot)
    }
  })

  it('ne dit rien quand l\'écart est négligeable, quel que soit le mode', () => {
    expect(adjustPlanFor(day, day.total.kcal + 20, 'assembled')).toBeNull()
    expect(adjustPlanFor(day, day.total.kcal + 20, 'separate')).toBeNull()
  })
})

// ─── Horaires ────────────────────────────────────────────────────────────────
describe('horaires des repas', () => {
  const minutes = (t: string) => {
    const m = t.match(/(\d{1,2})\s*h?\s*(\d{2})?/)!
    return Number(m[1]) * 60 + Number(m[2] ?? 0)
  }

  it('rien avant 10 h : lever à 8 h, travail à 9 h, et rien ne passe avant', () => {
    for (const slots of [SLOTS_GYM, SLOTS_REST]) {
      for (const s of slots) expect(minutes(s.time)).toBeGreaterThanOrEqual(600)
    }
  })

  it('les horaires sont strictement croissants dans chaque journée', () => {
    for (const slots of [SLOTS_GYM, SLOTS_REST]) {
      const t = slots.map(s => minutes(s.time))
      expect(t).toEqual([...t].sort((a, b) => a - b))
    }
  })

  it('le déjeuner tombe à 13 h 40 les deux types de jours — c\'est une contrainte, pas un choix', () => {
    for (const slots of [SLOTS_GYM, SLOTS_REST]) {
      expect(slots.find(s => s.id === 'lunch')!.time).toBe('13 h 40')
    }
  })

  it('la banane est passée avec le petit-déjeuner, pas en prise séparée à 11 h', () => {
    const pdj = minutes(SLOTS_GYM.find(s => s.id === 'pdj')!.time)
    const pre = minutes(SLOTS_GYM.find(s => s.id === 'pre')!.time)
    expect(pre - pdj).toBeLessThanOrEqual(15)
  })

  it('« 10 h » sans minutes est bien ordonné par la frise', () => {
    // Le format français abrège « 10 h 00 » en « 10 h » : la frise doit quand même
    // le placer avant 10 h 05, et pas le renvoyer en fin de journée.
    const day = buildDay(0, true)
    const line = timelineOf(day, [], [])
    const t = line.map(e => minutes(e.time))
    expect(t).toEqual([...t].sort((a, b) => a - b))
    expect(t[0]).toBe(600)
  })
})

// ─── Ajustement sur ce qui reste ─────────────────────────────────────────────
describe('adjustRemaining', () => {
  const day = buildDay(0, true)
  const slots = day.meals.map(m => m.slot)

  it('upcomingPlan retire les repas validés et recalcule le total', () => {
    const rest = upcomingPlan(day, [slots[0]])
    expect(rest.meals).toHaveLength(day.meals.length - 1)
    expect(rest.total.kcal).toBeLessThan(day.total.kcal)
    expect(rest.total.kcal).toBeCloseTo(day.total.kcal - day.meals[0].macros.kcal, 0)
  })

  it('ne propose rien quand tous les repas sont validés', () => {
    expect(adjustRemaining(day, 1500, slots, day.total.kcal, 'assembled')).toBeNull()
  })

  it('ne retire pas deux fois un écart déjà rattrapé', () => {
    // Cible 400 kcal sous le plan. Journée entière : il faut retirer ~400.
    const target = Math.round(day.total.kcal) - 400
    const naif = adjustPlanFor(day, target, 'assembled')!
    expect(naif.covered).toBeLessThan(0)

    // Même journée, mais le déjeuner a été mangé ALLÉGÉ de 400 kcal : il ne reste
    // plus rien à corriger le soir.
    const lunch = day.meals.find(m => m.slot === 'lunch')!
    const eatenSoFar = day.meals
      .filter(m => ['pdj', 'pre', 'post', 'lunch'].includes(m.slot))
      .reduce((n, m) => n + m.macros.kcal, 0) - 400
    const reste = adjustRemaining(day, target, ['pdj', 'pre', 'post', 'lunch'], eatenSoFar, 'assembled')
    expect(lunch).toBeTruthy()
    expect(reste).toBeNull()
  })

  it('coupe bien le soir quand rien n\'a encore été mangé', () => {
    const target = Math.round(day.total.kcal) - 400
    const plan = adjustRemaining(day, target, [], 0, 'assembled')!
    expect(plan.covered).toBeLessThan(0)
    expect(plan.steps.every(st => slots.includes(st.slot))).toBe(true)
  })

  it('un extra de la matinée se paie le soir, dans la limite du plafond', () => {
    const target = Math.round(day.total.kcal)
    // 500 kcal notés en extra, aucun repas validé : il faut retirer 500 kcal sur ce
    // qui reste. ADJUST_MAX plafonne à 300 — au-delà, retirer plus rendrait le dîner
    // ridicule, et le report hebdomadaire prend le relais.
    const plan = adjustRemaining(day, target, [], 500, 'assembled')!
    expect(plan.covered).toBeLessThan(0)
    expect(Math.abs(plan.delta)).toBe(ADJUST_MAX)
  })
})

// ─── Cibles par macro ────────────────────────────────────────────────────────
describe('macroTargets', () => {
  it('protéines et lipides sortent du poids de corps, les glucides prennent le reste', () => {
    const t = macroTargets(94, 2000)
    expect(t.p).toBe(Math.round(94 * 2.1))
    expect(t.l).toBe(Math.round(94 * FAT_PER_KG))
    // Le total doit retomber sur la cible, à l'arrondi près.
    const kcal = t.p * KCAL_P + t.g * 4 + t.l * KCAL_L
    expect(Math.abs(kcal - 2000)).toBeLessThan(8)
  })

  it('ne propose jamais de glucides négatifs sur une cible très basse', () => {
    const t = macroTargets(94, 900) // protéines + lipides dépassent déjà 900 kcal
    expect(t.g).toBe(0)
  })
})

describe('macroGaps', () => {
  const targets = macroTargets(94, 2000)

  it('signale un manque de protéines', () => {
    const gaps = macroGaps({ kcal: 0, p: targets.p - 60, g: targets.g, l: targets.l }, targets)
    const p = gaps.find(x => x.key === 'p')!
    expect(p.tone).toBe('low')
    expect(p.delta).toBe(-60)
    expect(p.advice).toContain('fromage blanc')
  })

  it('ne reproche jamais un excès de protéines', () => {
    const gaps = macroGaps({ kcal: 0, p: targets.p + 80, g: targets.g, l: targets.l }, targets)
    expect(gaps.find(x => x.key === 'p')!.tone).toBe('ok')
  })

  it('signale un excès de glucides et dit où couper', () => {
    const gaps = macroGaps({ kcal: 0, p: targets.p, g: Math.round(targets.g * 1.4), l: targets.l }, targets)
    const g = gaps.find(x => x.key === 'g')!
    expect(g.tone).toBe('high')
    expect(g.advice).toContain('jamais sur les protéines')
  })

  it('signale un plancher lipidique non atteint', () => {
    const gaps = macroGaps({ kcal: 0, p: targets.p, g: targets.g, l: Math.round(targets.l * 0.5) }, targets)
    const l = gaps.find(x => x.key === 'l')!
    expect(l.tone).toBe('low')
    expect(l.advice).toMatch(/hormonale/)
  })

  it('tolère les petits écarts : le comptage se trompe déjà de 10 %', () => {
    const near = Math.round(targets.g * (1 + MACRO_BAND * 0.8))
    expect(macroGaps({ kcal: 0, p: targets.p, g: near, l: targets.l }, targets).find(x => x.key === 'g')!.tone).toBe('ok')
  })

  it('encaisse une cible vide sans planter', () => {
    const gaps = macroGaps({ kcal: 0, p: 0, g: 0, l: 0 }, { p: 0, g: 0, l: 0, kcal: 0 })
    expect(gaps).toHaveLength(3)
    expect(gaps.every(g => Number.isFinite(g.pct))).toBe(true)
  })
})

describe('donutArcs', () => {
  it('enchaîne les arcs sans trou ni recouvrement', () => {
    const arcs = donutArcs({ kcal: 0, p: 100, g: 200, l: 50 }, 2000)
    expect(arcs).toHaveLength(3)
    expect(arcs[0].from).toBe(0)
    expect(arcs[0].to).toBeCloseTo(arcs[1].from, 6)
    expect(arcs[1].to).toBeCloseTo(arcs[2].from, 6)
  })

  it('la fin du dernier arc est la progression totale', () => {
    // 100 g P + 200 g G + 50 g L = 400 + 800 + 450 = 1650 kcal sur 2000.
    const arcs = donutArcs({ kcal: 0, p: 100, g: 200, l: 50 }, 2000)
    expect(arcs.at(-1)!.to).toBeCloseTo(1650 / 2000, 6)
  })

  it('laisse dépasser au-delà de la cible plutôt que de tronquer', () => {
    const arcs = donutArcs({ kcal: 0, p: 200, g: 400, l: 100 }, 2000)
    expect(arcs.at(-1)!.to).toBeGreaterThan(1)
  })

  it('renvoie une liste vide sans cible', () => {
    expect(donutArcs({ kcal: 0, p: 100, g: 100, l: 30 }, 0)).toEqual([])
  })
})

// ─── Semaine type, courses et cuisine ────────────────────────────────────────
const GYM_WEEK = [true, true, false, true, true, false, false]
const NO_GYM = [false, false, false, false, false, false, false]
const A = () => builtinWeeks()[0]

describe('semaines livrées', () => {
  it('découpe le cycle de quatorze jours en deux semaines de sept', () => {
    const [a, b] = builtinWeeks()
    expect(a.days).toHaveLength(7)
    expect(b.days).toHaveLength(7)
    expect(a.days[0].slots.lunch).toBe(CYCLE[0].lunch)
    expect(b.days[0].slots.lunch).toBe(CYCLE[7].lunch)
  })

  it('les marque comme livrées : elles se réinitialisent, elles ne se perdent pas', () => {
    for (const w of builtinWeeks()) expect(w.builtin).toBe(true)
  })

  it('normalise une semaine tronquée sans lever d\'erreur', () => {
    const w = normalizeWeek({ id: 'x', days: [{ slots: { lunch: 'boite-a' } }] })!
    expect(w.days).toHaveLength(7)
    expect(w.days[6]).toEqual({ off: false, slots: {} })
    expect(w.name).toBe('Ma semaine')
  })

  it('refuse ce qui n\'est pas une semaine', () => {
    expect(normalizeWeek(null)).toBeNull()
    expect(normalizeWeek({ id: 'x' })).toBeNull()
  })
})

describe('ce que la semaine impose', () => {
  it('compte une portion par repas principal réellement prévu', () => {
    const sel = cookSelection(A(), GYM_WEEK)
    expect(Object.values(sel).reduce((a, b) => a + b, 0)).toBe(14)
    for (const id of Object.keys(sel)) expect(['boite', 'diner']).toContain(RECIPE_BY_ID[id].kind)
  })

  it('un dîner minute compte quand même : il s\'achète et se cuisine', () => {
    const sel = cookSelection(A(), GYM_WEEK)
    expect(Object.keys(sel).some(id => !RECIPE_BY_ID[id].batch)).toBe(true)
  })

  it('les collations restent hors sélection : on ne choisit pas son porridge', () => {
    const sel = cookSelection(A(), GYM_WEEK)
    expect(Object.keys(sel)).not.toContain('pdj')
    expect(Object.keys(sel)).not.toContain('col-post')
  })

  it('un jour d\'absence ne coûte ni portion ni course', () => {
    const week = A()
    week.days[5].off = true
    week.days[6].off = true
    expect(weekDaysOn(week)).toBe(5)
    const sel = cookSelection(week, GYM_WEEK)
    expect(Object.values(sel).reduce((a, b) => a + b, 0)).toBe(10)
    const grams = weekGrams(week, GYM_WEEK)
    const plein = weekGrams(A(), GYM_WEEK)
    expect(grams['flocons-d-avoine']).toBeLessThan(plein['flocons-d-avoine'])
  })

  it('une surcharge de créneau change le plat servi', () => {
    const week = A()
    week.days[0].slots.pdj = 'col-aprem-repos'
    const plan = weekDayPlans(week, GYM_WEEK)[0]!
    expect(plan.meals.find(m => m.slot === 'pdj')!.recipeId).toBe('col-aprem-repos')
  })
})

describe('les courses de la semaine', () => {
  it('couvre TOUS les aliments de la semaine, petit-déjeuner compris', () => {
    // Le vrai test de la liste : ne pas rentrer du magasin sans petit-déjeuner.
    // Huit aliments manquaient jadis — avoine, fromage blanc, whey, fruits rouges,
    // banane, créatine, pomme, amandes — parce qu'ils n'étaient dans aucun plat.
    const requis = new Set<string>()
    for (const plan of weekDayPlans(A(), GYM_WEEK)) {
      for (const m of plan!.meals) for (const it of m.items) requis.add(it.food)
    }
    const achetes = new Set(shoppingFromWeek(A(), GYM_WEEK).flatMap(c => c.lines).map(l => l.food.id))
    expect([...requis].filter(f => !achetes.has(f))).toEqual([])
  })

  it('n\'achète ni banane ni shaker pour les jours sans séance', () => {
    const avec = weekGrams(A(), GYM_WEEK)
    const sans = weekGrams(A(), NO_GYM)
    expect(sans['banane']).toBeUndefined()
    expect(avec['banane']).toBe(4 * 120)
  })

  it('achète moins de féculents quand les séances sautent', () => {
    expect(weekGrams(A(), NO_GYM)['riz-basmati']).toBeLessThan(weekGrams(A(), GYM_WEEK)['riz-basmati'])
  })

  it('additionne un ingrédient partagé sur une seule ligne', () => {
    const ids = shoppingFromWeek(A(), GYM_WEEK).flatMap(c => c.lines).map(l => l.food.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('suit l\'ordre des rayons, pas l\'ordre alphabétique', () => {
    const ranks = shoppingFromWeek(A(), GYM_WEEK).map(c => CAT_ORDER.indexOf(c.cat))
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b))
  })

  it('trie chaque rayon du plus lourd au plus léger', () => {
    for (const { lines } of shoppingFromWeek(A(), GYM_WEEK)) {
      for (let i = 1; i < lines.length; i++) expect(lines[i - 1].grams).toBeGreaterThanOrEqual(lines[i].grams)
    }
  })

  it('rend une liste vide quand la semaine entière est vide', () => {
    expect(shoppingFrom({})).toEqual([])
  })

  it('formate les quantités en kg au-delà du kilo', () => {
    expect(fmtQty(850)).toBe('850 g')
    expect(fmtQty(1500)).toBe('1,5 kg')
  })
})

describe('conservation', () => {
  it('prend la durée la plus courte des ingrédients', () => {
    // Boîte A = poulet (3 j) + riz et légumes (4 j par défaut) → 3 jours.
    expect(keepsOf(RECIPE_BY_ID['boite-a'])).toBe(3)
    // Le poisson tombe à 2 jours et tire tout le plat avec lui.
    expect(keepsOf(RECIPE_BY_ID['din-poisson'])).toBe(2)
  })

  it('un ingrédient frais ne condamne pas le plat entier', () => {
    // Poulet-lentilles-salade : la salade tient 1 jour, mais on veut quand même
    // pouvoir cuire le poulet et les lentilles le dimanche.
    const r = RECIPE_BY_ID['din-poulet']
    expect(keepsOf(r)).toBe(3)
    expect(freshItemsOf(r).map(i => i.food)).toEqual(['salade-verte'])
  })

  it('retombe sur la valeur par défaut sans information', () => {
    expect(keepsOf({ id: 'x', name: 'x', kind: 'boite', batch: true, steps: '', items: [] })).toBe(KEEPS_DEFAULT)
  })

  it('le seuil du frais reste sous la conservation par défaut', () => {
    expect(KEEPS_FRESH).toBeLessThan(KEEPS_DEFAULT)
  })
})

describe('répartition des sessions de cuisine', () => {
  it('le dimanche couvre tout ce qui tient depuis la veille du lundi', () => {
    expect(cookSlotFor(0, 3)).toBe('dim')
    expect(cookSlotFor(2, 3)).toBe('dim')
  })

  it('bascule au mercredi soir ce qui n\'aurait pas tenu', () => {
    // Un plat de 3 jours mangé jeudi : 5 jours après le dimanche, impossible.
    expect(cookSlotFor(3, 3)).toBe('mer')
    expect(cookSlotFor(5, 3)).toBe('mer')
  })

  it('laisse au jour même ce que même le mercredi ne couvre pas', () => {
    expect(cookSlotFor(6, 3)).toBe('minute')
    expect(cookSlotFor(5, 2)).toBe('minute')
  })

  it('un plat qui tient toute la semaine se fait entièrement le dimanche', () => {
    for (let d = 0; d < 7; d++) expect(cookSlotFor(d, 8)).toBe('dim')
  })

  it('ne renonce plus à un plat parce qu\'il est meilleur frais', () => {
    // Régression : le drapeau « à faire minute » écartait TOUS les dîners de la
    // session du dimanche — la moitié de la semaine disparaissait du programme.
    const dim = cookPlan(A(), GYM_WEEK).find(s => s.id === 'dim')!
    const kinds = dim.dishes.map(d => RECIPE_BY_ID[d.recipeId].kind)
    expect(kinds).toContain('boite')
    expect(kinds).toContain('diner')
    expect(dim.dishes.some(d => !RECIPE_BY_ID[d.recipeId].batch)).toBe(true)
  })
})

describe('cookPlan', () => {
  const sessions = cookPlan(A(), GYM_WEEK)
  const byId = Object.fromEntries(sessions.map(s => [s.id, s]))

  it('ouvre par le dimanche et ne remonte jamais une session vide', () => {
    expect(sessions[0].id).toBe('dim')
    for (const s of sessions) expect(s.dishes.length).toBeGreaterThan(0)
  })

  it('ne cuisine deux fois aucune portion', () => {
    const total = sessions.reduce((n, s) => n + s.dishes.reduce((m, d) => m + d.n, 0), 0)
    expect(total).toBe(14)
  })

  it('met au dimanche tout ce que la conservation autorise', () => {
    // Cinq portions seulement : les viandes cuites tiennent trois jours, pas sept.
    // Le chiffre est bas, mais c'est le vrai — d'où la sortie par le congélateur.
    const dim = byId.dim.dishes.reduce((n, d) => n + d.n, 0)
    expect(dim).toBe(5)
    for (const d of byId.dim.dishes) expect(Math.max(...d.days)).toBeLessThanOrEqual(d.keeps - 1)
  })

  it('propose de congeler pour supprimer la session du mercredi', () => {
    const gelables = byId.mer.freezable!
    expect(gelables.length).toBeGreaterThan(0)
    // Rien qui se congèle mal ne doit être proposé : les œufs deviennent caoutchouc.
    for (const d of gelables) expect(freezableOf(RECIPE_BY_ID[d.recipeId])).toBe(true)
  })

  it('n\'attache la sortie congélateur qu\'à la session du mercredi', () => {
    expect(byId.dim.freezable).toBeUndefined()
    expect(byId.minute?.freezable).toBeUndefined()
  })

  it('range chaque portion dans la session que sa conservation autorise', () => {
    for (const s of sessions) {
      for (const d of s.dishes) {
        for (const dow of d.days) expect(cookSlotFor(dow, d.keeps)).toBe(s.id)
      }
    }
  })

  it('nomme les jours concernés en toutes lettres', () => {
    expect(listDays([0, 1, 3])).toBe('lundi, mardi et jeudi')
    expect(listDays([2])).toBe('mercredi')
  })

  it('estime une durée pour les sessions, pas pour le jour même', () => {
    expect(byId.dim.minutes).toBeGreaterThan(0)
    expect(byId.minute?.minutes ?? 0).toBe(0)
  })
})

describe('les variantes de petit-déjeuner et de collation', () => {
  const kcalOf = (id: string) => macrosOf(RECIPE_BY_ID[id].items).kcal
  const pOf = (id: string) => macrosOf(RECIPE_BY_ID[id].items).p

  it('chaque petit-déjeuner tient les macros du porridge à 10 % près', () => {
    // C'est la condition pour qu'en changer soit un vrai choix : une option qui
    // pèse 200 kcal de plus n'est pas une alternative, c'est un piège.
    const ref = kcalOf('pdj')
    for (const r of Object.values(RECIPE_BY_ID).filter(x => x.kind === 'pdj')) {
      expect(Math.abs(kcalOf(r.id) - ref) / ref).toBeLessThan(0.1)
      expect(pOf(r.id)).toBeGreaterThanOrEqual(pOf('pdj') * 0.9)
    }
  })

  it('offre au moins un petit-déjeuner préparable à l\'avance et un liquide', () => {
    const pdj = Object.values(RECIPE_BY_ID).filter(r => r.kind === 'pdj')
    expect(pdj.some(r => r.batch)).toBe(true)
    expect(pdj.some(r => /boire|smoothie/i.test(r.name))).toBe(true)
  })

  it('les collations restent sous 180 kcal', () => {
    for (const id of ['col-cacao', 'col-skyr', 'col-mousse', 'col-oeufs', 'col-shaker', 'col-soir-cacahuete']) {
      expect(kcalOf(id)).toBeLessThanOrEqual(180)
    }
  })

  it('propose au moins une collation salée : le sucré finit par écœurer', () => {
    expect(RECIPE_BY_ID['col-oeufs'].items.map(i => i.food)).toContain('cornichons')
  })

  it('la mousse aquafaba offre le meilleur rapport protéines / calories', () => {
    const ratio = (id: string) => pOf(id) / kcalOf(id)
    const autres = ['col-cacao', 'col-skyr', 'col-oeufs', 'col-shaker'].map(ratio)
    expect(ratio('col-mousse')).toBeGreaterThan(Math.max(...autres))
  })
})

describe('ce qui se prépare à l\'avance entre dans la session', () => {
  const week = () => {
    const w = builtinWeeks()[0]
    for (const d of w.days) { d.slots.pdj = 'pdj-overnight'; d.slots.snack = 'col-oeufs' }
    return w
  }

  it('cuisine aussi les petits-déjeuners et collations préparables à l\'avance', () => {
    // Régression : trois recettes étaient marquées « à l'avance » sans jamais
    // apparaître dans une session — donc sans jamais dire quand les faire.
    const dim = cookPlan(week(), GYM_WEEK).find(s => s.id === 'dim')!
    const ids = dim.dishes.map(d => d.recipeId)
    expect(ids).toContain('pdj-overnight')
    expect(ids).toContain('col-oeufs')
  })

  it('laisse dehors ce qui se fait sur le moment', () => {
    // Le porridge et le shaker n'ont rien à faire dans une session de préparation.
    const w = builtinWeeks()[0]
    const ids = cookPlan(w, GYM_WEEK).flatMap(s => s.dishes.map(d => d.recipeId))
    expect(ids).not.toContain('pdj')
    expect(ids).not.toContain('col-post')
  })

  it('respecte la conservation déclarée sur la recette, pas celle des ingrédients', () => {
    // Avoine et fromage blanc tiennent longtemps ; le bocal monté tient 3 jours.
    expect(keepsOf(RECIPE_BY_ID['pdj-overnight'])).toBe(3)
    const dim = cookPlan(week(), GYM_WEEK).find(s => s.id === 'dim')!
    expect(dim.dishes.find(d => d.recipeId === 'pdj-overnight')!.n).toBe(3)
  })

  it('compte en pots, pas en boîtes, et donne le mode d\'emploi', () => {
    const dim = cookPlan(week(), GYM_WEEK).find(s => s.id === 'dim')!
    const oats = dim.steps.find(st => st.title.startsWith('Overnight oats'))!
    expect(oats.title).toMatch(/pots/)
    expect(oats.lines[0]).toMatch(/par pot/)
    expect(oats.hint).toMatch(/la veille au soir/i)
  })

  it('n\'applique pas aux collations les consignes de cuisson des plats', () => {
    // « Œufs battus versés sur les légumes » n'a aucun sens pour des œufs durs :
    // les étapes de cuisson ne regardent que les repas principaux.
    const dim = cookPlan(week(), GYM_WEEK).find(s => s.id === 'dim')!
    const prot = dim.steps.find(st => /protéines/i.test(st.title))!
    expect(prot.lines.some(l => /Œufs entiers/.test(l))).toBe(false)
  })
})

describe('les sauces', () => {
  it('sont comptées dans le plat : elles se mangent, même à part', () => {
    const nu = macrosOf(RECIPE_BY_ID['boite-a'].items)
    const avec = macrosOf(expandItems(RECIPE_BY_ID['boite-a']))
    expect(avec.kcal).toBeGreaterThan(nu.kcal)
    expect(avec.p).toBeGreaterThan(nu.p)
  })

  it('entrent dans les courses avec le reste', () => {
    const ids = shoppingFromWeek(A(), GYM_WEEK).flatMap(c => c.lines).map(l => l.food.id)
    expect(ids).toContain('yaourt-grec-0')
    expect(ids).toContain('paprika-fume')
    expect(ids).toContain('ail')
  })

  it('ne pénalisent pas la conservation du plat : elles ne sont pas dans la boîte', () => {
    // Le yaourt grec se congèle mal. S'il comptait dans le plat, la Boîte A ne
    // pourrait plus jamais partir au congélateur — alors qu'il est dans un pot.
    expect(freezableOf(RECIPE_BY_ID['boite-a'])).toBe(true)
    expect(keepsOf(RECIPE_BY_ID['boite-a'])).toBe(3)
  })

  it('ont leur propre étape, séparée de l\'assemblage', () => {
    const steps = cookSteps(cookPlan(A(), GYM_WEEK)[0].dishes)
    const sauces = steps.find(st => /sauces/i.test(st.title))!
    expect(sauces.hint).toMatch(/JAMAIS dans la boîte/)
    expect(sauces.lines.length).toBeGreaterThan(0)
    // Les quantités sont multipliées par le nombre de portions du plat servi.
    expect(sauces.lines.some(l => /4 portions/.test(l))).toBe(true)
  })

  it('restent légères : aucune ne dépasse 90 kcal la portion', () => {
    for (const r of Object.values(RECIPE_BY_ID).filter(x => x.kind === 'sauce')) {
      expect(macrosOf(r.items).kcal).toBeLessThanOrEqual(90)
    }
  })

  it('assaisonnent tous les repas principaux livrés', () => {
    for (const r of Object.values(RECIPE_BY_ID)) {
      if (r.kind === 'boite' || r.kind === 'diner') expect(r.sauce).toBeTruthy()
    }
  })
})

describe('le congélateur, quand il y a la place', () => {
  const sans = cookPlan(A(), GYM_WEEK)
  const avec = cookPlan(A(), GYM_WEEK, undefined, { freezer: true })
  const dimOf = (p: typeof sans) => p.find(s => s.id === 'dim')!

  it('n\'est jamais supposé : sans réglage, le plan ne change pas', () => {
    expect(cookPlan(A(), GYM_WEEK, undefined, {})).toEqual(sans)
    expect(dimOf(sans).dishes.some(d => d.frozen)).toBe(false)
  })

  it('remonte au dimanche tout ce qui se congèle', () => {
    expect(avec.find(s => s.id === 'mer')).toBeUndefined()
    const total = dimOf(avec).dishes.reduce((n, d) => n + d.n, 0)
    expect(total).toBeGreaterThan(dimOf(sans).dishes.reduce((n, d) => n + d.n, 0))
  })

  it('laisse au jour même ce qui se congèle mal', () => {
    // L'omelette : les œufs cuits deviennent caoutchouteux une fois congelés.
    const minute = avec.find(s => s.id === 'minute')!
    expect(minute.dishes.every(d => !freezableOf(RECIPE_BY_ID[d.recipeId]))).toBe(true)
  })

  it('ne congèle pas ce qui tenait déjà au frigo', () => {
    for (const d of dimOf(avec).dishes) {
      if (Math.max(...d.days) < d.keeps) expect(d.frozen).toBe(false)
    }
  })

  it('sépare les portions d\'un même plat selon leur destination', () => {
    // Le plat du lundi va au frigo, celui du vendredi au congélateur : deux entrées,
    // parce que ce ne sont ni le même geste ni la même étagère.
    const poisson = dimOf(avec).dishes.filter(d => d.recipeId === 'din-poisson')
    expect(poisson).toHaveLength(2)
    expect(poisson.map(d => d.frozen).sort()).toEqual([false, true])
  })

  it('range le frigo et le congélateur dans deux listes distinctes', () => {
    const last = dimOf(avec).steps.at(-1)!
    expect(last.lines).toContain('AU FRIGO :')
    expect(last.lines).toContain('AU CONGÉLATEUR, tout de suite :')
  })

  it('ne propose plus la sortie congélateur quand elle est déjà prise', () => {
    expect(sans.find(s => s.id === 'mer')!.freezable!.length).toBeGreaterThan(0)
    for (const s of avec) expect(s.freezable).toBeUndefined()
  })

  it('cookPlaceFor : le frigo d\'abord, le congélateur en secours', () => {
    expect(cookPlaceFor(0, 3, true, { freezer: true })).toEqual({ where: 'dim', frozen: false })
    expect(cookPlaceFor(5, 3, true, { freezer: true })).toEqual({ where: 'dim', frozen: true })
    expect(cookPlaceFor(5, 3, false, { freezer: true })).toEqual({ where: 'mer', frozen: false })
    expect(cookPlaceFor(5, 3, true, {})).toEqual({ where: 'mer', frozen: false })
  })
})

describe('la recette guidée', () => {
  const steps = cookSteps(cookPlan(A(), GYM_WEEK)[0].dishes)
  const titles = steps.map(s => s.title)

  it('numérote les étapes sans trou, dans l\'ordre', () => {
    expect(steps.map(s => s.n)).toEqual(steps.map((_, i) => i + 1))
  })

  it('commence par le four et finit par le rangement', () => {
    expect(titles[0]).toMatch(/four/i)
    expect(titles.at(-1)).toMatch(/range/i)
  })

  it('sort les quantités des étapes : elles ont leur propre liste', () => {
    // Une recette se lit en deux temps — ce qu'on sort, puis ce qu'on fait. Les
    // quantités noyées dans une première étape obligeaient à remonter dans le
    // texte à chaque fois qu'on cherchait un poids.
    const ing = cookIngredients(cookPlan(A(), GYM_WEEK)[0].dishes)
    expect(ing.length).toBeGreaterThan(10)
    expect(ing.map(i => i.name)).not.toContain(undefined)
    // Du plus lourd au plus léger : les kilos d'abord, les pincées ensuite.
    const g = ing.map(i => Number.parseFloat(i.qty.replace(',', '.')) * (i.qty.includes('kg') ? 1000 : 1))
    expect(g).toEqual([...g].sort((a, b) => b - a))
  })

  it('marque ce qui se pèse cru, et rappelle les repères d\'achat', () => {
    const ing = cookIngredients(cookPlan(A(), GYM_WEEK)[0].dishes)
    expect(ing.find(i => i.foodId === 'filet-de-poulet')!.raw).toBe(true)
    expect(ing.find(i => i.foodId === 'brocolis')!.raw).toBe(false)
    expect(ing.find(i => i.foodId === 'paprika-fume')!.note).toMatch(/c. à café/)
  })

  it('n\'oublie pas les ingrédients des sauces', () => {
    const ing = cookIngredients(cookPlan(A(), GYM_WEEK)[0].dishes)
    expect(ing.map(i => i.foodId)).toContain('yaourt-grec-0')
  })

  it('lance le four avant de cuisiner quoi que ce soit', () => {
    const four = titles.findIndex(t => /four/i.test(t))
    const prot = titles.findIndex(t => /protéines/i.test(t))
    expect(four).toBeGreaterThan(-1)
    expect(four).toBeLessThan(prot)
  })

  it('cuit les féculents avant les légumes : c\'est le plus long', () => {
    expect(titles.findIndex(t => /féculents/i.test(t)))
      .toBeLessThan(titles.findIndex(t => /légumes/i.test(t)))
  })

  it('donne les temps de cuisson, pas seulement les quantités', () => {
    const fec = steps.find(s => /féculents/i.test(s.title))!
    expect(fec.lines.some(l => /min/.test(l))).toBe(true)
  })

  it('additionne les quantités au lieu de répéter chaque recette', () => {
    const fec = steps.find(s => /féculents/i.test(s.title))!
    const noms = fec.lines.map(l => l.split(' — ')[0])
    expect(new Set(noms).size).toBe(noms.length)
  })

  it('rappelle de ne PAS portionner les féculents', () => {
    expect(steps.find(s => /féculents/i.test(s.title))!.hint).toMatch(/SANS portionner/)
  })

  it('donne le contenu d\'UNE boîte, pas le total du plat', () => {
    const boite = steps.find(s => s.title.startsWith('Boîte A'))!
    expect(boite.lines.some(l => /180 g par boîte/.test(l))).toBe(true)
  })

  it('sort les ingrédients frais de l\'assemblage et le dit', () => {
    const poulet = steps.find(s => /Poulet, lentilles/.test(s.title))
    if (poulet) {
      expect(poulet.lines.some(l => /Salade/i.test(l))).toBe(false)
      expect(poulet.hint).toMatch(/le jour même/)
    }
  })

  it('ne propose aucune étape sans plat', () => {
    expect(cookSteps([])).toEqual([])
  })
})

describe('totaux et stock', () => {
  it('les totaux suivent le nombre de portions', () => {
    const one = selectionTotals({ 'boite-a': 1 })
    const three = selectionTotals({ 'boite-a': 3 })
    // À l'unité près : chaque total est arrondi une fois, à la fin. Trois portions
    // d'un plat à 681,3 kcal font 2044, pas 3 × 681.
    expect(Math.abs(three.kcal - one.kcal * 3)).toBeLessThanOrEqual(3)
    expect(three.portions).toBe(3)
    expect(three.dishes).toBe(1)
  })

  it('ignore les plats à zéro portion et les identifiants inconnus', () => {
    const t = selectionTotals({ 'boite-a': 0, 'plat-fantome': 5 })
    expect(t.portions).toBe(0)
    expect(t.kcal).toBe(0)
  })

  it('retranche ce qui a été mangé, sans jamais descendre sous zéro', () => {
    expect(stockOf({ 'boite-a': 4 }, { 'boite-a': 3 })).toEqual({ 'boite-a': 1 })
    expect(stockOf({ 'boite-a': 2 }, { 'boite-a': 5 })).toEqual({ 'boite-a': 0 })
  })
})
