import { computed, ref } from 'vue'
import type { Food, Recipe } from '~/data/nutritionProgram'
import type { DayOverride, Extra, Library, PrepMode, PriceMap, WeekTemplate } from '~/lib/nutritionStats'
import {
  DEFAULT_WEEK, basketTotal, cycleIndexOf, mergeFoods, mergeRecipes, resolveDay, shoppingFor, slugify,
} from '~/lib/nutritionStats'
import { isoOf, shiftIso } from '~/utils/sportStats'

// État du module nutrition, persisté en localStorage — même pattern que useWorkout :
// des refs au niveau module (donc partagées entre tous les appelants) et une
// hydratation unique gardée par un flag.
const PRICES_KEY = 'gr-nutri-prices-v1' // prix saisis, en € / kg
const CHECKED_KEY = 'gr-nutri-shopping-v1' // aliments déjà dans le caddie
const BATCH_KEY = 'gr-nutri-batch-v1' // tâches de batch cooking cochées
const EATEN_KEY = 'gr-nutri-eaten-v1' // repas du plan validés, par date
const BASKETS_KEY = 'gr-nutri-baskets-v1' // historique des courses payées
const PREP_KEY = 'gr-nutri-prep-v1' // boîtes assemblées à l'avance, ou féculents à part
const WEEK_KEY = 'gr-nutri-week-v1' // semaine type : salle et télétravail
const OVER_KEY = 'gr-nutri-days-v1' // exceptions par date
const EXTRA_KEY = 'gr-nutri-extras-v1' // repas hors plan, par date
const FOODS_KEY = 'gr-nutri-foods-v1' // aliments créés
const FOODPATCH_KEY = 'gr-nutri-foodpatch-v1' // aliments livrés, modifiés
const RECIPES_KEY = 'gr-nutri-recipes-v1' // plats créés
const RECIPEPATCH_KEY = 'gr-nutri-recipepatch-v1' // plats livrés, modifiés
const OFF_KEY = 'gr-nutri-off-v1' // plats mis de côté
export interface Basket { date: string, total: number, days: number }
const prices = ref<PriceMap>({})
const checked = ref<Record<string, boolean>>({})
const batchDone = ref<Record<string, boolean>>({})
const eaten = ref<Record<string, string[]>>({})
const baskets = ref<Basket[]>([])
const prepMode = ref<PrepMode>('separate')
const week = ref<WeekTemplate>({ gym: [...DEFAULT_WEEK.gym], tt: [...DEFAULT_WEEK.tt] })
const overrides = ref<Record<string, DayOverride>>({})
const extras = ref<Record<string, Extra[]>>({})
const userFoods = ref<Food[]>([])
const foodPatches = ref<Record<string, Partial<Food>>>({})
const userRecipes = ref<Recipe[]>([])
const recipePatches = ref<Record<string, Partial<Recipe>>>({})
const disabledRecipes = ref<string[]>([])
let hydrated = false
let seq = 0
function safeParse<T>(raw: string | null, fb: T): T {
  if (!raw) return fb
  try { return JSON.parse(raw) as T } catch { return fb }
}
function write(key: string, value: unknown) {
  if (!import.meta.client) return
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* stockage plein ou indispo */ }
}
// La date de démarrage et le mode de préparation sont stockés en clair, pas en JSON.
function writeRaw(key: string, value: string) {
  if (!import.meta.client) return
  try { localStorage.setItem(key, value) } catch { /* stockage plein ou indispo */ }
}
/** Identifiant local unique — sans crypto.randomUUID, pour rester testable partout. */
const nextId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`
const isWeek = (w: unknown): w is WeekTemplate =>
  !!w && Array.isArray((w as WeekTemplate).gym) && (w as WeekTemplate).gym.length === 7
  && Array.isArray((w as WeekTemplate).tt) && (w as WeekTemplate).tt.length === 7
export function useNutrition() {
  function hydrate() {
    if (hydrated || !import.meta.client) return
    prices.value = safeParse(localStorage.getItem(PRICES_KEY), {})
    checked.value = safeParse(localStorage.getItem(CHECKED_KEY), {})
    batchDone.value = safeParse(localStorage.getItem(BATCH_KEY), {})
    eaten.value = safeParse(localStorage.getItem(EATEN_KEY), {})
    baskets.value = safeParse(localStorage.getItem(BASKETS_KEY), [])
    overrides.value = safeParse(localStorage.getItem(OVER_KEY), {})
    extras.value = safeParse(localStorage.getItem(EXTRA_KEY), {})
    userFoods.value = safeParse(localStorage.getItem(FOODS_KEY), [])
    foodPatches.value = safeParse(localStorage.getItem(FOODPATCH_KEY), {})
    userRecipes.value = safeParse(localStorage.getItem(RECIPES_KEY), [])
    recipePatches.value = safeParse(localStorage.getItem(RECIPEPATCH_KEY), {})
    disabledRecipes.value = safeParse(localStorage.getItem(OFF_KEY), [])
    const w = safeParse<unknown>(localStorage.getItem(WEEK_KEY), null)
    if (isWeek(w)) week.value = w
    const pm = localStorage.getItem(PREP_KEY)
    if (pm === 'assembled' || pm === 'separate') prepMode.value = pm
    hydrated = true
  }
  // ─── Bibliothèque ─────────────────────────────────────────────────────────
  /** Aliments et plats effectivement disponibles : livrés + créés + modifiés. */
  const library = computed<Library>(() => ({
    foods: mergeFoods(userFoods.value, foodPatches.value),
    recipes: mergeRecipes(userRecipes.value, recipePatches.value, disabledRecipes.value),
  }))
  const isCustomFood = (id: string) => userFoods.value.some(f => f.id === id)
  const isCustomRecipe = (id: string) => userRecipes.value.some(r => r.id === id)
  /** Ajoute un aliment saisi depuis un emballage. Renvoie son id. */
  function addFood(food: Omit<Food, 'id'> & { id?: string }): string {
    const id = food.id || slugify(food.name, Object.keys(library.value.foods))
    userFoods.value = [...userFoods.value.filter(f => f.id !== id), { ...food, id, custom: true } as Food]
    write(FOODS_KEY, userFoods.value)
    return id
  }
  /** Modifie un aliment. Un aliment livré est patché, un aliment perso est réécrit. */
  function patchFood(id: string, patch: Partial<Food>) {
    if (isCustomFood(id)) {
      userFoods.value = userFoods.value.map(f => (f.id === id ? { ...f, ...patch, id } : f))
      write(FOODS_KEY, userFoods.value)
      return
    }
    foodPatches.value = { ...foodPatches.value, [id]: { ...foodPatches.value[id], ...patch } }
    write(FOODPATCH_KEY, foodPatches.value)
  }
  function removeFood(id: string) {
    userFoods.value = userFoods.value.filter(f => f.id !== id)
    write(FOODS_KEY, userFoods.value)
  }
  /** Annule les modifications faites sur un aliment livré. */
  function resetFood(id: string) {
    const next = { ...foodPatches.value }
    delete next[id]
    foodPatches.value = next
    write(FOODPATCH_KEY, foodPatches.value)
  }
  function addRecipe(recipe: Omit<Recipe, 'id'> & { id?: string }): string {
    const id = recipe.id || slugify(recipe.name, Object.keys(library.value.recipes))
    userRecipes.value = [...userRecipes.value.filter(r => r.id !== id), { ...recipe, id, custom: true } as Recipe]
    write(RECIPES_KEY, userRecipes.value)
    return id
  }
  function patchRecipe(id: string, patch: Partial<Recipe>) {
    if (isCustomRecipe(id)) {
      userRecipes.value = userRecipes.value.map(r => (r.id === id ? { ...r, ...patch, id } : r))
      write(RECIPES_KEY, userRecipes.value)
      return
    }
    recipePatches.value = { ...recipePatches.value, [id]: { ...recipePatches.value[id], ...patch } }
    write(RECIPEPATCH_KEY, recipePatches.value)
  }
  function removeRecipe(id: string) {
    userRecipes.value = userRecipes.value.filter(r => r.id !== id)
    write(RECIPES_KEY, userRecipes.value)
  }
  function resetRecipe(id: string) {
    const next = { ...recipePatches.value }
    delete next[id]
    recipePatches.value = next
    write(RECIPEPATCH_KEY, recipePatches.value)
  }
  /** Met un plat de côté : il reste consultable mais ne tombe plus dans le planning. */
  function toggleRecipeActive(id: string) {
    disabledRecipes.value = disabledRecipes.value.includes(id)
      ? disabledRecipes.value.filter(x => x !== id)
      : [...disabledRecipes.value, id]
    write(OFF_KEY, disabledRecipes.value)
  }
  const isRecipeActive = (id: string) => !disabledRecipes.value.includes(id)
  // ─── Planning ─────────────────────────────────────────────────────────────
  /** Semaine type : deux axes indépendants, la salle et le télétravail. */
  function setWeekDay(dow: number, field: 'gym' | 'tt', value: boolean) {
    const next: WeekTemplate = { gym: [...week.value.gym], tt: [...week.value.tt] }
    next[field][dow] = value
    week.value = next
    write(WEEK_KEY, week.value)
  }
  function resetWeek() {
    week.value = { gym: [...DEFAULT_WEEK.gym], tt: [...DEFAULT_WEEK.tt] }
    write(WEEK_KEY, week.value)
  }
  const dayFor = (iso: string) => resolveDay(iso, week.value, overrides.value[iso])
  /** Exception ponctuelle. Une valeur `undefined` revient à la semaine type. */
  function setOverride(iso: string, patch: DayOverride) {
    const cur: DayOverride = { ...overrides.value[iso], ...patch }
    for (const k of Object.keys(cur) as (keyof DayOverride)[]) {
      if (cur[k] === undefined || cur[k] === null) delete cur[k]
    }
    const next = { ...overrides.value }
    if (Object.keys(cur).length) next[iso] = cur
    else delete next[iso]
    overrides.value = next
    write(OVER_KEY, overrides.value)
  }
  function clearOverride(iso: string) {
    const next = { ...overrides.value }
    delete next[iso]
    overrides.value = next
    write(OVER_KEY, overrides.value)
  }
  const hasOverride = (iso: string) => !!overrides.value[iso]
  /**
   * Télétravail CONFIRMÉ ce jour-là, par opposition à celui que la semaine type
   * suppose. Le calendrier ne montre que du réel : un mardi de télétravail par
   * défaut mais passé au bureau ne doit pas rester marqué comme tel dans
   * l'historique.
   */
  const ttConfirmed = (iso: string) => overrides.value[iso]?.tt === true
  /** Pas du jour. `null` = non saisis, on retombe sur l'estimation télétravail / sur site. */
  const stepsFor = (iso: string) => overrides.value[iso]?.steps ?? null
  const setSteps = (iso: string, steps: number | null) =>
    setOverride(iso, { steps: steps === null || !Number.isFinite(steps as number) ? undefined : Math.max(0, Math.round(steps as number)) })
  // ─── Cycle de recettes ────────────────────────────────────────────────────
  /** Position dans le cycle de 14 jours. Déduite de la date : rien à démarrer. */
  const indexFor = (iso: string) => cycleIndexOf(iso)
  // ─── Repas mangés ─────────────────────────────────────────────────────────
  const isEaten = (iso: string, slot: string) => (eaten.value[iso] ?? []).includes(slot)
  function toggleEaten(iso: string, slot: string) {
    const cur = eaten.value[iso] ?? []
    const next = cur.includes(slot) ? cur.filter(s => s !== slot) : [...cur, slot]
    eaten.value = { ...eaten.value, [iso]: next }
    write(EATEN_KEY, eaten.value)
  }
  const eatenSlots = (iso: string) => eaten.value[iso] ?? []
  const eatenCount = (iso: string) => eatenSlots(iso).length
  const extrasFor = (iso: string) => extras.value[iso] ?? []
  function addExtra(iso: string, extra: Omit<Extra, 'id'>) {
    const e: Extra = { ...extra, id: nextId('x') }
    extras.value = { ...extras.value, [iso]: [...extrasFor(iso), e] }
    write(EXTRA_KEY, extras.value)
    return e.id
  }
  function removeExtra(iso: string, id: string) {
    extras.value = { ...extras.value, [iso]: extrasFor(iso).filter(e => e.id !== id) }
    write(EXTRA_KEY, extras.value)
  }
  // ─── Prix et liste de courses ─────────────────────────────────────────────
  function setPrice(foodId: string, pricePerKg: number | null) {
    const next = { ...prices.value }
    if (pricePerKg && pricePerKg > 0) next[foodId] = Math.round(pricePerKg * 100) / 100
    else delete next[foodId]
    prices.value = next
    write(PRICES_KEY, prices.value)
  }
  const isChecked = (foodId: string) => !!checked.value[foodId]
  function toggleChecked(foodId: string) {
    checked.value = { ...checked.value, [foodId]: !checked.value[foodId] }
    write(CHECKED_KEY, checked.value)
  }
  function clearChecked() {
    checked.value = {}
    write(CHECKED_KEY, checked.value)
  }
  const isBatchDone = (key: string) => !!batchDone.value[key]
  function toggleBatch(key: string) {
    batchDone.value = { ...batchDone.value, [key]: !batchDone.value[key] }
    write(BATCH_KEY, batchDone.value)
  }
  function resetBatch(prefix: string) {
    const next = { ...batchDone.value }
    for (const k of Object.keys(next)) { if (k.startsWith(prefix)) delete next[k] }
    batchDone.value = next
    write(BATCH_KEY, batchDone.value)
  }
  function setPrepMode(mode: PrepMode) {
    prepMode.value = mode
    writeRaw(PREP_KEY, mode)
  }
  /**
   * Liste de courses sur une fenêtre de jours, d'après le planning réel :
   * un jour sans séance consomme moins de féculents, donc on en achète moins.
   */
  function shoppingWindow(fromIso: string, days: number) {
    const indices: number[] = []
    const flags = new Map<number, boolean>()
    for (let d = 0; d < days; d++) {
      const iso = shiftIso(fromIso, d)
      const i = indexFor(iso)
      indices.push(i)
      flags.set(i, dayFor(iso).gym)
    }
    return shoppingFor(indices, i => flags.get(i) ?? true, library.value.foods)
  }
  const cost = (list: ReturnType<typeof shoppingFor>) => basketTotal(list, prices.value)
  function addBasket(total: number, days: number, iso = isoOf(new Date())) {
    if (!(total > 0)) return
    baskets.value = [{ date: iso, total: Math.round(total * 100) / 100, days }, ...baskets.value].slice(0, 24)
    write(BASKETS_KEY, baskets.value)
  }
  function removeBasket(index: number) {
    baskets.value = baskets.value.filter((_, i) => i !== index)
    write(BASKETS_KEY, baskets.value)
  }
  const pricedCount = computed(() => Object.keys(prices.value).length)
  // ─── Sauvegarde ───────────────────────────────────────────────────────────
  function exportData() {
    return {
      prices: prices.value, checked: checked.value,
      batchDone: batchDone.value, eaten: eaten.value, baskets: baskets.value,
      prepMode: prepMode.value, week: week.value, overrides: overrides.value,
      extras: extras.value, userFoods: userFoods.value, foodPatches: foodPatches.value,
      userRecipes: userRecipes.value, recipePatches: recipePatches.value,
      disabledRecipes: disabledRecipes.value,
    }
  }
  /** Restauration depuis une sauvegarde. Tout est optionnel : un ancien fichier passe sans erreur. */
  function restore(data: { nutrition?: Partial<ReturnType<typeof exportData>> & { skipped?: string[] } }) {
    const n = data?.nutrition
    if (!n || typeof n !== 'object') return
    if (n.prices) { prices.value = n.prices; write(PRICES_KEY, prices.value) }
    if (n.checked) { checked.value = n.checked; write(CHECKED_KEY, checked.value) }
    if (n.batchDone) { batchDone.value = n.batchDone; write(BATCH_KEY, batchDone.value) }
    if (n.eaten) { eaten.value = n.eaten; write(EATEN_KEY, eaten.value) }
    if (Array.isArray(n.baskets)) { baskets.value = n.baskets; write(BASKETS_KEY, baskets.value) }
    if (n.prepMode === 'assembled' || n.prepMode === 'separate') setPrepMode(n.prepMode)
    if (isWeek(n.week)) { week.value = n.week; write(WEEK_KEY, week.value) }
    if (n.overrides) { overrides.value = n.overrides; write(OVER_KEY, overrides.value) }
    if (n.extras) { extras.value = n.extras; write(EXTRA_KEY, extras.value) }
    if (Array.isArray(n.userFoods)) { userFoods.value = n.userFoods; write(FOODS_KEY, userFoods.value) }
    if (n.foodPatches) { foodPatches.value = n.foodPatches; write(FOODPATCH_KEY, foodPatches.value) }
    if (Array.isArray(n.userRecipes)) { userRecipes.value = n.userRecipes; write(RECIPES_KEY, userRecipes.value) }
    if (n.recipePatches) { recipePatches.value = n.recipePatches; write(RECIPEPATCH_KEY, recipePatches.value) }
    if (Array.isArray(n.disabledRecipes)) { disabledRecipes.value = n.disabledRecipes; write(OFF_KEY, disabledRecipes.value) }
    // Sauvegardes de la version précédente : les séances annulées étaient une liste à part.
    if (Array.isArray(n.skipped)) {
      for (const iso of n.skipped) setOverride(iso, { gym: false })
    }
  }
  return {
    prices, checked, batchDone, eaten, baskets, pricedCount, prepMode,
    week, overrides, extras, userFoods, userRecipes, disabledRecipes, library,
    hydrate, indexFor,
    setWeekDay, resetWeek, dayFor, setOverride, clearOverride, hasOverride, ttConfirmed, stepsFor, setSteps,
    isEaten, toggleEaten, eatenSlots, eatenCount, extrasFor, addExtra, removeExtra,
    addFood, patchFood, removeFood, resetFood, isCustomFood,
    addRecipe, patchRecipe, removeRecipe, resetRecipe, isCustomRecipe,
    toggleRecipeActive, isRecipeActive,
    setPrice, isChecked, toggleChecked, clearChecked, setPrepMode,
    isBatchDone, toggleBatch, resetBatch,
    shoppingWindow, cost, addBasket, removeBasket,
    exportData, restore,
  }
}
