// Calculs purs du module nutrition : macros d'un repas, construction d'une journée,
// dépense énergétique, liste de courses, coût du panier.
// Aucun DOM, aucun localStorage, aucun Vue — comme utils/sportStats.ts, pour que tout
// soit testable en `test/unit` sans monter Nuxt.

import type { Food, FoodCat, MicroKey, Recipe, RecipeItem, Slot } from '../data/nutritionProgram'
import {
  COOK_C_LOSS, CYCLE, CYCLE_LENGTH, FOOD_BY_ID, MICRO_REFS, RATIO_DINNER_GYM, RATIO_REST,
  RECIPE_BY_ID, SLOTS_GYM, SLOTS_REST, STARCHY_IDS,
} from '../data/nutritionProgram'
// isoOf et shiftIso viennent de sportStats. Nuxt auto-importe les deux fichiers d'utils :
// les redéfinir ici provoquait un « Duplicated imports » au build et, plus embêtant,
// laissait deux implémentations d'une même date à maintenir en parallèle.
import { isoOf, shiftIso } from './sportStats'

export interface Macros { kcal: number, p: number, g: number, l: number }

/**
 * Aliments et recettes effectivement disponibles : ceux livrés avec le plan, plus
 * ceux que l'utilisateur a créés ou modifiés. Toutes les fonctions de calcul
 * prennent une bibliothèque en paramètre pour qu'aucune donnée ne soit figée dans
 * le code — c'est ce qui permet d'ajouter ses propres plats.
 */
export interface Library { foods: Record<string, Food>, recipes: Record<string, Recipe> }
export const BUILTIN: Library = { foods: FOOD_BY_ID, recipes: RECIPE_BY_ID }

/** Fusionne les aliments livrés, les modifications et les créations. */
export function mergeFoods(custom: Food[] = [], overrides: Record<string, Partial<Food>> = {}): Record<string, Food> {
  const out: Record<string, Food> = { ...FOOD_BY_ID }
  for (const f of custom) out[f.id] = { ...f }
  for (const [id, patch] of Object.entries(overrides)) {
    if (out[id]) out[id] = { ...out[id], ...patch, id }
  }
  return out
}

/** Idem pour les recettes. Une recette désactivée reste consultable mais ne tombe plus dans le planning. */
export function mergeRecipes(
  custom: Recipe[] = [],
  overrides: Record<string, Partial<Recipe>> = {},
  disabled: string[] = [],
): Record<string, Recipe> {
  const out: Record<string, Recipe> = { ...RECIPE_BY_ID }
  for (const r of custom) out[r.id] = { ...r }
  for (const [id, patch] of Object.entries(overrides)) {
    if (out[id]) out[id] = { ...out[id], ...patch, id }
  }
  const off = new Set(disabled)
  for (const id of Object.keys(out)) out[id] = { ...out[id], disabled: off.has(id) }
  return out
}

/** Recettes candidates au planning, par type de repas. */
export const activeRecipes = (lib: Library, kind: Recipe['kind']) =>
  Object.values(lib.recipes).filter(r => r.kind === kind && !r.disabled)

/** Cibles calculées à partir du profil, arrondies au palier de 10 kcal. */
export const GYM_DEFICIT = 665 // kcal retirés un jour avec séance
export const REST_DEFICIT = 465 // kcal retirés un jour sans séance
/** Facteurs d'activité appliqués au métabolisme de base. */
// Télétravail, peu de déplacements.
// NB : pas de commentaire avec virgule en fin de ligne `export const` — le
// scanner d'auto-imports de Nuxt (regex, commentaires non strippés) y voit
// des exports fantômes (`peu`, `d`, …) et casse le build.
export const PAL_REST = 1.25
export const PAL_GYM = 1.48 // séance de musculation + déplacement
/** 1 kg de masse grasse ≈ 7 700 kcal. Sert à convertir un déficit en perte attendue. */
export const KCAL_PER_KG_FAT = 7700
/** Cible protéique, en grammes par kilo de poids de corps. */
export const PROTEIN_PER_KG = 2.1
/** Fourchette de perte hebdomadaire visée : en dessous on stagne, au-dessus on perd du muscle. */
export const LOSS_MIN_KG = 0.4
export const LOSS_MAX_KG = 0.8

const STARCHY = new Set(STARCHY_IDS)

/** Portions arrondies au multiple de 5 g : en dessous, la balance de cuisine ne suit pas. */
export const roundPortion = (g: number) => Math.round(g / 5) * 5

/** Applique la modulation des féculents. Protéines, légumes et matières grasses ne bougent pas. */
export function scaleItems(items: RecipeItem[], ratio = 1): RecipeItem[] {
  if (ratio === 1) return items.map(i => ({ ...i }))
  return items.map(i => (STARCHY.has(i.food) ? { food: i.food, g: roundPortion(i.g * ratio) } : { ...i }))
}

const EMPTY: Macros = { kcal: 0, p: 0, g: 0, l: 0 }

/** Macros d'une liste d'ingrédients. Un aliment inconnu est ignoré plutôt que de faire planter la vue. */
export function macrosOf(items: RecipeItem[], foods: Record<string, Food> = FOOD_BY_ID): Macros {
  return items.reduce<Macros>((acc, it) => {
    const f = foods[it.food]
    if (!f) return acc
    const k = it.g / 100
    return { kcal: acc.kcal + f.kcal * k, p: acc.p + f.p * k, g: acc.g + f.g * k, l: acc.l + f.l * k }
  }, { ...EMPTY })
}

export const sumMacros = (list: Macros[]): Macros => list.reduce((a, m) => ({
  kcal: a.kcal + m.kcal, p: a.p + m.p, g: a.g + m.g, l: a.l + m.l,
}), { ...EMPTY })

export const roundMacros = (m: Macros): Macros => ({
  kcal: Math.round(m.kcal), p: Math.round(m.p), g: Math.round(m.g), l: Math.round(m.l),
})

/** Répartition en % des calories. Utile pour la barre de macros. */
export function macroSplit(m: Macros): { p: number, g: number, l: number } {
  const kp = m.p * 4, kg = m.g * 4, kl = m.l * 9
  const tot = kp + kg + kl
  if (!tot) return { p: 0, g: 0, l: 0 }
  return { p: Math.round(kp / tot * 100), g: Math.round(kg / tot * 100), l: Math.round(kl / tot * 100) }
}

