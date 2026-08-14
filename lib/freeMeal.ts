// Import relatif : testé dans le projet « unit », qui tourne en Node pur sans la
// résolution de chemins de Nuxt.
import type { DayMeal, DayPlan, Macros } from './nutritionStats'

// ─────────────────────────────────────────────────────────────────────────────
// Le repas du dehors : remplacer un plat prévu par ce qu'on a vraiment mangé.
// ─────────────────────────────────────────────────────────────────────────────
//
// L'application savait faire deux choses, et il en manquait une troisième au milieu.
//
//   • `picked` REMPLACE le plat d'un créneau — mais seulement par un plat de la
//     bibliothèque, parce qu'il ne stocke qu'un identifiant ;
//   • `extras` AJOUTE quelque chose qui porte ses propres calories — mais toujours
//     en plus du plan, jamais à la place.
//
// Or le cas réel est « à midi je ne mange pas ma boîte, je mange un kebab ». Le faire
// passer par un extra oblige à ne pas cocher le déjeuner puis à ajouter le kebab à
// côté : le compte des calories tombe juste, mais l'écran continue d'annoncer une
// boîte de bœuf qu'on n'a pas mangée, et le total « prévu » aussi.
//
// D'où cette troisième forme : un repas qui occupe le créneau ET porte ses macros.
//
// Pourquoi il ne passe PAS par la bibliothèque de plats. Un `Recipe` ne peut pas
// porter de calories — les siennes sont toujours recalculées depuis ses ingrédients
// et leurs grammes. Un kebab de restaurant n'a ni ingrédients pesés ni grammages
// connus ; l'y forcer demanderait d'inventer un aliment fantôme, qui remonterait
// ensuite dans les courses, dans le stock du frigo et dans les sessions de cuisine.
// Un plat qu'on n'a jamais acheté ni cuisiné n'a rien à y faire.
//
// Ce module ne contient que la partie calculable, donc testable : fabriquer un repas
// valide à partir d'une saisie, et l'insérer dans la journée.

/** Un repas saisi à la main, qui occupe un créneau et porte ses propres macros. */
export interface FreeMeal {
  label: string
  kcal: number
  p: number
  g: number
  l: number
  /** Repère de saisie, pour distinguer « tapé » de « proposé par Claude ». */
  from?: 'saisie' | 'catalogue' | 'claude'
}

const num = (v: unknown, max: number): number | null => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : v
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > max) return null
  return Math.round(n * 10) / 10
}

/**
 * Met une saisie en forme, ou rend `null` si elle ne veut rien dire.
 *
 * Les bornes ne sont pas décoratives. Un zéro passé en calories produirait un repas
 * qui occupe le créneau sans rien y mettre — l'écran afficherait « kebab » et le
 * compteur ne bougerait pas, ce qui est la pire des deux erreurs possibles. Et un
 * chiffre à quatre zéros vient d'une faute de frappe, jamais d'un déjeuner.
 *
 * Les macros absentes valent zéro plutôt que de faire échouer la saisie : mieux vaut
 * un repas compté en calories seules qu'un repas non enregistré. La cohérence entre
 * macros et calories n'est PAS vérifiée — 4/4/9 est une approximation, les étiquettes
 * s'en écartent légitimement, et refuser une étiquette parce qu'elle ne tombe pas
 * juste serait refuser la réalité au nom du modèle.
 */
export function freeMealFrom(raw: Partial<Record<keyof FreeMeal, unknown>>): FreeMeal | null {
  const label = typeof raw.label === 'string' ? raw.label.trim().slice(0, 60) : ''
  if (!label) return null
  const kcal = num(raw.kcal, 5000)
  if (kcal === null || kcal < 1) return null
  const from = raw.from === 'catalogue' || raw.from === 'claude' ? raw.from : 'saisie'
  return {
    label,
    kcal: Math.round(kcal),
    p: num(raw.p, 400) ?? 0,
    g: num(raw.g, 800) ?? 0,
    l: num(raw.l, 400) ?? 0,
    from,
  }
}

const macrosOfFree = (m: FreeMeal): Macros => ({ kcal: m.kcal, p: m.p, g: m.g, l: m.l })

/**
 * Insère les repas du dehors dans une journée déjà construite.
 *
 * Deux cas, et le second compte autant que le premier :
 *
 *   • le créneau existe dans le plan → on le REMPLACE. Le repas garde sa place et son
 *     heure, parce que c'est bien à midi qu'on a mangé, quoi qu'on ait mangé ;
 *   • le créneau n'existe pas — jour sans menu, journée marquée absente, semaine
 *     vierge → on l'AJOUTE quand même. Sans ça, saisir son restaurant du samedi ne
 *     produirait rien du tout, et c'est précisément le jour où l'on en a besoin.
 *
 * Le total est recalculé, jamais rapiécé : additionner la différence laisserait les
 * arrondis diverger repas après repas.
 */
export function withFreeMeals(
  day: DayPlan,
  free: Record<string, FreeMeal>,
  slotInfo: (slot: string) => { time: string, label: string } | null,
): DayPlan {
  const ids = Object.keys(free)
  if (!ids.length) return day

  const meals: DayMeal[] = day.meals.map((m) => {
    const f = free[m.slot]
    return f ? { ...m, recipeId: '', name: f.label, steps: '', items: [], macros: macrosOfFree(f), free: true } : m
  })
  for (const slot of ids) {
    if (meals.some(m => m.slot === slot)) continue
    const info = slotInfo(slot)
    if (!info) continue
    meals.push({
      slot,
      time: info.time,
      label: info.label,
      recipeId: '',
      name: free[slot].label,
      steps: '',
      items: [],
      macros: macrosOfFree(free[slot]),
      free: true,
    })
  }
  // On retrie par heure : un créneau ajouté après coup arriverait sinon en fin de
  // journée, un dîner affiché après la collation du soir.
  meals.sort((a, b) => a.time.localeCompare(b.time, 'fr', { numeric: true }))

  const total = meals.reduce<Macros>((acc, m) => ({
    kcal: acc.kcal + m.macros.kcal,
    p: acc.p + m.macros.p,
    g: acc.g + m.macros.g,
    l: acc.l + m.macros.l,
  }), { kcal: 0, p: 0, g: 0, l: 0 })

  // Une journée marquée absente qui reçoit un repas ne l'est plus : on a mangé.
  return { ...day, meals, total, off: day.off && !ids.length }
}
