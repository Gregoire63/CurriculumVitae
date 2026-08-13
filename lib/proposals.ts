// ─────────────────────────────────────────────────────────────────────────────
// Ce qu'une proposition venue du connecteur a le droit de changer.
// ─────────────────────────────────────────────────────────────────────────────
//
// Le connecteur ne modifie rien : il dépose une phrase et un détail. Reste à
// décider ce que l'application accepte d'appliquer TOUTE SEULE, d'un tap.
//
// Le choix retenu est étroit, et c'est volontaire. Deux gestes sont applicables
// automatiquement — changer le plat d'un créneau, changer la séance prévue un jour
// donné — parce qu'ils ont une forme fermée, vérifiable, et un effet réversible en
// un geste. Tout le reste s'affiche mais ne s'applique pas : mieux vaut lire « à
// faire à la main » que voir une série réécrite par une interprétation approximative
// d'une phrase.
//
// La validation est ici, pure et testable, plutôt que dans le composable : c'est la
// frontière entre du texte venu de l'extérieur et les données de l'utilisateur.

export interface RawProposal {
  id: string
  at: string
  action: string
  summary: string
  patch: Record<string, unknown>
  status: 'pending' | 'applied' | 'refused'
  resolvedAt?: string
}

export type Plan =
  | { kind: 'plat', date: string, slot: string, recipeId: string | null }
  | { kind: 'seance', date: string, sessionId: string | null }
  | { kind: 'semaine', lundi: string, nom: string, jours: MenuDaySpec[] }
  | { kind: 'recette', id: string | null, recette: RecipeSpec }
  | { kind: 'semaine-type', seances?: (string | null)[], salle?: boolean[], teletravail?: boolean[] }
  | { kind: 'correction-serie', exercice: string, date: string, index: number, vers: { w: number, r: number } }
  | { kind: 'correction-pesee', date: string, vers: number | null }

export interface RecipeSpec {
  name: string
  kind: 'pdj' | 'boite' | 'diner' | 'collation' | 'sauce'
  batch: boolean
  steps: string
  items: { food: string, g: number }[]
}

/**
 * Ce que le validateur doit savoir du monde réel pour trancher.
 *
 * Passer un contexte plutôt qu'une suite de prédicats n'est pas de la cosmétique :
 * les corrections ont besoin de LIRE la valeur en place pour vérifier qu'elle est
 * bien celle qu'on croit remplacer. Sans cette lecture, « corriger » redeviendrait
 * « écrire par-dessus ».
 */
export interface PlanCtx {
  recipeKnown?: (id: string) => boolean
  foodKnown?: (id: string) => boolean
  setAt?: (exId: string, date: string, index: number) => { w: number, r: number } | null
  weightAt?: (date: string) => number | null
}

/** Un jour de menu proposé. Les créneaux absents gardent ce que la semaine prévoyait. */
export interface MenuDaySpec { off: boolean, slots: Record<string, string> }

/** Créneaux connus : une proposition qui vise autre chose ne s'applique pas. */
export const SLOTS = ['pdj', 'creatine', 'pre', 'lunch', 'snack', 'dinner', 'night'] as const

const isIsoDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)

/**
 * Le premier alias PRÉSENT, et non le premier non-nul.
 *
 * `??` aurait été le réflexe, et il aurait été faux : ici `null` est une valeur
 * qui veut dire quelque chose — « reviens au plat prévu », « ce jour-là, repos ».
 * L'enchaîner avec `??` la traite comme une absence et fait tomber la proposition
 * en « non applicable » alors qu'elle est parfaitement claire.
 */
function pick(d: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) if (k in d) return d[k]
  return undefined
}
const isId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{1,64}$/.test(v)

/** Lundi, et lundi seulement : une semaine s'applique à partir d'un début de semaine. */
export function isMonday(iso: string): boolean {
  return isIsoDate(iso) && (new Date(`${iso}T00:00:00`).getDay() + 6) % 7 === 0
}

/**
 * Une semaine de menus proposée, ou `null`.
 *
 * C'est la proposition la plus lourde — quatorze repas d'un coup — donc celle qui
 * mérite la validation la plus stricte. Trois choses sont vérifiées, et chacune
 * ferme une façon de se tromper :
 *
 *  • sept jours, ni six ni huit, lundi en premier — sinon les jours glissent et
 *    l'on découvre le décalage en cuisinant ;
 *  • des créneaux connus, parce qu'un « brunch » inventé s'écrirait dans le menu
 *    sans jamais s'afficher nulle part ;
 *  • des identifiants de plats qui EXISTENT vraiment. C'est le vrai risque d'une
 *    semaine écrite de mémoire : un plat plausible mais inconnu, qui donne un
 *    créneau vide le jour venu. `connu` vient de la bibliothèque réelle.
 */