// ─── Journée ────────────────────────────────────────────────────────────────

export interface DayMeal {
  slot: string
  time: string
  label: string
  recipeId: string
  name: string
  steps: string
  items: RecipeItem[]
  macros: Macros
  adjusted?: boolean // portion recalculée d'après la dépense réelle de la séance
}
export interface DayPlan {
  index: number // position dans le cycle de 14 jours
  trained: boolean
  meals: DayMeal[]
  total: Macros
}

const ratioOf = (slot: Slot): number => {
  if (slot.ratio === 'rest') return RATIO_REST
  if (slot.ratio === 'dinnerGym') return RATIO_DINNER_GYM
  return 1
}

/**
 * Construit la journée à l'index donné du cycle.
 * `trained = false` bascule sur la structure sans séance : plus de banane ni de shaker,
 * et féculents réduits sur les deux repas. C'est aussi ce qui se passe quand la séance
 * est annulée en cours de journée.
 */
export function buildDay(
  index: number,
  trained: boolean,
  lib: Library = BUILTIN,
  menu?: Partial<DayTemplate>,
): DayPlan {
  const i = ((index % CYCLE_LENGTH) + CYCLE_LENGTH) % CYCLE_LENGTH
  const tpl = { ...CYCLE[i], ...menu }
  const slots = trained ? SLOTS_GYM : SLOTS_REST
  const meals: DayMeal[] = []

  for (const slot of slots) {
    const rid = slot.recipe ?? (slot.from === 'lunch' ? tpl.lunch : tpl.dinner)
    const recipe = lib.recipes[rid] ?? RECIPE_BY_ID[rid]
    if (!recipe) continue
    const items = scaleItems(recipe.items, ratioOf(slot))
    meals.push({
      slot: slot.id,
      time: slot.time,
      label: slot.label,
      recipeId: recipe.id,
      name: recipe.name,
      steps: recipe.steps,
      items,
      macros: macrosOf(items, lib.foods),
    })
  }
  return { index: i, trained, meals, total: sumMacros(meals.map(m => m.macros)) }
}

// ─── Dépense énergétique ────────────────────────────────────────────────────

/**
 * Métabolisme de base, formule de Mifflin-St Jeor (1990) — la plus fiable sans
 * mesure de composition corporelle. Renvoie null si le profil est incomplet.
 */
export function bmrMifflin(kg: number | null, cm: number | null, age: number | null, sex: 'h' | 'f' | null): number | null {
  if (!kg || !cm || !age || !sex) return null
  const base = 10 * kg + 6.25 * cm - 5 * age
  return Math.round(base + (sex === 'h' ? 5 : -161))
}

/** Dépense totale estimée sur la journée, selon qu'il y a séance ou non. */
export const tdeeOf = (bmr: number, trained: boolean) => Math.round(bmr * (trained ? PAL_GYM : PAL_REST))

/** Cible calorique du jour = dépense − déficit, arrondie à 10 kcal. */
export function targetOf(bmr: number, trained: boolean): number {
  const raw = tdeeOf(bmr, trained) - (trained ? GYM_DEFICIT : REST_DEFICIT)
  return Math.round(raw / 10) * 10
}

// ─── Dépense décomposée ─────────────────────────────────────────────────────
// Trois postes explicites plutôt qu'un « facteur d'activité » opaque :
//   1. le métabolisme, hors marche et hors sport
//   2. les pas de la journée
//   3. la séance, estimée sur ce qui a vraiment été fait
// C'est ce découpage qui donne un sens au bouton « télétravail » : ce n'est pas un
// coefficient magique, c'est simplement une journée où on marche beaucoup moins.

/** Métabolisme × activité de fond : position assise, digestion, gestes du quotidien. */
export const PAL_SEDENTARY = 1.2
/** Coût net d'un pas, par kilo de poids de corps. ~235 kcal pour 10 000 pas à 94 kg. */
export const KCAL_PER_STEP_PER_KG = 0.00025
/** Valeurs par défaut tant que les pas ne sont pas saisis. */
export const STEPS_TT = 3500 // journée de télétravail : quelques allers-retours
// Journée avec trajets, escaliers, déplacements.
export const STEPS_ONSITE = 7500
/** Déficit : une part de la dépense du jour, bornée. Proportionnel = tenable. */
export const DEFICIT_RATIO = 0.2
export const DEFICIT_MIN = 400
export const DEFICIT_MAX = 700

export const defaultSteps = (tt: boolean) => (tt ? STEPS_TT : STEPS_ONSITE)

/** Dépense nette liée à la marche. Nette : le repos pendant ce temps n'est pas recompté. */
export const stepsBurn = (steps: number, kg: number) =>
  Math.round(Math.max(0, steps) * kg * KCAL_PER_STEP_PER_KG)

export function deficitFor(need: number): number {
  return Math.round(clamp(need * DEFICIT_RATIO, DEFICIT_MIN, DEFICIT_MAX))
}

export interface DayEnergy {
  bmr: number
  baseKcal: number // métabolisme + activité de fond
  stepsKcal: number
  sessionKcal: number
  need: number // dépense totale de la journée
  deficit: number
  target: number // ce qu'il faut manger
  steps: number
  stepsEstimated: boolean // true si les pas n'ont pas été saisis
}

/** Bilan énergétique complet d'une journée. `steps = null` retombe sur l'estimation. */
export function dayEnergy(opts: {
  bmr: number
  kg: number
  tt: boolean
  steps?: number | null
  sessionKcal?: number
}): DayEnergy {
  const stepsEstimated = opts.steps === null || opts.steps === undefined
  const steps = stepsEstimated ? defaultSteps(opts.tt) : Math.max(0, opts.steps!)
  const baseKcal = Math.round(opts.bmr * PAL_SEDENTARY)
  const stepsKcal = stepsBurn(steps, opts.kg)
  const sessionKcal = Math.round(opts.sessionKcal ?? 0)
  const need = baseKcal + stepsKcal + sessionKcal
  const deficit = deficitFor(need)
  return {
    bmr: opts.bmr,
    baseKcal,
    stepsKcal,
    sessionKcal,
    need,
    deficit,
    target: Math.round((need - deficit) / 10) * 10,
    steps,
    stepsEstimated,
  }
}

export const proteinTarget = (kg: number) => Math.round(kg * PROTEIN_PER_KG)

