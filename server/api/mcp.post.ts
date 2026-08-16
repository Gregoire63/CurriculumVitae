import { addProposal, readMirror, readProposals, verifyToken } from '../utils/vault'
import { noteCall } from '../utils/trace'
import { DAY_NAMES, KIND_GROUP_LABELS, builtinWeeks, dowIndex, expandItems, keepsOf, macrosOf, mergeRecipes, mergeFoods, mondayOf, normalizeWeek, recipeForSlot, roundMacros } from '~/lib/nutritionStats'
import { cookedWeight } from '~/lib/cooked'
import { SLOTS_GYM, SLOTS_REST } from '~/data/nutritionProgram'
import { getAt } from '~/lib/pointer'
import { checkFieldFix, foodFor, recipeFor, twinPath } from '~/lib/proposals'
import { weightTrend } from '~/lib/bilan'
import { PROGRAM } from '~/data/sportProgram'
import { VARIANTS } from '~/data/exerciseVariants'

// ─────────────────────────────────────────────────────────────────────────────
// Le connecteur : ce que Claude peut voir, et ce qu'il ne peut pas faire.
// ─────────────────────────────────────────────────────────────────────────────
//
// Un serveur MCP, c'est-à-dire du JSON-RPC sur une URL, avec trois méthodes qui
// comptent : se présenter (`initialize`), annoncer ses outils (`tools/list`), les
// exécuter (`tools/call`).
//
// La règle qui structure tout le fichier : les outils de LECTURE lisent le miroir,
// les outils d'ÉCRITURE n'écrivent rien. Ils déposent une proposition dans une
// file, que l'application montre à l'ouverture et qu'on applique d'un geste. Le
// connecteur ne peut donc pas modifier des données, seulement demander qu'on les
// modifie — et une mauvaise interprétation de ma part coûte un refus, pas une
// séance perdue.
//
// Les réponses sont bornées en taille. Un historique complet renvoyé d'un bloc
// remplirait la fenêtre de contexte avec des séries de 2024 pour répondre à une
// question sur cette semaine.

const PROTOCOL_FALLBACK = '2025-06-18'
const SUPPORTED = ['2025-06-18', '2025-03-26', '2024-11-05']
/** Au-delà, on tronque et on le dit : une réponse muette qui déborde est pire
 *  qu'une réponse courte qui annonce ce qu'elle a coupé. */
const MAX_RESULT_BYTES = 40_000

interface Rpc { jsonrpc: string, id?: string | number | null, method?: string, params?: Record<string, unknown> }

export default defineEventHandler(async (event) => {
  // Le corps est lu en premier pour pouvoir COMPTER l'appel avant de le juger : ce
  // qu'on cherche à savoir, c'est si la requête est arrivée jusqu'ici, pas si elle
  // était en droit d'être servie. Un corps illisible compte aussi — il est arrivé.
  const rpc = await readBody<Rpc>(event).catch(() => null)
  noteCall(typeof rpc?.method === 'string' ? rpc.method : '(corps illisible)', new Date())

  const auth = getRequestHeader(event, 'authorization') ?? ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  const claims = verifyToken(token, Date.now())
  if (!claims || claims.scope !== 'suivi') {
    // L'en-tête pointe vers le document de découverte : un client MCP qui reçoit ce
    // 401 sait alors tout seul où aller s'authentifier, sans configuration.
    const base = getRequestURL(event).origin
    setHeader(event, 'WWW-Authenticate', `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"`)
    throw createError({ statusCode: 401, statusMessage: 'Jeton absent ou invalide' })
  }

  if (!rpc || typeof rpc.method !== 'string') {
    return { jsonrpc: '2.0', id: rpc?.id ?? null, error: { code: -32600, message: 'Requête invalide' } }
  }
  // Une notification (pas d'identifiant) n'attend aucune réponse.
  const isNotification = rpc.id === undefined || rpc.id === null
  const reply = (result: unknown) => (isNotification ? null : { jsonrpc: '2.0', id: rpc.id, result })

  try {
    switch (rpc.method) {
      case 'initialize': {
        const asked = String((rpc.params?.protocolVersion as string) ?? '')
        return reply({
          protocolVersion: SUPPORTED.includes(asked) ? asked : PROTOCOL_FALLBACK,
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: 'suivi-seances', version: '1.0.0' },
          instructions: INSTRUCTIONS,
        })
      }
      case 'notifications/initialized':
        return reply({})
      case 'ping':
        return reply({})
      case 'tools/list':
        return reply({ tools: TOOLS })
      case 'tools/call': {
        const name = String(rpc.params?.name ?? '')
        const args = (rpc.params?.arguments ?? {}) as Record<string, unknown>
        const out = await callTool(name, args)
        return reply({ content: [{ type: 'text', text: clamp(out) }] })
      }
      default:
        if (isNotification) return null
        return { jsonrpc: '2.0', id: rpc.id, error: { code: -32601, message: `Méthode inconnue : ${rpc.method}` } }
    }
  }
  catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    if (isNotification) return null
    // Une erreur d'OUTIL se rend dans le résultat, pas en erreur JSON-RPC : le
    // modèle doit pouvoir la lire et corriger son appel plutôt que voir la
    // conversation s'interrompre.
    if (rpc.method === 'tools/call') {
      return { jsonrpc: '2.0', id: rpc.id, result: { isError: true, content: [{ type: 'text', text: `Erreur : ${message}` }] } }
    }
    return { jsonrpc: '2.0', id: rpc.id, error: { code: -32603, message } }
  }
})

