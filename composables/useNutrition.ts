import { computed, ref } from 'vue'
import type { Food, Recipe } from '~/data/nutritionProgram'
import type { DayOverride, DayPlan, Extra, Library, MenuWeek, PrepMode, PriceMap, ShoppingList, WeekTemplate } from '~/lib/nutritionStats'
import {
  DEFAULT_WEEK, basketTotal, blankWeekDays, buildDay, builtinWeeks, cookPlan, cookSelection,
  dowIndex, emptyDay, mergeFoods, mergeRecipes, mondayOf, normalizeWeek, resolveDay, selectionTotals,
  shoppingFromWeek, slugify, stockOf, weekDaysOn,
} from '~/lib/nutritionStats'
import { isoOf } from '~/utils/sportStats'

// État du module nutrition, persisté en localStorage — même pattern que useWorkout :
// des refs au niveau module (donc partagées entre tous les appelants) et une
// hydratation unique gardée par un flag.
const PRICES_KEY = 'gr-nutri-prices-v1' // prix saisis, en € / kg
const CHECKED_KEY = 'gr-nutri-shopping-v1' // aliments déjà dans le caddie
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
const MENUS_KEY = 'gr-nutri-menus-v1' // semaines types : les menus de sept jours
const ACTIVE_KEY = 'gr-nutri-menu-active-v1' // semaine type en cours
const ASSIGN_KEY = 'gr-nutri-menu-map-v1' // semaine appliquée, par lundi
const PICKED_KEY = 'gr-nutri-picked-v1' // plat réellement pris, quand il diffère
// Clé de l'ancienne sélection « plat → portions », remplacée par la semaine type.
// Les portions ne se saisissent plus à la main : elles se comptent dans la semaine.
const LEGACY_SEL_KEY = 'gr-nutri-selection-v1'
const LEGACY_START_KEY = 'gr-nutri-start-v1'
export interface Basket { date: string, total: number, days: number }
const prices = ref<PriceMap>({})
const checked = ref<Record<string, boolean>>({})
const eaten = ref<Record<string, string[]>>({})
const baskets = ref<Basket[]>([])
const prepMode = ref<PrepMode>('separate')
const week = ref<WeekTemplate>({ gym: [...DEFAULT_WEEK.gym], tt: [...DEFAULT_WEEK.tt] })
const overrides = ref<Record<string, DayOverride>>({})
/**
 * Les semaines types de menus, celle en cours, et la trace de celle appliquée à
 * chaque lundi.
 *
 * `assign` existe pour que changer de semaine ne réécrive pas le passé : sans elle,
 * relire un mardi d'il y a trois semaines afficherait les plats d'aujourd'hui. Elle
 * ne stocke qu'un identifiant par lundi — quelques octets pour un historique qui
 * reste vrai.
 */