/** Perte hebdomadaire attendue (kg de gras) pour un déficit cumulé sur 7 jours. */
export const weeklyLoss = (deficit7d: number) => deficit7d / KCAL_PER_KG_FAT

export type TrendVerdict = 'unknown' | 'slow' | 'ok' | 'fast'
export interface TrendAdvice { verdict: TrendVerdict, label: string, advice: string }

/**
 * Verdict sur la vitesse de perte, à partir de la variation hebdo moyenne (kg, négatif = perte).
 * La règle est volontairement molle : on ne corrige jamais sur une seule semaine.
 */
export function assessTrend(kgPerWeek: number | null): TrendAdvice {
  if (kgPerWeek === null || !Number.isFinite(kgPerWeek)) {
    return { verdict: 'unknown', label: 'Pas assez de pesées', advice: 'Pèse-toi tous les matins à jeun. Il faut deux moyennes hebdomadaires pour conclure.' }
  }
  const loss = -kgPerWeek
  if (loss < LOSS_MIN_KG - 0.1) {
    return { verdict: 'slow', label: 'Perte trop lente', advice: 'Retire 20 g de glucides par jour (≈ 80 kcal). Pas plus : une grosse coupe ne fait que casser les séances.' }
  }
  if (loss > LOSS_MAX_KG + 0.2) {
    return { verdict: 'fast', label: 'Perte trop rapide', advice: 'Rajoute 150 kcal de glucides. Au-delà d\'1 kg par semaine, une partie de ce que tu perds est du muscle.' }
  }
  return { verdict: 'ok', label: 'Dans la cible', advice: 'Ne touche à rien. La vitesse actuelle préserve la masse maigre.' }
}

// ─── Dates et position dans le cycle ────────────────────────────────────────

/** Nombre de jours entiers entre deux dates ISO (b − a). */
export function daysBetween(a: string, b: string): number {
  const ms = new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()
  return Math.round(ms / 86400000)
}

/**
 * Lundi de référence du cycle. Le choix est arbitraire : ce qui compte est qu'il
 * soit fixe, pour que la semaine A et la semaine B alternent toujours pareil.
 */
export const CYCLE_EPOCH = '2026-01-05'

/**
 * Position dans le cycle de 14 jours, déduite de la date seule.
 * Aucun « démarrage » à déclencher : les semaines paires servent le premier menu,
 * les impaires le second, et le jour de la semaine fait le reste. Un plan qu'il
 * faut penser à lancer est un plan qu'on oublie de lancer.
 */
export function cycleIndexOf(iso: string): number {
  const weeks = Math.floor(daysBetween(CYCLE_EPOCH, mondayOf(iso)) / 7)
  return (((weeks % 2) + 2) % 2) * 7 + dowIndex(iso)
}

/** Lundi de la semaine contenant `iso`. */
export function mondayOf(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return isoOf(d)
}

/** Index 0 = lundi … 6 = dimanche. */
export const dowIndex = (iso: string) => (new Date(iso + 'T00:00:00').getDay() + 6) % 7

export const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

// ─── Liste de courses ───────────────────────────────────────────────────────

export interface ShoppingLine {
  food: Food
  grams: number
  qty: string // quantité lisible ("1,5 kg")
}
export type ShoppingList = { cat: FoodCat, lines: ShoppingLine[] }[]

/** Formate des grammes pour une liste de courses : au-dessus du kilo on passe en kg. */
export function fmtQty(grams: number): string {
  if (grams >= 1000) {
    const kg = Math.round(grams / 100) / 10
    return `${String(kg).replace('.', ',')} kg`
  }
  return `${Math.round(grams)} g`
}

/**
 * Agrège les besoins bruts sur une suite de jours.
 * `trainedFor(index)` dit si le jour du cycle compte comme jour avec séance : les
 * portions de féculents en dépendent, donc la liste aussi.
 */
export function shoppingFor(
  indices: number[],
  trainedFor: (index: number) => boolean,
  foods: Record<string, Food> = FOOD_BY_ID,
): ShoppingList {
  const grams: Record<string, number> = {}
  for (const i of indices) {
    for (const meal of buildDay(i, trainedFor(i)).meals) {
      for (const it of meal.items) grams[it.food] = (grams[it.food] ?? 0) + it.g
    }
  }
  const byCat = new Map<FoodCat, ShoppingLine[]>()
  for (const [id, g] of Object.entries(grams)) {
    const food = foods[id]
    if (!food) continue
    const line: ShoppingLine = { food, grams: g, qty: fmtQty(g) }
    const arr = byCat.get(food.cat)
    if (arr) arr.push(line)
    else byCat.set(food.cat, [line])
  }
  for (const lines of byCat.values()) lines.sort((a, b) => b.grams - a.grams)
  return [...byCat.entries()].map(([cat, lines]) => ({ cat, lines }))
}

/** Le cycle par défaut : séance les jours 0, 1, 3, 4 de chaque semaine (lundi, mardi, jeudi, vendredi). */
export const DEFAULT_TRAINED = (index: number) => [0, 1, 3, 4].includes(index % 7)

// ─── Budget ─────────────────────────────────────────────────────────────────

/** Prix saisis par l'utilisateur, en euros par kilo (ou par litre pour l'huile). */
export type PriceMap = Record<string, number>

export const lineCost = (grams: number, pricePerKg: number) => (grams / 1000) * pricePerKg

/**
 * Coût total du panier. `missing` liste les aliments sans prix saisi : le total
 * affiché est un minorant tant qu'il n'est pas vide, et l'interface doit le dire.
 */
export function basketTotal(list: ShoppingList, prices: PriceMap): { total: number, missing: string[] } {
  let total = 0
  const missing: string[] = []
  for (const { lines } of list) {
    for (const { food, grams } of lines) {
      const p = prices[food.id]
      if (typeof p === 'number' && p > 0) total += lineCost(grams, p)
      else missing.push(food.id)
    }
  }
  return { total: Math.round(total * 100) / 100, missing }
}

export const fmtEuro = (v: number) => `${v.toFixed(2).replace('.', ',')} €`

/** Coût par jour couvert — la vraie métrique quand on compare deux semaines de courses. */
export const costPerDay = (total: number, days: number) => (days > 0 ? Math.round(total / days * 100) / 100 : 0)

// ─── Micronutriments ────────────────────────────────────────────────────────

