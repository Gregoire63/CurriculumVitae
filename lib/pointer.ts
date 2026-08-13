// ─────────────────────────────────────────────────────────────────────────────
// Désigner un endroit précis dans la sauvegarde, et n'y toucher que là.
// ─────────────────────────────────────────────────────────────────────────────
//
// Rendre « tout le fichier de sauvegarde modifiable » pose une question qu'il vaut
// mieux résoudre avant d'écrire la première ligne : COMMENT désigne-t-on l'endroit
// à modifier, et qu'est-ce qu'on s'interdit d'y faire ?
//
// Le format retenu est le JSON Pointer (RFC 6901) : `/sessions/3/durationMin`. Il a
// deux qualités qui comptent ici — il est sans ambiguïté (pas d'analyse d'expression,
// pas de quotes à interpréter) et il ne peut désigner qu'UN emplacement, jamais une
// sélection. On ne peut pas écrire « toutes les séances de août » par accident.
//
// Trois interdits, et chacun ferme une façon de perdre des données :
//
//   • on ne crée rien. Le chemin doit exister de bout en bout ; sinon une faute de
//     frappe dans un nom de clé fabriquerait un champ fantôme que rien ne lit ;
//   • on n'écrit que des valeurs SIMPLES — nombre, texte, booléen, null. Remplacer
//     un objet ou un tableau entier, c'est réécrire une séance complète à partir
//     d'une phrase, et c'est exactement ce qu'on refuse depuis le début ;
//   • on vérifie la valeur en place avant de la remplacer (cf. `de` dans les
//     propositions). Ce module ne fait que la LIRE ; c'est l'appelant qui compare.

export type Scalar = string | number | boolean | null

/** Les segments d'un pointeur, échappements RFC 6901 résolus. */
export function parsePointer(pointer: string): string[] | null {
  if (typeof pointer !== 'string' || pointer === '') return null
  if (!pointer.startsWith('/')) return null
  if (pointer.length > 200) return null
  return pointer
    .slice(1)
    .split('/')
    // ~1 → « / » et ~0 → « ~ ». L'ordre est imposé par la RFC : l'inverse
    // transformerait « ~01 » en « / » au lieu de « ~1 ».
    .map(s => s.replace(/~1/g, '/').replace(/~0/g, '~'))
}

const isIndex = (s: string) => /^(0|[1-9]\d*)$/.test(s)

/**
 * La valeur à cet emplacement, ou `undefined` si le chemin ne mène nulle part.
 *
 * `undefined` ne se distingue pas d'une valeur absente, et c'est voulu : dans les
 * deux cas il n'y a rien à remplacer.
 */
export function getAt(root: unknown, pointer: string): unknown {
  const parts = parsePointer(pointer)
  if (!parts) return undefined
  let cur: unknown = root
  for (const p of parts) {
    if (Array.isArray(cur)) {
      if (!isIndex(p)) return undefined
      cur = cur[Number(p)]
    }
    else if (cur && typeof cur === 'object') {
      // `Object.hasOwn` et non `in` : sinon `/constructor` ou `/__proto__`
      // désigneraient des membres hérités, qui n'appartiennent pas aux données.
      if (!Object.hasOwn(cur as object, p)) return undefined
      cur = (cur as Record<string, unknown>)[p]
    }
    else return undefined
    if (cur === undefined) return undefined
  }
  return cur
}

export const isScalar = (v: unknown): v is Scalar =>
  v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean'

/**
 * Écrit une valeur simple à cet emplacement. Rend `false` sans rien toucher si le
 * chemin n'existe pas, ou si l'on essaie d'écraser un objet ou un tableau.
 *
 * La mutation se fait sur l'objet passé — l'appelant travaille sur un instantané
 * qu'il vient de construire, pas sur l'état vivant de l'application.
 */
export function setAt(root: unknown, pointer: string, value: Scalar): boolean {
  const parts = parsePointer(pointer)
  if (!parts || !parts.length || !isScalar(value)) return false
  const last = parts[parts.length - 1]
  const parent = parts.length === 1 ? root : getAt(root, `/${parts.slice(0, -1).map(escape1).join('/')}`)
  if (!parent || typeof parent !== 'object') return false

  if (Array.isArray(parent)) {
    if (!isIndex(last)) return false
    const i = Number(last)
    if (i >= parent.length) return false // on ne rallonge pas un tableau
    if (parent[i] !== null && typeof parent[i] === 'object') return false
    parent[i] = value
    return true
  }
  const obj = parent as Record<string, unknown>
  if (!Object.hasOwn(obj, last)) return false // on ne crée pas de champ
  const before = obj[last]
  if (before !== null && typeof before === 'object') return false // ni objet, ni tableau
  obj[last] = value
  return true
}

const escape1 = (s: string) => s.replace(/~/g, '~0').replace(/\//g, '~1')
