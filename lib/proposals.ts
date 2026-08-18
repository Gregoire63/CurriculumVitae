// Import relatif et non par alias : ce module est testé dans le projet « unit »,
// qui tourne en Node pur sans la résolution de chemins de Nuxt.
import { getAt, isScalar } from './pointer'
import { freeMealFrom } from './freeMeal'
import type { FreeMeal } from './freeMeal'
import type { Scalar } from './pointer'

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
  | { kind: 'correction-champ', chemin: string, vers: Scalar }
  | { kind: 'repas-libre', date: string, slot: string, repas: FreeMeal | null }
  | { kind: 'aliment', id: string | null, aliment: FoodSpec }

/** Un ingrédient, tel qu'une proposition a le droit de le décrire. Valeurs pour 100 g. */
export interface FoodSpec {
  name: string
  cat: string
  kcal: number
  p: number
  g: number
  l: number
  /** Ce qu'on en fait à la cuisson — c'est ce qui transforme une liste de courses
   *  en marche à suivre. Absent = rien à cuire. */
  cook?: string
  /** Repère d'achat ou de pesée : « 1 c. à café = 5 g ». */
  buy?: string
  keeps?: number
}

export interface RecipeSpec {
  name: string
  kind: 'pdj' | 'boite' | 'diner' | 'collation' | 'sauce'
  batch: boolean
  steps: string
  items: { food: string, g: number }[]
  /** Pot servi avec le plat. Ses ingrédients comptent dans les macros et les courses. */
  sauce?: string
  /** Jours de conservation au frigo. C'est ce qui décide dans QUELLE session de
   *  cuisine le plat tombe : un plat qui tient trois jours ne se cuisine pas le
   *  dimanche pour le vendredi. */
  keeps?: number
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
  /** L'instantané complet de la sauvegarde, pour vérifier un champ quelconque. */
  snapshot?: () => Record<string, unknown>
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
  if (p.action === 'aliment') return foodFor(p, ctx)
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
  /**
   * Le repas du dehors proposé depuis une conversation.
   *
   * C'est la seule forme où Claude apporte des CHIFFRES qu'il a estimés lui-même,
   * et non un identifiant piochéans un catalogue. Deux garde-fous en découlent :
   * la mise en forme passe par `freeMealFrom`, la même que la saisie à la main —
   * mêmes bornes, mêmes refus — et la provenance est marquée `claude`, pour qu'on
   * puisse relire dans six mois d'où sortait un chiffre.
   *
   * `repas: null` retire le repas et rend son créneau au plat prévu.
   */
  if (p.action === 'repas-libre') {
    const date = pick(d, ['date', 'jour'])
    const slot = pick(d, ['slot', 'creneau'])
    if (!isIsoDate(date) || typeof slot !== 'string') return null
    if (!(SLOTS as readonly string[]).includes(slot)) return null
    const vers = pick(d, ['vers', 'repas'])
    if (vers === null) return { kind: 'repas-libre', date, slot, repas: null }
    const source = (vers && typeof vers === 'object' ? vers : d) as Record<string, unknown>
    const base = pick(source, ['base', 'derive', 'plat_origine'])
    /**
     * `base` doit désigner un plat qui EXISTE.
     *
     * Il ne sert qu'à l'affichage — « variante de : Poulet, lentilles » — mais un
     * identifiant fantôme produirait une ligne qui promet une recette et un lien qui
     * n'ouvre rien. Mieux vaut ne rien annoncer que d'annoncer dans le vide.
     */
    if (base !== undefined && base !== null) {
      if (typeof base !== 'string' || !isId(base)) return null
      if (ctx.recipeKnown && !ctx.recipeKnown(base)) return null
    }
    const repas = freeMealFrom({
      label: pick(source, ['label', 'nom', 'plat']),
      kcal: pick(source, ['kcal', 'calories']),
      p: pick(source, ['p', 'proteines', 'prot']),
      g: pick(source, ['g', 'glucides']),
      l: pick(source, ['l', 'lipides']),
      base: base ?? undefined,
      items: pick(source, ['items', 'ingredients', 'composition']),
      steps: pick(source, ['steps', 'preparation', 'recette']),
      from: 'claude',
    // `foodKnown` transmis : un ingrédient inventé fait échouer la proposition ici,
    // exactement comme pour une recette. C'est le même garde-fou, sur le même
    // catalogue, et il vaut mieux qu'il tombe au dépôt qu'au moment de valider.
    }, { foodKnown: ctx.foodKnown })
    return repas ? { kind: 'repas-libre', date, slot, repas } : null
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
/** Les catégories du catalogue. En inventer une ferait disparaître l'aliment de
 *  la liste de courses, qui est groupée par catégorie. */
/**
 * Les catégories RÉELLES, celles de `FoodCat`.
 *
 * Cette liste en contenait deux de plus — « poissons » et « boissons » — qui
 * n'existent nulle part ailleurs. Un aliment déposé avec l'une d'elles passait la
 * validation, puis se rangeait dans une catégorie que `CAT_LABELS` ne sait pas
 * nommer et que `CAT_ORDER` ne parcourt pas : il disparaissait de la liste de
 * courses. Accepté, enregistré, invisible — le pire des trois états.
 *
 * Les poissons vivent dans « viandes », dont l'intitulé affiché est d'ailleurs
 * « Viandes / poissons ».
 */
const CATS = ['viandes', 'oeufs', 'laitiers', 'feculents', 'legumes', 'fruits', 'grasses', 'aromates', 'complements'] as const

/**
 * Créer ou corriger un ingrédient.
 *
 * C'est la brique qui manquait sous les recettes : proposer un plat exige des
 * identifiants d'aliments qui EXISTENT, donc sans cette forme il était impossible
 * d'ajouter une recette contenant quoi que ce soit de nouveau.
 *
 * Le contrôle de cohérence est ici et pas seulement dans l'écran d'édition. Des
 * macros qui n'expliquent pas les calories, c'est une étiquette mal recopiée — et
 * l'erreur ne se voit jamais, elle se propage dans les calories, les courses et le
 * déficit. On tolère 25 % d'écart, parce que fibres, polyols et arrondis du
 * fabricant en produisent légitimement quelques-uns.
 */
export function foodFor(p: RawProposal, ctx: PlanCtx): Extract<Plan, { kind: 'aliment' }> | null {
  if (p.action !== 'aliment') return null
  const d = p.patch ?? {}
  const name = typeof (pick(d, ['nom', 'name'])) === 'string' ? String(pick(d, ['nom', 'name'])).trim() : ''
  if (!name || name.length > 60) return null

  const cat = String(pick(d, ['cat', 'categorie']) ?? '')
  if (!(CATS as readonly string[]).includes(cat)) return null

  const kcal = num(pick(d, ['kcal', 'calories']), 0, 950) // 900 = huile pure, la borne haute physique
  const prot = num(pick(d, ['p', 'proteines', 'prot']), 0, 100)
  const gluc = num(pick(d, ['g', 'glucides']), 0, 100)
  const lip = num(pick(d, ['l', 'lipides']), 0, 100)
  if (kcal === null || prot === null || gluc === null || lip === null) return null
  if (prot + gluc + lip > 100) return null // pour 100 g, la somme ne peut pas déborder

  const calcule = prot * 4 + gluc * 4 + lip * 9
  if (kcal > 0 && Math.abs(calcule - kcal) > kcal * 0.25 + 20) return null

  const id = typeof d.id === 'string' && isId(d.id) ? d.id : null
  if (id && ctx.foodKnown && !ctx.foodKnown(id)) return null

  const texte = (v: unknown, max: number) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined)
  const keeps = num(pick(d, ['keeps', 'conservation', 'conservation_jours']), 1, 365)

  return {
    kind: 'aliment',
    id,
    aliment: {
      name,
      cat,
      kcal: Math.round(kcal),
      p: Math.round(prot * 10) / 10,
      g: Math.round(gluc * 10) / 10,
      l: Math.round(lip * 10) / 10,
      ...(texte(pick(d, ['cook', 'cuisson']), 300) ? { cook: texte(pick(d, ['cook', 'cuisson']), 300) } : {}),
      ...(texte(pick(d, ['buy', 'achat', 'repere']), 120) ? { buy: texte(pick(d, ['buy', 'achat', 'repere']), 120) } : {}),
      ...(keeps !== null ? { keeps: Math.round(keeps) } : {}),
    },
  }
}

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