export interface MicroCoverage {
  key: MicroKey
  label: string
  unit: string
  perDay: number
  ref: number
  pct: number
  status: 'low' | 'fair' | 'ok'
}

/** En dessous de ce taux de couverture, l'assiette ne suffit pas et il faut compléter. */
export const MICRO_LOW = 70
export const MICRO_FAIR = 100

/**
 * Couverture moyenne en micronutriments sur une suite de jours.
 * La vitamine C des légumes est minorée : la cuisson en détruit environ 35 %, et
 * ignorer cette perte donnerait une couverture flatteuse et fausse.
 */
export function microCoverage(
  indices: number[],
  trainedFor: (index: number) => boolean,
  foods: Record<string, Food> = FOOD_BY_ID,
): MicroCoverage[] {
  const totals = {} as Record<MicroKey, number>
  for (const k of Object.keys(MICRO_REFS) as MicroKey[]) totals[k] = 0

  for (const i of indices) {
    for (const meal of buildDay(i, trainedFor(i)).meals) {
      for (const it of meal.items) {
        const f = foods[it.food]
        if (!f?.micro) continue
        const factor = it.g / 100
        for (const [k, v] of Object.entries(f.micro) as [MicroKey, number][]) {
          const loss = k === 'vc' && f.cat === 'legumes' ? COOK_C_LOSS : 1
          totals[k] += v * factor * loss
        }
      }
    }
  }

  const n = Math.max(1, indices.length)
  return (Object.keys(MICRO_REFS) as MicroKey[]).map((key) => {
    const meta = MICRO_REFS[key]
    const perDay = totals[key] / n
    const pct = Math.round(perDay / meta.ref * 100)
    return {
      key,
      label: meta.label,
      unit: meta.unit,
      perDay: Math.round(perDay * 10) / 10,
      ref: meta.ref,
      pct,
      status: pct < MICRO_LOW ? 'low' : pct < MICRO_FAIR ? 'fair' : 'ok',
    }
  }).sort((a, b) => a.pct - b.pct)
}

// ─── Dépense réelle d'une séance ────────────────────────────────────────────
// Le forfait « jour de salle / jour de repos » est une moyenne. Dès qu'une séance
// est enregistrée dans le journal, on préfère l'estimer à partir de ce qui a
// vraiment été fait : une séance de 40 min expédiée ne coûte pas la même chose
// qu'une séance de 70 min avec des sprints.

/** Forme minimale d'une séance enregistrée. `SessionRecord` de useWorkout la satisfait. */
export interface TrainingLike {
  at: string
  durationMin?: number
  entries: { sets: { warm?: boolean }[] }[]
  sprint?: { kind: string, count: number, duration: string }[]
}

/** Équivalents métaboliques. Compendium of Physical Activities, valeurs usuelles. */
// Musculation traînante, longues récups.
export const MET_LIFT_MIN = 3.0
// Musculation dense, peu de repos.
export const MET_LIFT_MAX = 6.0
export const MET_SPRINT = 12 // sprint sur tapis ou piste
export const MET_WARMUP = 7 // trot d'échauffement
/** Densité de référence : ~27 séries de travail en 60 min. Au-delà, on plafonne. */
export const DENSITY_REF = 0.45
/** Surconsommation post-exercice (EPOC). Réelle mais modeste — surtout pas 20 %. */
export const EPOC_BONUS = 0.07
/** Durée retenue quand la séance a été enregistrée sans durée. */
export const DEFAULT_SESSION_MIN = 55
/** Durées aberrantes : le journal contient des saisies à 9 min pour 6 exercices. */
export const MIN_PLAUSIBLE_MIN = 15
export const MAX_PLAUSIBLE_MIN = 150

// Volontairement NON exporté : Nuxt auto-importe tout utils/, et un nom aussi
// générique dans l'espace global de l'app finirait tôt ou tard par collisionner.
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** Séries de travail, échauffement exclu — c'est l'unité de charge réelle. */
export function workSetCount(s: TrainingLike): number {
  return (s.entries ?? []).reduce((n, e) => n + (e.sets ?? []).filter(x => !x.warm).length, 0)
}

/** Durée exploitable : on écarte les saisies aberrantes plutôt que de fausser le calcul. */
export function usableDuration(s: TrainingLike): number {
  const d = s.durationMin
  if (!d || d < MIN_PLAUSIBLE_MIN || d > MAX_PLAUSIBLE_MIN) return DEFAULT_SESSION_MIN
  return d
}

/** Minutes de course, échauffement et sprints séparés (leur coût n'est pas le même). */
export function sprintMinutes(s: TrainingLike): { warm: number, hard: number } {
  let warm = 0, hard = 0
  for (const sp of s.sprint ?? []) {
    const sec = (Number(sp.count) || 0) * (Number(sp.duration) || 0)
    if (sp.kind === 'sprint') hard += sec / 60
    else warm += sec / 60
  }
  return { warm, hard }
}

/**
 * Dépense NETTE d'une séance, en kcal : ce qu'elle coûte EN PLUS de ce que le corps
 * aurait brûlé au repos pendant le même temps. Soustraire le métabolisme de base est
 * indispensable, sinon on compte deux fois la même heure et on surestime de ~80 kcal.
 */
export function sessionBurn(s: TrainingLike, kg: number, bmr: number): number {
  const min = usableDuration(s)
  const sets = workSetCount(s)
  const density = min > 0 ? sets / min : 0
  const met = MET_LIFT_MIN + (MET_LIFT_MAX - MET_LIFT_MIN) * clamp(density / DENSITY_REF, 0, 1)

  const { warm, hard } = sprintMinutes(s)
  const gross = met * kg * (min / 60) + MET_WARMUP * kg * (warm / 60) + MET_SPRINT * kg * (hard / 60)
  const atRest = (bmr / 1440) * (min + warm + hard)
  return Math.max(0, Math.round((gross - atRest) * (1 + EPOC_BONUS)))
}

/** Dépense cumulée des séances d'une même journée (il arrive d'en faire deux). */
export const dayBurn = (sessions: TrainingLike[], kg: number, bmr: number) =>
  sessions.reduce((n, s) => n + sessionBurn(s, kg, bmr), 0)

/** Filtre les séances enregistrées à une date donnée (`at` est un ISO complet). */
export const sessionsOn = <T extends { at: string }>(sessions: T[], iso: string) =>
  sessions.filter(s => s.at.slice(0, 10) === iso)