export function weekFor(p: RawProposal, connu: (id: string) => boolean): Extract<Plan, { kind: 'semaine' }> | null {
  if (p.action !== 'semaine') return null
  const d = p.patch ?? {}
  const lundi = pick(d, ['lundi', 'monday', 'date'])
  const jours = pick(d, ['jours', 'days'])
  if (typeof lundi !== 'string' || !isMonday(lundi)) return null
  if (!Array.isArray(jours) || jours.length !== 7) return null

  const out: MenuDaySpec[] = []
  for (const j of jours) {
    if (!j || typeof j !== 'object') return null
    const raw = j as Record<string, unknown>
    const slots: Record<string, string> = {}
    for (const [k, v] of Object.entries(raw)) {
      if (k === 'off') continue
      if (!(SLOTS as readonly string[]).includes(k)) return null
      if (typeof v !== 'string' || !isId(v) || !connu(v)) return null
      slots[k] = v
    }
    const off = raw.off === true
    // Un jour ni absent ni rempli ne veut rien dire : c'est une ligne oubliée.
    if (!off && !Object.keys(slots).length) return null
    out.push({ off, slots })
  }
  const nom = typeof d.nom === 'string' && d.nom.trim() ? d.nom.trim().slice(0, 60) : `Semaine du ${lundi}`
  return { kind: 'semaine', lundi, nom, jours: out }
}

/**
 * Le geste applicable derrière une proposition, ou `null`.
 *
 * `null` n'est pas un échec : c'est la réponse honnête pour tout ce qui n'entre pas
 * dans les deux formes fermées. L'application l'affiche alors comme une suggestion
 * à faire soi-même.
 */
export function planFor(p: RawProposal, ctx: PlanCtx = {}): Plan | null {
  const d = p.patch ?? {}
  if (p.action === 'semaine') return weekFor(p, ctx.recipeKnown ?? (() => true))
  if (p.action === 'recette') return recipeFor(p, ctx)
  if (p.action === 'semaine-type') return weekTemplateFor(p)
  if (p.action === 'correction') return fixFor(p, ctx)
  if (p.action === 'plat') {
    const date = pick(d, ['date', 'jour'])
    const slot = pick(d, ['slot', 'creneau'])
    const vers = pick(d, ['vers', 'recipeId', 'plat'])
    if (!isIsoDate(date) || typeof slot !== 'string') return null
    if (!(SLOTS as readonly string[]).includes(slot)) return null
    // `null` explicite = revenir au plat prévu, ce qui est un geste légitime.
    if (vers === null) return { kind: 'plat', date, slot, recipeId: null }
    if (!isId(vers)) return null
    return { kind: 'plat', date, slot, recipeId: vers }
  }
  if (p.action === 'planning-seance') {
    const date = pick(d, ['date', 'jour'])
    const vers = pick(d, ['vers', 'sessionId', 'seance'])
    if (!isIsoDate(date)) return null
    if (vers === null || vers === 'repos' || vers === '') return { kind: 'seance', date, sessionId: null }
    if (!isId(vers)) return null
    return { kind: 'seance', date, sessionId: vers }
  }
  return null
}

const num = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) && n >= min && n <= max ? n : null
}

const KINDS = ['pdj', 'boite', 'diner', 'collation', 'sauce'] as const

/**
 * Une recette proposée : ajout, ou modification d'une existante.
 *
 * Le point de vigilance est le même que pour une semaine, en plus serré : chaque
 * ingrédient doit être un ALIMENT connu. Une recette qui référence « saumon-fume »
 * quand la base dit « saumon-fumé » ne fait pas planter l'app — elle produit un
 * plat dont les macros sont fausses de moitié, ce qui est bien pire : c'est une
 * erreur silencieuse qui se propage dans les calories, les courses et le déficit.
 */
export function recipeFor(p: RawProposal, ctx: PlanCtx): Extract<Plan, { kind: 'recette' }> | null {
  if (p.action !== 'recette') return null
  const d = p.patch ?? {}
  const known = ctx.foodKnown ?? (() => false)
  const name = typeof d.nom === 'string' ? d.nom.trim() : (typeof d.name === 'string' ? d.name.trim() : '')
  const kind = String(pick(d, ['kind', 'type']) ?? '')
  const items = pick(d, ['items', 'ingredients'])
  if (!name || name.length > 80) return null
  if (!(KINDS as readonly string[]).includes(kind)) return null
  if (!Array.isArray(items) || !items.length || items.length > 30) return null

  const out: { food: string, g: number }[] = []
  for (const it of items) {
    if (!it || typeof it !== 'object') return null
    const raw = it as Record<string, unknown>
    const food = pick(raw, ['food', 'aliment', 'id'])
    const g = num(pick(raw, ['g', 'grammes', 'quantite']), 0.1, 2000)
    if (typeof food !== 'string' || !isId(food) || !known(food) || g === null) return null
    out.push({ food, g: Math.round(g * 10) / 10 })
  }

  const id = typeof d.id === 'string' && isId(d.id) ? d.id : null
  // Modifier une recette existante suppose qu'elle existe : sinon on croit patcher
  // et on crée un doublon silencieux sous un identifiant imposé.
  if (id && ctx.recipeKnown && !ctx.recipeKnown(id)) return null
  return {
    kind: 'recette',
    id,
    recette: {
      name,
      kind: kind as RecipeSpec['kind'],
      batch: d.batch !== false,
      steps: typeof d.steps === 'string' ? d.steps.slice(0, 2000) : '',
      items: out,
    },
  }
}