const menus = ref<MenuWeek[]>([])
const activeMenu = ref<string | null>(null)
const menuAssign = ref<Record<string, string>>({})
// Plat réellement pris quand il diffère de celui proposé — « j'ai pris autre chose ».
const picked = ref<Record<string, Record<string, string>>>({})
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
    eaten.value = safeParse(localStorage.getItem(EATEN_KEY), {})
    baskets.value = safeParse(localStorage.getItem(BASKETS_KEY), [])
    overrides.value = safeParse(localStorage.getItem(OVER_KEY), {})
    loadMenus()
    picked.value = safeParse(localStorage.getItem(PICKED_KEY), {})
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

  /**
   * Charge les semaines types, en garantissant que les deux semaines livrées sont
   * toujours présentes. Elles sont recalculées depuis le plan, jamais lues du
   * stockage : c'est ce qui permet de les corriger dans le code sans laisser une
   * version périmée coincée dans un navigateur.
   */
  function loadMenus() {
    const saved = safeParse<unknown[]>(localStorage.getItem(MENUS_KEY), [])
    const mine = (Array.isArray(saved) ? saved : [])
      .map(normalizeWeek)
      .filter((w): w is MenuWeek => !!w && !w.builtin)
    menus.value = [...builtinWeeks(), ...mine]
    const act = localStorage.getItem(ACTIVE_KEY)
    activeMenu.value = act && menus.value.some(m => m.id === act) ? act : menus.value[0]?.id ?? null
    menuAssign.value = safeParse(localStorage.getItem(ASSIGN_KEY), {})
    // Ménage : la sélection manuelle et la date de démarrage n'ont plus de sens.
    // Les laisser traîner ferait réapparaître de vieilles portions à la première
    // restauration de sauvegarde.
    try {
      localStorage.removeItem(LEGACY_SEL_KEY)
      localStorage.removeItem(LEGACY_START_KEY)
    }
    catch { /* stockage indisponible */ }
  }
  /** N'écrit QUE les semaines perso : les livrées viennent du code. */
  const saveMenus = () => write(MENUS_KEY, menus.value.filter(m => !m.builtin))
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

  // ─── Semaines types de menus ──────────────────────────────────────────────
  const menuById = (id: string | null) => (id ? menus.value.find(m => m.id === id) ?? null : null)
  /** La semaine en cours d'édition et de préparation. */
  const activeWeek = computed<MenuWeek | null>(() => menuById(activeMenu.value) ?? menus.value[0] ?? null)

  function setActiveMenu(id: string) {
    if (!menus.value.some(m => m.id === id)) return
    activeMenu.value = id
    writeRaw(ACTIVE_KEY, id)
  }
  /**
   * Applique une semaine à partir d'un lundi donné. C'est ce geste-là qui « démarre »
   * un plan : il n'y a plus de date de démarrage à régler à part, puisque choisir sa
   * semaine et la lancer sont la même décision.
   */
  function applyMenuFrom(iso: string, id = activeMenu.value) {
    if (!id || !menus.value.some(m => m.id === id)) return
    menuAssign.value = { ...menuAssign.value, [mondayOf(iso)]: id }
    write(ASSIGN_KEY, menuAssign.value)
    setActiveMenu(id)
  }
  /** Semaine appliquée à une date : la dernière assignée avant elle, sinon celle en cours. */
  function menuFor(iso: string): MenuWeek | null {
    const monday = mondayOf(iso)
    const past = Object.keys(menuAssign.value).filter(m => m <= monday).sort()
    const id = past.length ? menuAssign.value[past.at(-1)!] : null
    return menuById(id) ?? activeWeek.value
  }
  const appliedFrom = computed(() => Object.keys(menuAssign.value).sort().at(-1) ?? null)

  function patchMenu(id: string, fn: (w: MenuWeek) => MenuWeek) {
    menus.value = menus.value.map(m => (m.id === id ? fn(m) : m))
    saveMenus()
  }
  /**
   * Change la recette d'un créneau. Une semaine LIVRÉE est d'abord recopiée : les
   * deux semaines du plan doivent rester ce qu'elles sont, sinon on ne peut plus
   * revenir au point de départ après avoir bricolé.
   */
  function setMenuSlot(dow: number, slotId: string, recipeId: string) {
    const id = forkIfBuiltin()
    if (!id) return
    patchMenu(id, (w) => {
      const days = w.days.map((d, i) => (i === dow ? { ...d, slots: { ...d.slots, [slotId]: recipeId } } : d))
      return { ...w, days }
    })
  }
  /** « Je ne suis pas là ce jour-là » : plus de repas prévus, ni de courses, ni de cuisine. */
  function toggleMenuDayOff(dow: number) {
    const id = forkIfBuiltin()
    if (!id) return
    patchMenu(id, w => ({ ...w, days: w.days.map((d, i) => (i === dow ? { ...d, off: !d.off } : d)) }))
  }
  /** Duplique la semaine active sous un nouveau nom et bascule dessus. */
  function duplicateMenu(name?: string): string | null {
    const src = activeWeek.value
    if (!src) return null
    const id = nextId('week')
    const copy: MenuWeek = {
      id,
      name: name || `${src.name.replace(/ \(copie.*\)$/, '')} (copie)`,
      days: src.days.map(d => ({ off: d.off, slots: { ...d.slots } })),
    }
    menus.value = [...menus.value, copy]
    saveMenus()
    setActiveMenu(id)
    return id
  }
  /** Une semaine livrée n'est pas modifiable : la première retouche en fait une copie. */
  function forkIfBuiltin(): string | null {
    return activeWeek.value?.builtin ? duplicateMenu(`${activeWeek.value.name} modifiée`) : activeWeek.value?.id ?? null
  }
  function renameMenu(id: string, name: string) {
    if (name.trim()) patchMenu(id, w => ({ ...w, name: name.trim() }))
  }
  function removeMenu(id: string) {
    const target = menuById(id)
    if (!target || target.builtin) return
    menus.value = menus.value.filter(m => m.id !== id)
    saveMenus()
    if (activeMenu.value === id) setActiveMenu(menus.value[0]!.id)
  }
  /** Semaine vierge : sept jours sans rien, à remplir de zéro. */
  function blankMenu(name = 'Ma semaine'): string {
    const id = nextId('week')
    menus.value = [...menus.value, { id, name, days: blankWeekDays() }]
    saveMenus()
    setActiveMenu(id)
    return id
  }

  // ─── Ce qui découle de la semaine ─────────────────────────────────────────
  // Une donnée, un endroit : portions, courses et cuisine ne sont plus saisies ni
  // stockées séparément, elles se COMPTENT dans la semaine choisie. Une portion
  // saisie à la main à côté du menu finissait toujours par le contredire.
  const gymDays = computed(() => week.value.gym)
  const selection = computed(() => (activeWeek.value ? cookSelection(activeWeek.value, gymDays.value, library.value) : {}))
  const selectionSummary = computed(() => selectionTotals(selection.value, library.value))
  const daysCovered = computed(() => (activeWeek.value ? weekDaysOn(activeWeek.value) : 0))
  const selectionShopping = computed(() =>
    (activeWeek.value ? shoppingFromWeek(activeWeek.value, gymDays.value, library.value) : []))
  /** Les sessions de cuisine : dimanche, mercredi si besoin, et le soir même. */
  const cookSessions = computed(() =>
    (activeWeek.value ? cookPlan(activeWeek.value, gymDays.value, library.value) : []))

  /** Portions déjà consommées, par plat : sert à savoir ce qu'il reste au frigo. */
  const consumed = computed(() => {
    const out: Record<string, number> = {}
    for (const bySlot of Object.values(picked.value)) {
      for (const id of Object.values(bySlot)) out[id] = (out[id] ?? 0) + 1
    }
    return out
  })
  const stock = computed(() => stockOf(selection.value, consumed.value))

  // ─── Plat réellement pris ─────────────────────────────────────────────────
  const pickedFor = (iso: string, slot: string) => picked.value[iso]?.[slot] ?? null
  function setPicked(iso: string, slot: string, recipeId: string | null) {
    const day = { ...(picked.value[iso] ?? {}) }
    if (recipeId) day[slot] = recipeId
    else delete day[slot]
    const next = { ...picked.value }
    if (Object.keys(day).length) next[iso] = day
    else delete next[iso]
    picked.value = next
    write(PICKED_KEY, picked.value)
  }
  /** Pas du jour. `null` = non saisis, on retombe sur l'estimation télétravail / sur site. */
  const stepsFor = (iso: string) => overrides.value[iso]?.steps ?? null
  const setSteps = (iso: string, steps: number | null) =>
    setOverride(iso, { steps: steps === null || !Number.isFinite(steps as number) ? undefined : Math.max(0, Math.round(steps as number)) })
  // ─── Le menu d'une journée ────────────────────────────────────────────────
  /**
   * Le plan d'une journée, où qu'on soit dans le temps.
   *
   * La semaine type se répète : un jeudi ressemble au jeudi de la semaine choisie,
   * indéfiniment. C'est tout l'intérêt d'un modèle de sept jours — il n'y a plus de
   * date de démarrage à surveiller ni de fenêtre de quatorze jours au-delà de
   * laquelle l'appli ne propose plus rien.
   *
   * Trois couches, de la plus générale à la plus précise :
   *   1. la semaine appliquée à ce lundi-là (l'historique reste vrai) ;
   *   2. l'exception de planning posée sur cette date ;
   *   3. le plat réellement pris — « j'ai mangé autre chose » —, qui l'emporte
   *      toujours, parce que ce qui a été mangé prime sur ce qui était proposé.
   *
   * Un jour marqué absent ne propose rien — mais renvoie quand même une journée,
   * vide et signalée comme telle : la date existe toujours, et un `null` obligerait
   * chaque écran à se protéger d'un cas rare.
   */
  function dayPlanFor(iso: string, trained: boolean): DayPlan {
    const dow = dowIndex(iso)
    const mw = menuFor(iso)
    const day = mw?.days[dow]
    const over = dayFor(iso).menu
    const pick = picked.value[iso] ?? {}
    if (day?.off && !Object.keys(pick).length) return emptyDay(dow, trained)

    const slots = { ...day?.slots, ...pick }
    // Semaine vierge : on ne propose PAS le menu du cycle en douce. Un repas affiché
    // mais jamais acheté ni cuisiné est pire que pas de repas du tout — on le coche
    // sans y penser et le compteur du jour devient faux.
    if (day) {
      slots.lunch ??= ''
      slots.dinner ??= ''
    }
    // Une exception de planning ne porte que sur les deux repas principaux.
    if (over.lunch && !pick.lunch) slots.lunch = over.lunch
    if (over.dinner && !pick.dinner) slots.dinner = over.dinner
    return buildDay(dow, trained, library.value, { slots })
  }
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
  function setPrepMode(mode: PrepMode) {
    prepMode.value = mode
    writeRaw(PREP_KEY, mode)
  }
  // La liste de courses ne se déduit plus d'une fenêtre de jours du cycle : elle
  // sort de la SÉLECTION (voir `selectionShopping`). Il fallait sinon accepter le
  // menu livré tel quel pour obtenir une liste juste.
  const cost = (list: ShoppingList) => basketTotal(list, prices.value)
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
      eaten: eaten.value, baskets: baskets.value,
      // Les portions ne sont plus sauvegardées : elles se recomptent dans les
      // semaines. Sauvegarder les deux, c'était exporter deux fois le même chiffre
      // et laisser une restauration partielle les faire diverger.
      menus: menus.value.filter(m => !m.builtin), activeMenu: activeMenu.value, menuAssign: menuAssign.value,
      picked: picked.value,
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
    if (Array.isArray(n.menus)) {
      const mine = n.menus.map(normalizeWeek).filter((w): w is MenuWeek => !!w && !w.builtin)
      menus.value = [...builtinWeeks(), ...mine]
      saveMenus()
    }
    if (typeof n.activeMenu === 'string' && menus.value.some(m => m.id === n.activeMenu)) setActiveMenu(n.activeMenu)
    if (n.menuAssign) { menuAssign.value = n.menuAssign; write(ASSIGN_KEY, menuAssign.value) }
    if (n.picked) { picked.value = n.picked; write(PICKED_KEY, picked.value) }
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
    prices, checked, eaten, baskets, pricedCount, prepMode, picked,
    week, overrides, extras, userFoods, userRecipes, disabledRecipes, library,
    hydrate, dayPlanFor,
    setWeekDay, resetWeek, dayFor, setOverride, clearOverride, hasOverride, ttConfirmed, stepsFor, setSteps,
    menus, activeMenu, activeWeek, menuFor, appliedFrom, gymDays,
    setActiveMenu, applyMenuFrom, setMenuSlot, toggleMenuDayOff,
    duplicateMenu, renameMenu, removeMenu, blankMenu,
    selection, selectionSummary, selectionShopping, cookSessions, daysCovered, stock, pickedFor, setPicked,
    isEaten, toggleEaten, eatenSlots, eatenCount, extrasFor, addExtra, removeExtra,
    addFood, patchFood, removeFood, resetFood, isCustomFood,
    addRecipe, patchRecipe, removeRecipe, resetRecipe, isCustomRecipe,
    toggleRecipeActive, isRecipeActive,
    setPrice, isChecked, toggleChecked, clearChecked, setPrepMode,
    cost, addBasket, removeBasket,
    exportData, restore,
  }
}