// ─── Cible dynamique ────────────────────────────────────────────────────────

/**
 * Cible calorique du jour à partir de la dépense réellement mesurée.
 * NEAT (métabolisme × facteur d'activité hors séance) + coût de la séance − déficit.
 * `burn = 0` retombe exactement sur la cible d'un jour sans séance : les deux modes
 * de calcul restent cohérents entre eux.
 */
export function targetFor(bmr: number, burn: number): number {
  const spend = bmr * PAL_REST + burn
  const deficit = burn > 0 ? GYM_DEFICIT : REST_DEFICIT
  return Math.round((spend - deficit) / 10) * 10
}

export type DayStatus = 'rest' | 'pending' | 'done' | 'bonus' | 'missed' | 'skipped'

/**
 * État d'une journée, croisant le planning et le journal de séances.
 * `pending` existe pour ne pas déclarer une séance ratée à 10 h du matin alors
 * qu'elle est prévue à midi — on n'affiche un verdict qu'une fois la journée jouée.
 */
export function dayStatus(opts: {
  planned: boolean
  recorded: number
  skipped: boolean
  isPast: boolean
}): DayStatus {
  if (opts.recorded > 0) return opts.planned ? 'done' : 'bonus'
  if (opts.skipped) return 'skipped'
  if (!opts.planned) return 'rest'
  return opts.isPast ? 'missed' : 'pending'
}

export const STATUS_LABELS: Record<DayStatus, string> = {
  rest: 'Jour sans séance',
  pending: 'Séance prévue, pas encore enregistrée',
  done: 'Séance faite',
  bonus: 'Séance en plus du planning',
  missed: 'Séance prévue, non enregistrée',
  skipped: 'Séance annulée',
}

// ─── Ajustement du repas du soir ────────────────────────────────────────────

/** En dessous de ce seuil, l'écart tient dans l'incertitude du modèle : on ne dit rien. */
export const ADJUST_THRESHOLD = 60
/** Au-delà, on plafonne : un écart énorme vient d'une saisie douteuse, pas de la réalité. */
export const ADJUST_MAX = 300
/** On ne descend jamais une portion sous 40 % de sa taille prévue. */
export const PORTION_FLOOR = 0.4
export const PORTION_CEIL = 1.8

export interface DinnerAdjustment {
  delta: number // kcal à retirer (négatif) ou ajouter (positif)
  applied: number // delta réellement réalisable sur la portion
  foodId: string | null
  foodName: string
  fromG: number
  toG: number
  label: string
}

/**
 * Traduit l'écart entre la cible du jour et ce que le plan prévoit en une action
 * concrète sur le féculent du dîner — « 250 g de pommes de terre au lieu de 350 ».
 * Un écart en kcal ne se pilote pas ; une portion en grammes, si.
 */
export function dinnerAdjustment(
  plannedKcal: number,
  target: number,
  dinner: DayMeal | undefined,
  foods: Record<string, Food> = FOOD_BY_ID,
): DinnerAdjustment | null {
  const delta = target - plannedKcal
  if (Math.abs(delta) < ADJUST_THRESHOLD || !dinner) return null

  const capped = clamp(delta, -ADJUST_MAX, ADJUST_MAX)
  // On agit sur le féculent le plus calorique du plat : c'est le levier le plus lisible.
  const starchy = dinner.items
    .filter(i => STARCHY.has(i.food) && foods[i.food])
    .sort((a, b) => (foods[b.food].kcal * b.g) - (foods[a.food].kcal * a.g))[0]

  if (!starchy) {
    return {
      delta: capped, applied: 0, foodId: null, foodName: '',
      fromG: 0, toG: 0,
      label: capped < 0
        ? `Retire ${Math.abs(capped)} kcal au dîner (une cuillère d'huile en moins, moins de pain).`
        : `Ajoute ${capped} kcal au dîner (une part de féculent en plus).`,
    }
  }

  const food = foods[starchy.food]
  const perG = food.kcal / 100
  const rawG = starchy.g + capped / perG
  const toG = roundPortion(clamp(rawG, starchy.g * PORTION_FLOOR, starchy.g * PORTION_CEIL))
  const applied = Math.round((toG - starchy.g) * perG)

  return {
    delta: capped,
    applied,
    foodId: food.id,
    foodName: food.name,
    fromG: starchy.g,
    toG,
    label: applied < 0
      ? `Ce soir : ${toG} g de ${food.name.toLowerCase()} au lieu de ${starchy.g} g (${applied} kcal).`
      : `Ce soir : ${toG} g de ${food.name.toLowerCase()} au lieu de ${starchy.g} g (+${applied} kcal).`,
  }
}

/** Après cette heure, la séance de midi est jouée : on peut conclure sur la journée. */
export const SESSION_CUTOFF_HOUR = 15

/**
 * La journée est-elle « jouée » ? Sert à ne pas afficher « séance ratée » à 10 h
 * du matin pour une séance prévue à midi.
 */
export function isDayPlayed(iso: string, todayIso: string, hour: number): boolean {
  if (iso < todayIso) return true
  if (iso > todayIso) return false
  return hour >= SESSION_CUTOFF_HOUR
}

/**
 * Applique l'ajustement au dîner et recalcule les totaux, pour que les compteurs
 * affichés correspondent à ce qui sera réellement mangé — pas au plan théorique.
 */
export function applyAdjustment(day: DayPlan, adj: DinnerAdjustment | null): DayPlan {
  if (!adj?.foodId || adj.applied === 0) return day
  const meals = day.meals.map((m) => {
    if (m.slot !== 'dinner') return m
    const items = m.items.map(i => (i.food === adj.foodId ? { ...i, g: adj.toG } : i))
    return { ...m, items, macros: macrosOf(items), adjusted: true }
  })
  return { ...day, meals, total: sumMacros(meals.map(m => m.macros)) }
}

// ─── Repas déjà cuisinés : retirer plutôt que peser ─────────────────────────
// Quand tout est préparé et portionné le week-end, la consigne « 165 g au lieu de
// 255 g » est inapplicable : la boîte est fermée. Il faut alors dire quoi LAISSER
// ou quoi supprimer du menu.

export type PrepMode = 'separate' | 'assembled'

