import { describe, expect, it } from 'vitest'
import {
  CYCLE_LENGTH, FOOD_BY_ID, MICRO_REFS, RATIO_DINNER_GYM, RATIO_REST, RECIPE_BY_ID, STARCHY_IDS,
  SLOTS_GYM, SLOTS_REST,
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
  sessionBurn, sessionsOn, shoppingFor, targetFor, targetOf, tdeeOf, usableDuration,
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