const INSTRUCTIONS = `Suivi d'entraînement et de nutrition de Grégoire (recomposition : perdre du gras, garder le muscle).
Les données sont un MIROIR poussé par son téléphone ; elles peuvent avoir quelques heures de retard, l'outil « etat » donne la date.
Tu ne peux rien modifier directement : « proposer_modification » dépose une proposition qu'il valide dans l'application.
Réponds en français, en t'appuyant sur ses chiffres réels plutôt que sur des généralités.`

const TOOLS = [
  {
    name: 'bilan',
    description: 'LE PREMIER OUTIL À APPELER. Rend d\'un seul coup tout ce par quoi commence une conversation : fraîcheur du miroir, séance et repas prévus aujourd\'hui, dernières séances en résumé, tendance de poids sur 7 et 30 jours, propositions en attente. Évite d\'enchaîner « etat », « seances », « poids » et « nutrition » — n\'appelle les outils détaillés qu\'ensuite, pour ce qui manque.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Jour de référence AAAA-MM-JJ (défaut : aujourd\'hui)' },
        seances: { type: 'integer', description: 'Nombre de séances récentes à résumer (défaut 5, maximum 15)' },
      },
    },
  },
  {
    name: 'etat',
    description: 'Fraîcheur du miroir et volume de données disponibles, sans le reste. Préfère « bilan », qui contient déjà ça.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'profil',
    description: 'Profil (taille, sexe, année de naissance), semaine type d\'entraînement, exceptions de planning par date, jours de salle et de télétravail.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'seances',
    description: 'Séances enregistrées, de la plus récente à la plus ancienne : exercices, séries (charge × reps), ressenti, machine utilisée, notes.',
    inputSchema: {
      type: 'object',
      properties: {
        limite: { type: 'integer', description: 'Nombre de séances (défaut 8, maximum 40)' },
        depuis: { type: 'string', description: 'Date ISO AAAA-MM-JJ : ne renvoyer que les séances à partir de cette date' },
      },
    },
  },
  {
    name: 'exercice',
    description: 'Historique complet d\'UN exercice : toutes ses séances, charges, reps, machine utilisée. Sert à répondre « où j\'en suis au squat ».',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Identifiant, ex. squat, dc-barre, tirage-v' } },
      required: ['id'],
    },
  },
  {
    name: 'poids',
    description: 'Suivi corporel : pesées, et composition (masse grasse, muscle, eau) quand la balance l\'a donnée.',
    inputSchema: {
      type: 'object',
      properties: { limite: { type: 'integer', description: 'Nombre de pesées les plus récentes (défaut 30)' } },
    },
  },
  {
    name: 'nutrition',
    description: 'Données de nutrition. Sans argument, renvoie la liste des rubriques disponibles avec leur taille ; avec « rubrique », renvoie son contenu.',
    inputSchema: {
      type: 'object',
      properties: { rubrique: { type: 'string', description: 'Nom exact de la rubrique à lire' } },
    },
  },
  {
    name: 'plats',
    description: 'Catalogue des plats : identifiant, nom, type de créneau, conservation. C\'est la liste des identifiants VALIDES pour proposer un menu ou un changement de plat — ne jamais en inventer un.',
    inputSchema: {
      type: 'object',
      properties: { kind: { type: 'string', description: 'Filtrer : pdj, collation, boite, diner, sauce' } },
    },
  },
  {
    name: 'recette',
    description: 'Le contenu RÉEL d\'un plat : ses ingrédients avec leurs grammages (crus), sa préparation, ses macros, sa conservation, sa sauce. Indispensable avant de modifier une recette — « plats » ne donne que les noms. Sans argument, rend la liste des identifiants.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Identifiant du plat, ex. « boite-a »' } },
    },
  },
  {
    name: 'aliments',
    description: 'Catalogue des aliments : identifiant, nom, macros pour 100 g, conservation. Ce sont les seuls identifiants valides dans les ingrédients d\'une recette — ne jamais en inventer un.',
    inputSchema: {
      type: 'object',
      properties: { cherche: { type: 'string', description: 'Filtre sur le nom (ex. « saumon »)' } },
    },
  },
  {
    name: 'programme',
    description: 'Le programme d\'entraînement : séances (identifiant, nom, jour), exercices de chacune, et pour chaque exercice les machines de remplacement connues.',
    inputSchema: {
      type: 'object',
      properties: { seance: { type: 'string', description: 'Identifiant d\'une séance (s1…s4) pour n\'avoir qu\'elle' } },
    },
  },
  {
    name: 'menus',
    description: 'Semaines de menus existantes (les siennes et celles livrées) et à quel lundi chacune est appliquée.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'champ',
    description: 'Lit UNE valeur de la sauvegarde par son chemin (pointeur JSON, ex. « /sessions/12/durationMin »). À appeler AVANT toute correction de champ, pour connaître la valeur exacte à mettre dans « de ». Sans argument, renvoie la carte des sections avec leur taille et un exemple de chemin.',
    inputSchema: {
      type: 'object',
      properties: { chemin: { type: 'string', description: 'Pointeur JSON, commençant par /' } },
    },
  },
  {
    name: 'propositions',
    description: 'Les modifications déjà proposées et leur sort (en attente, appliquée, refusée).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'proposer_modification',
    description: 'Dépose une proposition de modification. N\'écrit RIEN : Grégoire la voit à l\'ouverture de l\'application et décide. Décris précisément ce qui change.',
    inputSchema: {
      type: 'object',
      properties: {
        resume: { type: 'string', description: 'Une phrase lisible, ex. « Vendredi midi : Boîte B → Saumon patate douce »' },
        cible: {
          type: 'string',
          enum: ['semaine', 'semaine-type', 'plat', 'planning-seance', 'recette', 'aliment', 'repas-libre', 'correction', 'autre'],
          description: 'Ce qui est touché',
        },
        detail: {
          type: 'object',
          description: [
            'Le détail exploitable, dont la forme dépend de « cible ». Les deux formes ci-dessous s\'appliquent d\'un tap ; toute autre s\'affiche mais devra être faite à la main.',
            '• plat : { date: "AAAA-MM-JJ", slot: "lunch"|"dinner"|"pdj"|"snack"|"night"|"pre"|"creatine", vers: "<id de plat>" ou null pour revenir au plat prévu }',
            '• planning-seance : { date: "AAAA-MM-JJ", vers: "s1".."s4" ou "repos" }',
            '• repas-libre : { date: "AAAA-MM-JJ", slot: "lunch", vers: { label: "Kebab galette + frites", kcal: 1050, p: 45, g: 95, l: 50 } } — un repas qu\'il n\'a pas cuisiné, qui REMPLACE le plat prévu de ce créneau et porte ses propres macros. « vers: null » le retire et rend le créneau au plat prévu. C\'est la seule forme où tu fournis des chiffres estimés : donne les quatre, les protéines surtout, et dis dans le résumé sur quoi tu t\'es basé.',
            '• semaine : { lundi: "AAAA-MM-JJ", nom: "…", jours: [ { lunch: "<id>", dinner: "<id>", off?: true }, … 7 entrées, lundi en premier ] }',
            '• semaine-type : { seances?: ["s1","s2",null,"s3","s4",null,null], salle?: [7 booléens], teletravail?: [7 booléens] } — lundi en premier, les trois axes sont indépendants',
            '• recette : { id?: "<id existant pour modifier>", nom, kind: "pdj"|"boite"|"diner"|"collation"|"sauce", batch?: true, steps?: "…", sauce?: "<id de sauce>", keeps?: 4, items: [ { food: "<id d\'aliment>", g: 120 } ] } — « items » REMPLACE la liste, envoie-la complète. Lis d\'abord la recette avec l\'outil « recette » : sans ça tu effaces des ingrédients sans le savoir. « steps » est la marche à suivre du batch cooking, « keeps » la conservation en jours — c\'est elle qui décide dans quelle session de cuisine le plat tombe.',
            '• aliment : { id?: "<id existant pour corriger>", nom, cat: "viandes"|"poissons"|"oeufs"|"laitiers"|"feculents"|"legumes"|"fruits"|"grasses"|"aromates"|"complements"|"boissons", kcal, p, g, l, cook?: "6 min vapeur", buy?: "1 c. à café = 5 g", keeps?: 5 } — valeurs POUR 100 g, viandes et féculents crus. Les macros doivent expliquer les calories à 25 % près, sinon c\'est refusé : une étiquette mal recopiée ne fait rien planter, elle fausse les calories pour toujours.',
            '• correction, série : { quoi: "serie", exercice: "<id>", date: "AAAA-MM-JJ", serie: 0, de: { w, r }, vers: { w, r } }',
            '• correction, pesée : { quoi: "pesee", date: "AAAA-MM-JJ", de: 77.4, vers: 76.9 } — « vers: null » supprime la pesée',
            '• correction, champ quelconque : { quoi: "champ", chemin: "/sessions/12/durationMin", de: 50, vers: 65 } — n\'importe quelle valeur SIMPLE de la sauvegarde (nombre, texte, booléen). Le chemin doit exister, on ne crée rien, et on ne remplace jamais un objet ou un tableau entier. Lis-le d\'abord avec l\'outil « champ ».',
            'Les corrections portent « de » : la valeur actuellement enregistrée. Si elle ne correspond pas, l\'application REFUSE — c\'est ce qui empêche d\'écraser une donnée qu\'on avait mal lue. Lis-la d\'abord avec « exercice » ou « poids ».',
          ].join('\n'),
        },
      },
      required: ['resume', 'cible', 'detail'],
    },
  },
]