export const PREP_LABELS: Record<PrepMode, string> = {
  separate: 'Féculents cuits en vrac, portionnés au moment',
  assembled: 'Boîtes assemblées à l\'avance',
}

export type StepKind = 'partial' | 'drop' | 'add'

export interface AdjustStep {
  slot: string
  kind: StepKind
  label: string
  kcal: number // négatif = retiré, positif = ajouté
}

export interface AdjustPlan {
  mode: PrepMode
  delta: number // écart à combler
  covered: number // ce que les étapes couvrent réellement
  steps: AdjustStep[]
  /** Portion pesée (mode « féculents à part » uniquement). */
  portion: DinnerAdjustment | null
}

/** Ce qu'on accepte de laisser dans une boîte : au-delà, autant ne pas l'avoir cuisiné. */
export const LEAVE_MAX = 0.5
/** On arrête de retirer dès qu'on a couvert cette part du besoin. */
export const COVER_ENOUGH = 0.85

const pct = (v: number) => `${Math.round(v * 100)} %`

/** Repas entiers supprimables, dans l'ordre où on accepte de s'en passer. */
const DROPPABLE: { slot: string, why: string }[] = [
  { slot: 'snack', why: 'la collation de l\'après-midi' },
  { slot: 'night', why: 'le fromage blanc du soir' },
]

/**
 * Construit la liste des retraits à opérer sur une journée déjà cuisinée.
 * Ordre : d'abord une fraction du féculent du dîner (indolore, on laisse dans
 * l'assiette), puis celui du déjeuner, puis les repas annexes. Les protéines et
 * les légumes ne sont jamais touchés.
 */
export function removalSteps(day: DayPlan, need: number, foods: Record<string, Food> = FOOD_BY_ID): AdjustStep[] {
  const steps: AdjustStep[] = []
  let left = need

  const starchyOf = (slot: string) => {
    const meal = day.meals.find(m => m.slot === slot)
    if (!meal) return null
    const it = meal.items
      .filter(i => STARCHY.has(i.food) && foods[i.food])
      .sort((a, b) => (foods[b.food].kcal * b.g) - (foods[a.food].kcal * a.g))[0]
    return it ? { meal, item: it, food: foods[it.food] } : null
  }

  for (const slot of ['dinner', 'lunch']) {
    if (left < ADJUST_THRESHOLD / 2) break
    const s = starchyOf(slot)
    if (!s) continue
    const perG = s.food.kcal / 100
    const maxG = s.item.g * LEAVE_MAX
    const wantG = Math.min(maxG, left / perG)
    // Arrondi vers le BAS : on ne veut jamais laisser plus que le plafond annoncé.
    const leaveG = Math.floor(wantG / 5) * 5
    if (leaveG < 10) continue
    const kcal = Math.round(leaveG * perG)
    steps.push({
      slot,
      kind: 'partial',
      kcal: -kcal,
      label: `Laisse ${leaveG} g de ${s.food.name.toLowerCase()} dans la boîte — environ ${pct(leaveG / s.item.g)} de la portion.`,
    })
    left -= kcal
  }

  for (const d of DROPPABLE) {
    if (left < ADJUST_THRESHOLD) break
    const meal = day.meals.find(m => m.slot === d.slot)
    if (!meal) continue
    const kcal = Math.round(meal.macros.kcal)
    if (kcal < 40) continue
    steps.push({
      slot: d.slot,
      kind: 'drop',
      kcal: -kcal,
      label: `Saute ${d.why} (−${kcal} kcal).`,
    })
    left -= kcal
  }

  return steps
}

/** Ajouts possibles quand la séance a coûté plus cher que prévu et que la boîte est figée. */
export function additionSteps(need: number): AdjustStep[] {
  if (need < ADJUST_THRESHOLD) return []
  // Le pain complet est le complément le plus simple : rien à cuisiner, se dose à la tranche.
  const bread = FOOD_BY_ID['pain-complet']
  if (!bread) return []
  const g = roundPortion(clamp(need / (bread.kcal / 100), 20, 80))
  const kcal = Math.round(g * bread.kcal / 100)
  return [{
    slot: 'dinner',
    kind: 'add',
    kcal,
    label: `Ajoute ${g} g de pain complet au dîner (+${kcal} kcal) — ou une banane, c'est équivalent.`,
  }]
}

/**
 * Consigne d'ajustement complète, selon la façon dont les repas ont été préparés.
 * `separate` → on repèse la portion. `assembled` → on retire ce qui peut l'être.
 */
export function adjustPlanFor(
  day: DayPlan,
  target: number,
  mode: PrepMode,
  foods: Record<string, Food> = FOOD_BY_ID,
): AdjustPlan | null {
  const delta = target - day.total.kcal
  if (Math.abs(delta) < ADJUST_THRESHOLD) return null

  if (mode === 'separate') {
    const portion = dinnerAdjustment(day.total.kcal, target, day.meals.find(m => m.slot === 'dinner'), foods)
    if (!portion) return null
    return { mode, delta, covered: portion.applied, steps: [], portion }
  }

  const capped = clamp(delta, -ADJUST_MAX, ADJUST_MAX)
  const steps = capped < 0 ? removalSteps(day, -capped, foods) : additionSteps(capped)
  if (!steps.length) return null
  return { mode, delta: capped, covered: steps.reduce((n, s) => n + s.kcal, 0), steps, portion: null }
}

/** Applique les retraits au plan pour que les compteurs reflètent ce qui sera mangé. */
export function applySteps(day: DayPlan, plan: AdjustPlan | null, foods: Record<string, Food> = FOOD_BY_ID): DayPlan {
  if (!plan) return day
  if (plan.portion) return applyAdjustment(day, plan.portion)
  if (!plan.steps.length) return day

  const dropped = new Set(plan.steps.filter(s => s.kind === 'drop').map(s => s.slot))
  const meals = day.meals
    .filter(m => !dropped.has(m.slot))
    .map((m) => {
      const step = plan.steps.find(s => s.slot === m.slot && s.kind !== 'drop')
      if (!step) return m
      if (step.kind === 'add') {
        const items = [...m.items, { food: 'pain-complet', g: roundPortion(step.kcal / (foods['pain-complet'].kcal / 100)) }]
        return { ...m, items, macros: macrosOf(items, foods), adjusted: true }
      }
      const target = m.items
        .filter(i => STARCHY.has(i.food) && foods[i.food])
        .sort((a, b) => (foods[b.food].kcal * b.g) - (foods[a.food].kcal * a.g))[0]
      if (!target) return m
      const leaveG = roundPortion(-step.kcal / (foods[target.food].kcal / 100))
      const items = m.items.map(i => (i.food === target.food ? { ...i, g: Math.max(0, i.g - leaveG) } : i))
      return { ...m, items, macros: macrosOf(items, foods), adjusted: true }
    })
  return { ...day, meals, total: sumMacros(meals.map(m => m.macros)) }
}