  /**
   * La sauce et la conservation, qui se perdaient silencieusement.
   *
   * `patchRecipe` fusionne le patch dans la recette, donc une clé absente était
   * conservée — mais l'écran d'édition, lui, envoie toujours les cinq champs, et
   * une modification proposée d'ici repartait sans `sauce` ni `keeps`. Le plat
   * gardait son nom et ses ingrédients, et perdait son pot de sauce blanche ainsi
   * que sa durée de conservation. Cette dernière décide dans QUELLE session de
   * cuisine il tombe : sans elle, un plat qui ne tient pas trois jours se retrouve
   * planifié le dimanche pour le vendredi.
   *
   * On ne les transmet donc que si elles sont explicitement fournies — absentes,
   * la fusion garde celles d'origine.
   */
  const sauce = pick(d, ['sauce', 'pot'])
  const keeps = num(pick(d, ['keeps', 'conservation', 'conservation_jours']), 1, 30)
  if (sauce !== undefined && sauce !== null) {
    if (typeof sauce !== 'string' || !isId(sauce)) return null
    if (ctx.recipeKnown && !ctx.recipeKnown(sauce)) return null
  }

  return {
    kind: 'recette',
    id,
    recette: {
      name,
      kind: kind as RecipeSpec['kind'],
      batch: d.batch !== false,
      steps: typeof d.steps === 'string' ? d.steps.slice(0, 2000) : '',
      items: out,
      ...(typeof sauce === 'string' ? { sauce } : {}),
      ...(keeps !== null ? { keeps: Math.round(keeps) } : {}),
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

  if (quoi === 'champ') {
    // Le passe-partout : n'importe quel champ SIMPLE de la sauvegarde, désigné par
    // un pointeur JSON. Il existe parce que figer une liste de champs modifiables
    // condamnait à revenir en ajouter un à chaque besoin — et à laisser en attente
    // celui qu'on n'avait pas prévu, comme la durée d'une séance.
    //
    // Ce qu'il ne dispense PAS de faire : le chemin doit exister, la valeur en
    // place doit être celle qu'on croit remplacer, et on n'écrit qu'un scalaire.
    // Un objet entier réécrit à partir d'une phrase reste hors de portée.
    const chemin = pick(d, ['chemin', 'path'])
    const de = pick(d, ['de', 'avant'])
    const vers = pick(d, ['vers', 'apres'])
    if (typeof chemin !== 'string' || !isScalar(vers) || !isScalar(de)) return null
    const snap = ctx.snapshot?.()
    if (!snap) return null
    const current = getAt(snap, chemin)
    if (current === undefined || !isScalar(current)) return null
    // Comparaison souple sur les nombres écrits en texte : « 50 » et 50 désignent
    // la même durée, et refuser pour ça n'aiderait personne.
    const same = current === de || (typeof current === 'number' && Number(de) === current)
    if (!same) return null
    return { kind: 'correction-champ', chemin, vers }
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

/**
 * La durée d'une séance est écrite à deux endroits ; un seul est lu.
 *
 * `recordSession` l'inscrit sur la séance ET sur chaque exercice de cette séance.
 * L'application n'affiche jamais la seconde — ni le rapport, ni la fiche du jour,
 * ni le calendrier ne la regardent. Elle reste pourtant dans la sauvegarde, donc
 * visible d'ici, et c'est un piège exact : corriger `/logs/dev-couche/3/durationMin`
 * réussit, l'application confirme, et l'écran continue d'afficher l'ancienne durée.
 *
 * On ne la masque pas et on ne la répare pas en douce — un outil qui écrit ailleurs
 * que là où on pointe ne serait plus vérifiable. On dit simplement, à la lecture,
 * laquelle des deux compte.
 */
export function twinPath(chemin: string, d: Record<string, unknown>): string | null {
  const m = /^\/logs\/(.+)\/(\d+)\/durationMin$/.exec(chemin)
  if (!m) return null
  const entry = getAt(d, `/logs/${m[1]}/${m[2]}`) as { date?: string } | undefined
  const jour = entry?.date
  if (!jour) return null
  const sessions = Array.isArray(d.sessions) ? d.sessions : []
  const i = sessions.findIndex(s => String((s as { at?: string }).at ?? '').slice(0, 10) === jour)
  return i < 0 ? null : `/sessions/${i}/durationMin`
}

/**
 * Une correction de champ vérifiée AVANT le dépôt, pas seulement à l'application.
 *
 * L'application refusera de toute façon un chemin qui n'existe pas ou un « de » qui
 * ne correspond pas — c'est la garantie de fond, et elle reste. Mais si le serveur
 * se tait ici, la proposition part quand même : Grégoire la découvre dans sa boîte,
 * lit « l'app ne sait pas appliquer ça », et c'est LUI qui paie une erreur que le
 * serveur pouvait voir tout de suite, miroir en main.
 *
 * Rendre l'erreur au connecteur la met au bon endroit : je la lis, je relis le champ,
 * je repropose. Rien n'atteint la boîte de réception tant que ce n'est pas cohérent.
 */
export function checkFieldFix(detail: Record<string, unknown>, data: Record<string, unknown>): void {
  const chemin = typeof detail.chemin === 'string' ? detail.chemin : ''
  if (!chemin) throw new Error('« chemin » est obligatoire pour une correction de champ (ex. « /sessions/12/durationMin »).')
  const actuel = getAt(data, chemin)
  if (actuel === undefined) throw new Error(`Aucune valeur à « ${chemin} ». Vérifie le chemin avec l'outil « champ ».`)
  const double = twinPath(chemin, data)
  if (double) throw new Error(`« ${chemin} » est une copie que l'application n'affiche pas : la corriger ne changerait rien à l'écran. Corrige ${double}.`)
  if (actuel !== null && typeof actuel === 'object') {
    throw new Error(`« ${chemin} » désigne ${Array.isArray(actuel) ? 'une liste' : 'un objet'} : on ne remplace que des valeurs simples. Descends d'un cran.`)
  }
  const vers = detail.vers
  if (vers !== null && ['object', 'undefined', 'function'].includes(typeof vers)) {
    throw new Error('« vers » doit être une valeur simple : nombre, texte, booléen ou null.')
  }
  // Tolérance nombre/texte : le connecteur relit souvent « 50 » là où la sauvegarde
  // porte 50. C'est la même valeur, et refuser là-dessus n'apprend rien à personne.
  const de = detail.de
  if (de === undefined) throw new Error(`« de » est obligatoire : la valeur actuellement enregistrée est ${JSON.stringify(actuel)}.`)
  if (de !== actuel && String(de) !== String(actuel)) {
    throw new Error(`« de » ne correspond pas : ${JSON.stringify(chemin)} vaut ${JSON.stringify(actuel)}, pas ${JSON.stringify(de)}. Relis-le avec « champ », puis repropose.`)
  }
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