/**
 * Pourquoi une proposition a été refusée, en pointant la cause la plus probable.
 *
 * « Proposition invalide » ferait retenter au hasard. Les trois causes qui reviennent
 * — un identifiant d'aliment qui n'existe pas, des macros qui ne collent pas aux
 * calories, une catégorie inventée — se distinguent en quelques lignes, et chacune
 * dit quoi corriger.
 */
function refusMessage(cible: string, d: Record<string, unknown>, ctx: { foodKnown: (id: string) => boolean, recipeKnown: (id: string) => boolean }): string {
  if (cible === 'recette') {
    const items = Array.isArray(d.items) ? d.items : (Array.isArray(d.ingredients) ? d.ingredients : [])
    const inconnus = items
      .map(it => (it && typeof it === 'object' ? (it as Record<string, unknown>).food ?? (it as Record<string, unknown>).aliment : null))
      .filter((f): f is string => typeof f === 'string' && !ctx.foodKnown(f))
    if (inconnus.length) {
      return `Ces aliments n'existent pas : ${inconnus.join(', ')}. Appelle « aliments » pour les identifiants valides, ou propose-les d'abord avec « cible: aliment ».`
    }
    if (!items.length) return 'Une recette a besoin d\'au moins un ingrédient, avec son identifiant et ses grammes.'
    if (typeof d.id === 'string' && d.id && !ctx.recipeKnown(d.id)) return `Le plat « ${d.id} » n'existe pas. Sans « id » tu en crées un nouveau ; avec, il doit exister.`
    const sauce = d.sauce ?? d.pot
    if (typeof sauce === 'string' && !ctx.recipeKnown(sauce)) return `La sauce « ${sauce} » n'existe pas. Appelle « plats » avec kind: "sauce".`
    return 'Recette refusée : vérifie le nom, le type (pdj, boite, diner, collation, sauce) et les grammages.'
  }
  const n = (v: unknown) => (typeof v === 'number' ? v : Number(v))
  const kcal = n(d.kcal ?? d.calories)
  const somme = n(d.p ?? d.proteines) * 4 + n(d.g ?? d.glucides) * 4 + n(d.l ?? d.lipides) * 9
  if (Number.isFinite(kcal) && Number.isFinite(somme) && kcal > 0 && Math.abs(somme - kcal) > kcal * 0.25 + 20) {
    return `Les macros donnent ${Math.round(somme)} kcal, pas ${kcal}. Une étiquette mal recopiée ne fait rien planter, elle fausse les calories pour toujours — relis-la.`
  }
  return 'Aliment refusé : il faut un nom, une catégorie valide (viandes, poissons, oeufs, laitiers, feculents, legumes, fruits, grasses, aromates, complements, boissons) et les quatre valeurs POUR 100 g.'
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  if (name === 'proposer_modification') {
    const resume = String(args.resume ?? '').trim()
    if (!resume) throw new Error('« resume » est obligatoire : c\'est la phrase que Grégoire lira avant de valider.')
    const detail = (args.detail ?? {}) as Record<string, unknown>
    /**
     * Un aliment ou une recette vérifiés AVANT le dépôt.
     *
     * Même raisonnement que pour les corrections de champ : l'application refusera
     * de toute façon une proposition qu'elle ne sait pas lire, mais elle le fera
     * dans la boîte de réception, et c'est Grégoire qui paiera l'aller-retour. Le
     * serveur a le miroir sous la main, donc la bibliothèque : il peut trancher ici.
     *
     * Le contrôle est le MÊME code que celui de l'application — `foodFor` et
     * `recipeFor` — nourri des mêmes identifiants. Deux validateurs auraient
     * divergé, et c'est toujours celui qui n'est pas testé qui laisse passer.
     */
    const cible = String(args.cible ?? '')
    if (cible === 'aliment' || cible === 'recette') {
      const m = await readMirror()
      const nut = ((m?.data as Record<string, unknown>)?.nutrition ?? {}) as Record<string, unknown>
      const recettes = mergeRecipes(
        asArray(nut.userRecipes) as never,
        (nut.recipePatches ?? {}) as never,
        asArray(nut.disabledRecipes) as never,
      )
      const foods = mergeFoods(asArray(nut.userFoods) as never, (nut.foodPatches ?? {}) as never)
      const ctx = { foodKnown: (id: string) => !!foods[id], recipeKnown: (id: string) => !!recettes[id] }
      const brut = { id: '', at: '', action: cible, summary: resume, patch: detail, status: 'pending' as const }
      const plan = cible === 'aliment' ? foodFor(brut, ctx) : recipeFor(brut, ctx)
      if (!plan) throw new Error(refusMessage(cible, detail, ctx))
    }

    // Sur « quoi », pas sur « cible » : l'intention est déjà sans ambiguïté, et une
    // cible mal choisie ne doit pas faire sauter la vérification.
    if (detail.quoi === 'champ') {
      const m = await readMirror()
      if (!m) throw new Error('Aucune donnée personnelle : le téléphone n\'a pas encore poussé son miroir, impossible de vérifier le champ visé.')
      checkFieldFix(detail, m.data as Record<string, unknown>)
    }
    const p = await addProposal({
      action: String(args.cible ?? 'autre'),
      summary: resume,
      patch: (args.detail ?? {}) as Record<string, unknown>,
    }, new Date().toISOString())
    return { depose: true, id: p.id, rappel: 'Rien n\'est écrit : la proposition attend sa validation dans l\'application.' }
  }
  if (name === 'propositions') {
    const all = await readProposals()
    return { total: all.length, propositions: all.slice(-20).reverse() }
  }
  /**
   * Le programme est dans le code, pas dans le miroir : il se rend sans rien lire.
   *
   * Il était traité plus bas, après le `readMirror()` commun — donc payait un
   * aller-retour vers le stockage pour une réponse qui n'en dépend en rien. C'est
   * aussi l'outil le plus utile quand le miroir manque encore.
   *
   * Les coefficients sont arrondis à deux décimales. `50/45` donnait
   * « 1.1111111111111112 » : dix-sept chiffres pour une conversion de charge dont le
   * dernier utile est le premier après la virgule.
   */
  if (name === 'programme') {
    const seance = typeof args.seance === 'string' ? args.seance : ''
    return {
      seances: PROGRAM.filter(s => !seance || s.id === seance).map(s => ({
        id: s.id,
        nom: s.name,
        jour: s.tag,
        sprint: !!s.sprint,
        exercices: s.exercises.map(e => ({
          id: e.id,
          nom: e.name,
          series: e.sets,
          reps: e.reps,
          muscles: e.muscles,
          machines_de_remplacement: (VARIANTS[e.id] ?? []).map(v => ({
            id: v.id,
            nom: v.name,
            coefficient: Math.round(v.ratio * 100) / 100,
          })),
        })),
      })),
    }
  }

  /**
   * Les RÉFÉRENCES n'ont pas besoin du miroir, les données personnelles si.
   *
   * Le catalogue des plats, celui des aliments et le programme sont livrés avec
   * l'application : ils existent avant qu'un seul octet ait été poussé. Les exiger
   * quand même rendait le connecteur inutile pendant la fenêtre exacte où l'on
   * essaie de le mettre en route — juste après l'avoir branché, avant la première
   * ouverture de l'app — et avec un message qui parle d'autre chose.
   *
   * Le miroir n'ajoute à ces trois-là que ce que l'utilisateur a créé lui-même.
   */
  const PERSONNELS = ['bilan', 'etat', 'profil', 'seances', 'exercice', 'poids', 'nutrition', 'champ']
  const mirror = await readMirror()
  if (!mirror && PERSONNELS.includes(name)) {
    throw new Error('Aucune donnée personnelle : le téléphone n\'a pas encore poussé son miroir. Demande-lui d\'ouvrir l\'application une fois. Les catalogues (plats, aliments, programme) restent lisibles.')
  }
  const d = (mirror?.data ?? {}) as Record<string, unknown>

  if (name === 'bilan') return bilan(d, mirror!.at, args, await readProposals())

  switch (name) {
    case 'plats': {
      // La bibliothèque EFFECTIVE : les plats livrés avec le programme, plus ceux
      // qu'il a créés ou modifiés. Sans elle, un menu proposé porterait des
      // identifiants inventés — et l'application les refuserait, à juste titre.
      const nut = (d.nutrition ?? {}) as Record<string, unknown>
      const recipes = mergeRecipes(
        (nut.userRecipes ?? []) as never,
        (nut.recipePatches ?? {}) as never,
      )
      const off = new Set((nut.disabledRecipes ?? []) as string[])
      const kind = typeof args.kind === 'string' ? args.kind : ''
      const list = Object.values(recipes)
        .filter(r => !kind || r.kind === kind)
        .map(r => ({
          id: r.id,
          nom: r.name,
          type: r.kind,
          type_libelle: KIND_GROUP_LABELS[r.kind] ?? r.kind,
          conservation_jours: r.keep ?? null,
          ...(off.has(r.id) ? { mis_de_cote: true } : {}),
        }))
        .sort((a, b) => a.type.localeCompare(b.type) || a.nom.localeCompare(b.nom))
      return { total: list.length, plats: list }
    }
    case 'aliments': {
      const nut = (d.nutrition ?? {}) as Record<string, unknown>
      const foods = mergeFoods((nut.userFoods ?? []) as never, (nut.foodPatches ?? {}) as never)
      const q = typeof args.cherche === 'string' ? args.cherche.toLowerCase() : ''
      const list = Object.values(foods)
        .filter(f => !q || f.name.toLowerCase().includes(q) || f.id.includes(q))
        .map(f => ({ id: f.id, nom: f.name, cat: f.cat, pour_100g: { kcal: f.kcal, p: f.p, g: f.g, l: f.l } }))
        .sort((a, b) => a.nom.localeCompare(b.nom))
      return { total: list.length, aliments: list }
    }
    case 'recette': {
      const nut = (d.nutrition ?? {}) as Record<string, unknown>
      const recettes = mergeRecipes(
        asArray(nut.userRecipes) as never,
        (nut.recipePatches ?? {}) as never,
        asArray(nut.disabledRecipes) as never,
      )
      const foods = mergeFoods(asArray(nut.userFoods) as never, (nut.foodPatches ?? {}) as never)
      const id = String(args.id ?? '')
      if (!id) {
        return {
          rappel: 'Appelle « recette » avec un id pour voir les ingrédients et les grammages.',
          plats: Object.values(recettes).filter(r => !r.disabled).map(r => ({ id: r.id, nom: r.name, type: r.kind })),
        }
      }
      const r = recettes[id]
      if (!r) throw new Error(`Plat inconnu : ${id}. Appelle « recette » sans argument pour la liste.`)

      /**
       * Les grammages sont CRUS, et le poids cuit est donné à côté quand il existe.
       *
       * Les tables de composition mesurent le cru : c'est la seule référence qui ne
       * dépende pas de la casserole, et c'est elle qui donne les macros justes. Mais
       * on ne répartit pas du riz cru entre cinq boîtes, d'où la conversion — pour
       * les féculents seulement, les seuls qu'on ne peut pas compter à l'unité.
       */
      const ligne = (it: { food: string, g: number }) => {
        const f = foods[it.food]
        const cuit = cookedWeight(it.food, it.g, { mesures: (nut.cookedRatios ?? {}) as Record<string, number> })
        return {
          aliment: it.food,
          nom: f?.name ?? it.food,
          grammes_crus: it.g,
          ...(cuit ? { grammes_cuits: cuit } : {}),
          ...(f?.cook ? { cuisson: f.cook } : {}),
        }
      }
      const sauce = r.sauce ? recettes[r.sauce] : null
      return {
        id: r.id,
        nom: r.name,
        type: r.kind,
        perso: !!r.custom,
        batch_cooking: r.batch,
        // La conservation EFFECTIVE, pas seulement le champ posé sur la recette :
        // faute de valeur explicite, elle est déduite du plus fragile des
        // ingrédients. C'est elle qui décide dans quelle session de cuisine le plat
        // tombe, donc c'est elle qu'il faut lire avant de proposer un changement.
        conservation_jours: keepsOf(r, { foods, recipes: recettes }),
        conservation_posee: typeof r.keeps === 'number' ? r.keeps : null,
        preparation: r.steps || null,
        // `expandItems` ajoute les ingrédients de la sauce : ce sont eux qui comptent
        // dans les macros, donc les cacher rendrait le total incompréhensible.
        ingredients: r.items.map(ligne),
        sauce: sauce ? { id: sauce.id, nom: sauce.name, preparation: sauce.steps || null, ingredients: sauce.items.map(ligne) } : null,
        macros_portion: roundMacros(macrosOf(expandItems(r, { foods, recipes: recettes }), foods)),
        rappel: 'Grammages CRUS — c\'est la référence des macros. Pour modifier, renvoie la liste COMPLÈTE des ingrédients : elle remplace l\'ancienne.',
      }
    }
    case 'menus': {
      const nut = (d.nutrition ?? {}) as Record<string, unknown>
      const mine = (nut.menus ?? []) as { id: string, name: string, days: unknown[] }[]
      return {
        semaines_livrees: builtinWeeks().map(w => ({ id: w.id, nom: w.name, jours: w.days })),
        mes_semaines: mine.map(m => ({ id: m.id, nom: m.name, jours: m.days })),
        semaine_active: nut.activeMenu ?? null,
        appliquees: nut.menuAssign ?? {},
      }
    }
    case 'champ': {
      const chemin = typeof args.chemin === 'string' ? args.chemin : ''
      if (!chemin) {
        // Sans chemin, on donne la CARTE : sections, taille, et un exemple de
        // chemin valide. Deviner « /sessions/12/durationMin » sans savoir que
        // « sessions » existe ni combien il en contient n'aurait pas de sens.
        const sections = Object.entries(d).map(([k, v]) => {
          const n = Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : null)
          return {
            section: k,
            type: Array.isArray(v) ? 'liste' : typeof v,
            elements: n,
            exemple: Array.isArray(v) && v.length ? `/${k}/0` : `/${k}`,
          }
        })
        return { sections, rappel: 'Appelle « champ » avec un chemin pour lire une valeur précise.' }
      }
      const val = getAt(d, chemin)
      if (val === undefined) throw new Error(`Aucune valeur à « ${chemin} ». Vérifie le chemin avec « champ » sans argument.`)
      const simple = val === null || ['string', 'number', 'boolean'].includes(typeof val)
      const double = twinPath(chemin, d)
      return {
        chemin,
        valeur: val,
        modifiable: simple,
        ...(simple ? {} : { note: 'C\'est un objet ou une liste : on ne remplace que des valeurs simples. Descends d\'un cran.' }),
        ...(double ? { affiche: false, note: `Cette copie n'est PAS celle que l'application affiche. La durée montrée est ${double} — corrige plutôt celle-là.` } : {}),
      }
    }
    case 'etat': {
      const sessions = asArray(d.sessions)
      const bw = asArray(d.bodyWeight)
      return {
        miroir_du: mirror.at,
        seances: sessions.length,
        derniere_seance: (sessions.at(-1) as { at?: string } | undefined)?.at ?? null,
        pesees: bw.length,
        derniere_pesee: (bw.at(-1) as { date?: string } | undefined)?.date ?? null,
        exercices_suivis: Object.keys((d.logs ?? {}) as object).length,
      }
    }
    case 'profil':
      return {
        profil: d.profile ?? null,
        semaine_type_seances: d.weekPlan ?? null,
        exceptions_planning: d.planDays ?? {},
        semaine_salle_teletravail: (d.nutrition as Record<string, unknown> | undefined)?.week ?? null,
      }
    case 'seances': {
      const limite = clampInt(args.limite, 8, 1, 40)
      const depuis = typeof args.depuis === 'string' ? args.depuis : null
      let sessions = asArray(d.sessions) as Record<string, unknown>[]
      if (depuis) sessions = sessions.filter(s => String(s.at ?? '').slice(0, 10) >= depuis)
      return { total: sessions.length, seances: sessions.slice(-limite).reverse() }
    }
    case 'exercice': {
      const id = String(args.id ?? '')
      const logs = (d.logs ?? {}) as Record<string, unknown>
      if (!(id in logs)) {
        return { inconnu: id, exercices_disponibles: Object.keys(logs) }
      }
      return { exercice: id, seances: logs[id] }
    }
    case 'poids': {
      const limite = clampInt(args.limite, 30, 1, 200)
      return {
        pesees: asArray(d.bodyWeight).slice(-limite),
        composition: asArray(d.withingsBody).slice(-limite),
      }
    }
    case 'nutrition': {
      const nut = (d.nutrition ?? {}) as Record<string, unknown>
      const rubrique = typeof args.rubrique === 'string' ? args.rubrique : ''
      if (!rubrique) {
        return {
          rubriques: Object.entries(nut).map(([k, v]) => ({
            nom: k,
            taille_octets: Buffer.byteLength(JSON.stringify(v ?? null)),
          })).sort((a, b) => b.taille_octets - a.taille_octets),
        }
      }
      if (!(rubrique in nut)) throw new Error(`Rubrique inconnue : ${rubrique}. Appelle « nutrition » sans argument pour la liste.`)
      return { [rubrique]: nut[rubrique] }
    }
    default:
      throw new Error(`Outil inconnu : ${name}`)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Le bilan : une seule traversée au lieu de quatre.
// ─────────────────────────────────────────────────────────────────────────────
//
// Presque toutes les conversations commencent pareil — de quand datent les données,
// qu'est-ce qui est prévu aujourd'hui, comment se sont passées les dernières
// séances, où en est le poids. Répondre demandait quatre appels : `etat`, `seances`,
// `poids`, `nutrition`. Quatre allers-retours pour une seule question.
//
// Ça coûtait déjà du contexte — quatre réponses qui se recoupent — mais c'est la
// passerelle qui a tranché : elle échoue une fois sur deux, et chaque traversée
// évitée est une chance de moins de tomber dessus. Un bilan en un appel, c'est
// statistiquement quatre fois moins d'échecs pour ouvrir une conversation.
//
// Le contenu est un RÉSUMÉ, délibérément : les séries détaillées restent dans
// `seances`, l'historique d'un mouvement dans `exercice`. Tout regrouper aurait juste
// déplacé le problème dans la fenêtre de contexte.

function bilan(
  d: Record<string, unknown>,
  pousseLe: string,
  args: Record<string, unknown>,
  props: { status: string }[],
): unknown {
  const jour = typeof args.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(args.date)
    ? args.date
    : new Date().toISOString().slice(0, 10)
  const combien = clampInt(args.seances, 5, 1, 15)
  const nut = (d.nutrition ?? {}) as Record<string, unknown>

  // ─── Ce qui est prévu aujourd'hui ────────────────────────────────────────
  // Même règle que l'application : une exception de planning l'emporte sur la
  // semaine type. Les redéfinir autrement ferait diverger ce que je dis de ce que
  // l'écran montre, et c'est exactement le genre d'écart qu'on ne voit jamais venir.
  const dow = dowIndex(jour)
  const exceptions = (d.planDays ?? {}) as Record<string, string | null>
  const semaine = asArray(d.weekPlan) as (string | null)[]
  const seanceId = Object.hasOwn(exceptions, jour) ? exceptions[jour] : (semaine[dow] ?? null)
  const seanceDuJour = PROGRAM.find(p => p.id === seanceId) ?? null
  const salle = !!seanceDuJour

  // La semaine de menus appliquée à cette date : la dernière assignée avant elle.
  const assign = (nut.menuAssign ?? {}) as Record<string, string>
  const mesSemaines = asArray(nut.menus).map(normalizeWeek).filter(Boolean)
  const passees = Object.keys(assign).filter(m => m <= mondayOf(jour)).sort()
  const voulue = passees.length ? assign[passees.at(-1)!] : (nut.activeMenu as string | null)
  const toutes = [...builtinWeeks(), ...mesSemaines] as ReturnType<typeof builtinWeeks>
  const menu = toutes.find(w => w.id === voulue) ?? toutes[0]

  const recettes = mergeRecipes(
    asArray(nut.userRecipes) as never,
    (nut.recipePatches ?? {}) as never,
    asArray(nut.disabledRecipes) as never,
  )
  const nomDe = (id: string | undefined) => (id ? recettes[id]?.name ?? id : null)
  // Le plat RÉELLEMENT pris l'emporte sur celui du plan : c'est ce qu'il a mangé.
  const pris = ((nut.picked ?? {}) as Record<string, Record<string, string>>)[jour] ?? {}
  const repas = (salle ? SLOTS_GYM : SLOTS_REST)
    .filter(sl => sl.id === 'lunch' || sl.id === 'dinner')
    .map(sl => ({
      creneau: sl.id,
      heure: sl.time,
      plat: nomDe(pris[sl.id] ?? recipeForSlot(menu, dow, sl)),
      remplace: Object.hasOwn(pris, sl.id),
    }))

  // ─── Les dernières séances, en une ligne chacune ─────────────────────────
  const sessions = asArray(d.sessions) as Record<string, unknown>[]
  const recentes = sessions.slice(-combien).reverse().map((s) => {
    const entries = asArray(s.entries) as { sets?: unknown[], effort?: string }[]
    const durs = entries.map(e => e.effort).filter(Boolean)
    return {
      date: String(s.at ?? '').slice(0, 10),
      nom: s.name ?? null,
      duree_min: s.durationMin ?? null,
      exercices: entries.length,
      series: entries.reduce((n, e) => n + asArray(e.sets).length, 0),
      a_l_echec: durs.filter(e => e === 'fail').length,
      note: s.note ?? null,
    }
  })

  // ─── Le poids : la tendance, pas la liste ────────────────────────────────
  // Le calcul est dans lib/bilan.ts, avec ses tests : c'est la seule partie du bilan
  // qui puisse être fausse sans que ça se voie.
  const poids = weightTrend(asArray(d.bodyWeight) as { date?: string, kg?: number }[], jour)
  // La fraîcheur du miroir se mesure à MAINTENANT, pas au jour demandé : c'est une
  // propriété du serveur, pas de la question posée.
  const heures = Math.round((Date.now() - Date.parse(pousseLe)) / 3600000)

  return {
    miroir: {
      pousse_le: pousseLe,
      // Le retard est LE chiffre à lire avant de conclure quoi que ce soit.
      retard_h: heures > 0 ? heures : 0,
      a_jour: heures < 24,
    },
    aujourdhui: {
      date: jour,
      jour: DAY_NAMES[dow],
      seance_prevue: seanceDuJour ? { id: seanceDuJour.id, nom: seanceDuJour.name } : null,
      jour_de_salle: salle,
      semaine_de_menus: menu?.name ?? null,
      repas,
    },
    seances_recentes: recentes,
    // Le rythme, pas un verdict : la cible dépend de sa composition corporelle, et ce
    // sont `poids` et `profil` qui portent ces chiffres-là.
    poids,
    propositions_en_attente: props.filter(p => p.status === 'pending').length,
    pour_aller_plus_loin: 'Séries détaillées : « seances ». Historique d\'un mouvement : « exercice ». Un champ précis : « champ ».',
  }
}

const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10)
  return Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback
}

/** Tronque en le DISANT : une réponse coupée en silence se lit comme une réponse
 *  complète, et le modèle conclut sur des données qu'il n'a pas vues. */
function clamp(value: unknown): string {
  const text = JSON.stringify(value, null, 1) ?? 'null'
  if (Buffer.byteLength(text) <= MAX_RESULT_BYTES) return text
  return `${text.slice(0, MAX_RESULT_BYTES)}\n… RÉPONSE TRONQUÉE à ${MAX_RESULT_BYTES} octets. Relance avec un filtre plus étroit (limite, depuis, rubrique).`
}