/**
 * Quantité à préparer par portion quand on cuisine à l'avance sans savoir si la
 * séance aura lieu : TOUJOURS la version « jour avec séance ». On peut laisser du
 * riz dans une boîte ; on ne peut pas y ajouter celui qu'on n'a pas cuit.
 */
export const PREP_ON_HIGH_SIDE = true

// ─── Planning : semaine type + exceptions ───────────────────────────────────
// Une semaine type qu'on définit une fois, et des exceptions au jour le jour.
// Le télétravail et la séance sont deux axes indépendants : Grégoire télétravaille
// le mardi et le vendredi, et va quand même à la salle ces jours-là.

export interface WeekTemplate {
  gym: boolean[] // 7 cases, index 0 = lundi
  tt: boolean[]
}

export const DEFAULT_WEEK: WeekTemplate = {
  gym: [true, true, false, true, true, false, false], // lun, mar, jeu, ven
  tt: [false, true, false, false, true, false, false], // mar, ven
}

/** Exception ponctuelle sur une date. Tout est optionnel : on ne surcharge que ce qui change. */
export interface DayOverride {
  gym?: boolean
  tt?: boolean
  steps?: number
  lunch?: string // id de recette imposé
  dinner?: string
}

export interface ResolvedDay {
  iso: string
  dow: number // 0 = lundi
  gym: boolean
  tt: boolean
  steps: number | null
  menu: Partial<DayTemplate>
  overridden: boolean
}

/** Applique la semaine type puis l'exception du jour. */
export function resolveDay(iso: string, week: WeekTemplate, over?: DayOverride): ResolvedDay {
  const dow = dowIndex(iso)
  const o = over ?? {}
  const menu: Partial<DayTemplate> = {}
  if (o.lunch) menu.lunch = o.lunch
  if (o.dinner) menu.dinner = o.dinner
  return {
    iso,
    dow,
    gym: o.gym ?? week.gym[dow] ?? false,
    tt: o.tt ?? week.tt[dow] ?? false,
    steps: o.steps ?? null,
    menu,
    overridden: Object.keys(o).length > 0,
  }
}

export const weekLabel = (w: WeekTemplate, dow: number) =>
  [w.gym[dow] ? 'Salle' : null, w.tt[dow] ? 'Télétravail' : null].filter(Boolean).join(' · ') || 'Rien de prévu'

// ─── Ce qui a été mangé ─────────────────────────────────────────────────────

/** Repas pris en dehors du plan : un plat de la bibliothèque, ou une saisie rapide. */
export interface Extra {
  id: string
  label: string
  kcal: number
  p: number
  g: number
  l: number
  time?: string // heure de prise, au format HH:MM
  recipeId?: string
}

export const extraFromRecipe = (recipe: Recipe, lib: Library, id: string): Extra => {
  const m = macrosOf(recipe.items, lib.foods)
  return { id, label: recipe.name, recipeId: recipe.id, ...roundMacros(m) }
}

/** Saisie rapide : on ne connaît que les calories, les macros restent à zéro. */
export const quickExtra = (label: string, kcal: number, id: string): Extra =>
  ({ id, label, kcal: Math.round(kcal), p: 0, g: 0, l: 0 })

export interface DayIntake {
  eaten: Macros // repas du plan validés + extras
  planned: Macros // total prévu par le plan
  extras: Macros
  remaining: number // cible − mangé
  progress: number // 0 → 1
}

/** Bilan de consommation du jour : ce qui est validé, ce qui reste. */
export function dayIntake(day: DayPlan, eatenSlots: string[], extras: Extra[], target: number): DayIntake {
  const done = new Set(eatenSlots)
  const fromPlan = sumMacros(day.meals.filter(m => done.has(m.slot)).map(m => m.macros))
  const fromExtras = sumMacros(extras.map(e => ({ kcal: e.kcal, p: e.p, g: e.g, l: e.l })))
  const eaten = sumMacros([fromPlan, fromExtras])
  return {
    eaten: roundMacros(eaten),
    planned: roundMacros(sumMacros([day.total, fromExtras])),
    extras: roundMacros(fromExtras),
    remaining: Math.round(target - eaten.kcal),
    progress: target > 0 ? clamp(eaten.kcal / target, 0, 1.5) : 0,
  }
}

// ─── Édition de la bibliothèque ─────────────────────────────────────────────

/** Identifiant lisible et stable, dérivé du nom. Suffixé si déjà pris. */
export function slugify(name: string, taken: string[] = []): string {
  const base = name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'plat'
  if (!taken.includes(base)) return base
  let n = 2
  while (taken.includes(`${base}-${n}`)) n++
  return `${base}-${n}`
}

export interface ValidationError { field: string, message: string }

/** Contrôles avant d'enregistrer un aliment saisi depuis un emballage. */
export function validateFood(f: Partial<Food>): ValidationError[] {
  const errs: ValidationError[] = []
  if (!f.name?.trim()) errs.push({ field: 'name', message: 'Il faut un nom.' })
  for (const [k, label] of [['kcal', 'calories'], ['p', 'protéines'], ['g', 'glucides'], ['l', 'lipides']] as const) {
    const v = f[k]
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
      errs.push({ field: k, message: `Valeur de ${label} manquante ou négative.` })
    }
  }
  // Contrôle de cohérence : les macros doivent expliquer les calories à ±25 %.
  if (!errs.length) {
    const computed = (f.p! * 4) + (f.g! * 4) + (f.l! * 9)
    if (f.kcal! > 0 && Math.abs(computed - f.kcal!) > f.kcal! * 0.25 + 20) {
      errs.push({ field: 'kcal', message: `Les macros donnent ${Math.round(computed)} kcal, pas ${f.kcal}. Vérifie l'étiquette.` })
    }
  }
  return errs
}