const SESSIONS = ['s1', 's2', 's3', 's4'] as const
const sevenBools = (v: unknown): boolean[] | null =>
  (Array.isArray(v) && v.length === 7 && v.every(x => typeof x === 'boolean') ? v as boolean[] : null)

/** La semaine TYPE : celle qui vaut pour toutes les semaines à venir, par opposition
 *  à une exception datée. On accepte les trois axes séparément — changer les jours
 *  de salle ne doit pas obliger à réécrire le télétravail. */
export function weekTemplateFor(p: RawProposal): Extract<Plan, { kind: 'semaine-type' }> | null {
  if (p.action !== 'semaine-type') return null
  const d = p.patch ?? {}
  const out: Extract<Plan, { kind: 'semaine-type' }> = { kind: 'semaine-type' }
  const seances = pick(d, ['seances', 'sessions'])
  if (seances !== undefined) {
    if (!Array.isArray(seances) || seances.length !== 7) return null
    const clean: (string | null)[] = []
    for (const v of seances) {
      if (v === null || v === 'repos' || v === '') { clean.push(null); continue }
      if (typeof v !== 'string' || !(SESSIONS as readonly string[]).includes(v)) return null
      clean.push(v)
    }
    out.seances = clean
  }
  const salle = pick(d, ['salle', 'gym'])
  if (salle !== undefined) {
    const b = sevenBools(salle)
    if (!b) return null
    out.salle = b
  }
  const tt = pick(d, ['teletravail', 'tt'])
  if (tt !== undefined) {
    const b = sevenBools(tt)
    if (!b) return null
    out.teletravail = b
  }
  if (!out.seances && !out.salle && !out.teletravail) return null
  return out
}

/**
 * Une correction de donnée — et la garde qui la rend acceptable.
 *
 * Corriger, c'est écrire par-dessus quelque chose qu'on ne pourra pas reconstituer.
 * La proposition doit donc porter la valeur qu'elle CROIT remplacer (`de`), et on
 * refuse si elle ne correspond pas à ce qui est réellement stocké. C'est ce qui
 * transforme « réécris cette charge » — que j'avais refusé de livrer — en « échange
 * cette valeur précise, que j'ai vérifiée ». Le miroir peut avoir des heures de
 * retard : sans ce contrôle, une correction juste au moment où elle a été écrite
 * pourrait en écraser une autre, faite entre-temps sur le téléphone.
 */
export function fixFor(p: RawProposal, ctx: PlanCtx): Plan | null {
  if (p.action !== 'correction') return null
  const d = p.patch ?? {}
  const quoi = String(pick(d, ['quoi', 'cible']) ?? '')

  if (quoi === 'serie') {
    const exercice = pick(d, ['exercice', 'exId'])
    const date = pick(d, ['date'])
    const index = num(pick(d, ['serie', 'index']), 0, 49)
    const de = pick(d, ['de', 'avant']) as Record<string, unknown> | undefined
    const vers = pick(d, ['vers', 'apres']) as Record<string, unknown> | undefined
    if (typeof exercice !== 'string' || !isId(exercice) || !isIsoDate(date) || index === null) return null
    if (!de || !vers) return null
    const w = num(pick(vers, ['w', 'poids', 'charge']), 0, 500)
    const r = num(pick(vers, ['r', 'reps']), 0, 100)
    const wOld = num(pick(de, ['w', 'poids', 'charge']), 0, 1000)
    const rOld = num(pick(de, ['r', 'reps']), 0, 200)
    if (w === null || r === null || wOld === null || rOld === null) return null
    const current = ctx.setAt?.(exercice, date, Math.trunc(index)) ?? null
    if (!current || current.w !== wOld || current.r !== rOld) return null
    return { kind: 'correction-serie', exercice, date, index: Math.trunc(index), vers: { w, r } }
  }

  if (quoi === 'pesee') {
    const date = pick(d, ['date'])
    const de = num(pick(d, ['de', 'avant']), 0, 500)
    const versRaw = pick(d, ['vers', 'apres'])
    if (!isIsoDate(date) || de === null) return null
    const current = ctx.weightAt?.(date) ?? null
    if (current === null || Math.abs(current - de) > 0.001) return null
    if (versRaw === null) return { kind: 'correction-pesee', date, vers: null }
    const vers = num(versRaw, 20, 400)
    if (vers === null) return null
    return { kind: 'correction-pesee', date, vers }
  }

  return null
}

/** Les lignes affichées sous la phrase : ce qui change, en clair. */
export function detailLines(p: RawProposal): { label: string, value: string }[] {
  const out: { label: string, value: string }[] = []
  for (const [k, v] of Object.entries(p.patch ?? {})) {
    if (v === null || v === undefined) { out.push({ label: k, value: '—' }); continue }
    out.push({ label: k, value: typeof v === 'object' ? JSON.stringify(v) : String(v) })
  }
  return out.slice(0, 8)
}