export function validateRecipe(r: Partial<Recipe>, lib: Library): ValidationError[] {
  const errs: ValidationError[] = []
  if (!r.name?.trim()) errs.push({ field: 'name', message: 'Il faut un nom.' })
  if (!r.items?.length) errs.push({ field: 'items', message: 'Ajoute au moins un ingrédient.' })
  for (const it of r.items ?? []) {
    if (!lib.foods[it.food]) errs.push({ field: 'items', message: `Aliment inconnu : ${it.food}.` })
    else if (!(it.g > 0)) errs.push({ field: 'items', message: `Quantité manquante pour ${lib.foods[it.food].name}.` })
  }
  return errs
}

// ─── Écarts et rattrapage ───────────────────────────────────────────────────
// Le corps ne remet pas ses compteurs à zéro à minuit : le déficit se pilote sur la
// semaine, pas sur la journée. Mais compenser un écart 1 pour 1 le lendemain est le
// meilleur moyen d'enclencher un cycle restriction / craquage. On lisse donc le report
// sur les jours restants, avec un plafond et un plancher.

/** Report maximum sur une seule journée : au-delà, la journée devient invivable. */
export const CARRY_MAX_PER_DAY = 200
/** Et jamais en dessous de cette part de la cible du jour. */
export const CARRY_FLOOR_RATIO = 0.85
/** Au-delà de cet écart, on ne rattrape plus : on reprend le plan normalement. */
export const CARRY_GIVE_UP = 1500

export interface DayBalance { iso: string, target: number, eaten: number, closed: boolean }

export interface WeekBalance {
  surplus: number // cumul des écarts sur les jours clos (positif = mangé en trop)
  daysLeft: number
  perDay: number // correction à appliquer chaque jour restant (négative si surplus)
  capped: boolean // le report a dû être plafonné
  giveUp: boolean // écart trop gros pour être rattrapé
  advice: string
}

/**
 * Bilan de la semaine et report à appliquer aux jours restants.
 * Seuls les jours clos comptent : un jour en cours n'est pas un écart, c'est un jour
 * en cours.
 */
export function weekBalance(days: DayBalance[]): WeekBalance {
  const closed = days.filter(d => d.closed)
  const left = days.filter(d => !d.closed)
  const surplus = Math.round(closed.reduce((n, d) => n + (d.eaten - d.target), 0))
  const daysLeft = left.length

  if (!daysLeft || Math.abs(surplus) < ADJUST_THRESHOLD) {
    return {
      surplus,
      daysLeft,
      perDay: 0,
      capped: false,
      giveUp: false,
      advice: daysLeft
        ? 'Semaine dans les clous, rien à rattraper.'
        : 'Semaine terminée. Le bilan repart à zéro lundi.',
    }
  }

  if (surplus > CARRY_GIVE_UP) {
    return {
      surplus,
      daysLeft,
      perDay: 0,
      capped: false,
      giveUp: true,
      advice: `${surplus} kcal d'écart, c'est trop pour être rattrapé sans casser la semaine suivante. Reprends le plan normalement : au pire, ça représente ${(surplus / KCAL_PER_KG_FAT).toFixed(1).replace('.', ',')} kg de gras, récupérés en quelques jours. Vouloir compenser d'un coup est ce qui déclenche le craquage suivant.`,
    }
  }

  const raw = -surplus / daysLeft
  const perDay = Math.round(clamp(raw, -CARRY_MAX_PER_DAY, CARRY_MAX_PER_DAY))
  const capped = Math.abs(raw) > CARRY_MAX_PER_DAY

  return {
    surplus,
    daysLeft,
    perDay,
    capped,
    giveUp: false,
    advice: surplus > 0
      ? `${surplus} kcal au-dessus sur la semaine. Étalé sur les ${daysLeft} jours restants, ça fait ${Math.abs(perDay)} kcal de moins par jour — un féculent un peu plus petit, rien de plus.${capped ? ' Le report est plafonné : le reste est absorbé, pas rattrapé.' : ''}`
      : `${Math.abs(surplus)} kcal en dessous sur la semaine. Tu peux ajouter ${perDay} kcal par jour sur les ${daysLeft} jours restants — descendre trop bas finit toujours par se payer sur les séances.`,
  }
}

/** Applique le report à la cible d'un jour, sans jamais passer sous le plancher. */
export function carryAdjustedTarget(target: number, perDay: number): number {
  const floor = Math.round(target * CARRY_FLOOR_RATIO)
  return Math.round(Math.max(floor, target + perDay) / 10) * 10
}

// ─── Frise de la journée ────────────────────────────────────────────────────

export interface TimelineEntry {
  key: string
  time: string
  label: string
  kcal: number
  kind: 'plan' | 'extra'
  slot?: string
  extraId?: string
  done: boolean
}

const minutesOf = (time: string) => {
  const m = time.match(/(\d{1,2})\s*h?\s*(\d{2})?/)
  if (!m) return 9999
  return Number(m[1]) * 60 + Number(m[2] ?? 0)
}

/**
 * Tout ce qui compose la journée, repas du plan et extras confondus, dans l'ordre
 * des horaires. C'est la vue dont on a besoin pour remplir sa journée au fil de l'eau.
 */
export function timelineOf(day: DayPlan | null, eatenSlots: string[], extras: Extra[]): TimelineEntry[] {
  const done = new Set(eatenSlots)
  const fromPlan: TimelineEntry[] = (day?.meals ?? []).map(m => ({
    key: `plan:${m.slot}`,
    time: m.time,
    label: m.name,
    kcal: Math.round(m.macros.kcal),
    kind: 'plan',
    slot: m.slot,
    done: done.has(m.slot),
  }))
  const fromExtras: TimelineEntry[] = extras.map(e => ({
    key: `extra:${e.id}`,
    time: e.time ?? '—',
    label: e.label,
    kcal: e.kcal,
    kind: 'extra',
    extraId: e.id,
    done: true, // un extra n'est saisi qu'une fois mangé
  }))
  return [...fromPlan, ...fromExtras].sort((a, b) => minutesOf(a.time) - minutesOf(b.time))
}

/** Prochain repas non validé — celui à mettre en avant sur l'accueil. */
export const nextMeal = (line: TimelineEntry[]) => line.find(e => e.kind === 'plan' && !e.done) ?? null

/** Heure courante au format HH:MM, pour préremplir une saisie. */
export const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
