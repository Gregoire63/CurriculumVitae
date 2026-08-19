// Import relatif : testé dans le projet « unit », qui tourne en Node pur sans la
// résolution de chemins de Nuxt.
import type { Exercise, Session } from '../data/sportProgram'

// ─────────────────────────────────────────────────────────────────────────────
// Le programme livré, plus ce qu'un coach en a fait.
// ─────────────────────────────────────────────────────────────────────────────
//
// `PROGRAM` était figé dans le code. Changer 4×6-8 en 5×5 sur le développé couché,
// allonger un repos, retirer un mouvement qui fait mal à l'épaule, en ajouter un —
// tout cela demandait de rouvrir l'éditeur. C'est le seul pan de l'application qui
// n'avait aucune prise depuis une conversation, alors que c'est précisément le pan
// sur lequel un coach intervient.
//
// Le mécanisme est celui de la bibliothèque de plats, et pour les mêmes raisons :
//
//   · on PATCHE le livré, on ne le réécrit pas. La fiche d'origine reste là, donc on
//     peut revenir en arrière si la modification se révèle mauvaise ;
//   · on RETIRE en désactivant, jamais en supprimant. Les séances enregistrées sont
//     indexées par identifiant d'exercice : effacer l'exercice rendrait illisibles
//     des mois d'historique, et ferait disparaître des records qu'on a vraiment
//     soulevés. Un mouvement retiré sort du programme et reste dans le passé.
//
// Cette deuxième règle est la plus importante, et c'est celle qu'on aurait le plus
// facilement enfreinte : « retirer un exercice » se code en une ligne avec un filter,
// et cette ligne coûte l'historique.

/** Ce qu'on peut changer sur un exercice livré. Tout est facultatif : un patch ne
 *  touche QUE ce qu'il mentionne. */
export interface ExercisePatch {
  name?: string
  sets?: number
  reps?: string
  /** Repos entre séries, en secondes. */
  rest?: number
  cues?: string[]
  machine?: string
  muscles?: string[]
  bodyweight?: boolean
  /** Les deux mouvements enchaînés, par leur LIBELLÉ — pas par identifiant : la
   *  saisie affiche une colonne de charge par mouvement, elle n'ouvre pas de fiche. */
  superset?: [string, string]
}

export interface ProgramCustom {
  /** Modifications d'exercices livrés, par identifiant. */
  patches?: Record<string, ExercisePatch>
  /** Exercices ajoutés, par identifiant de séance. */
  added?: Record<string, Exercise[]>
  /** Exercices retirés du programme — mais PAS de l'historique. */
  disabled?: string[]
  /** Ordre voulu des exercices d'une séance, par identifiant de séance. */
  order?: Record<string, string[]>
}

const patchOf = (e: Exercise, p?: ExercisePatch): Exercise => {
  if (!p) return e
  // Aucune clé absente ne doit écraser l'existant : c'est tout l'intérêt d'un patch.
  const out: Exercise = { ...e }
  if (typeof p.name === 'string' && p.name.trim()) out.name = p.name.trim()
  if (typeof p.sets === 'number' && p.sets > 0) out.sets = Math.round(p.sets)
  if (typeof p.reps === 'string' && p.reps.trim()) out.reps = p.reps.trim()
  if (typeof p.rest === 'number' && p.rest > 0) out.rest = Math.round(p.rest)
  if (Array.isArray(p.cues)) out.cues = p.cues.filter(c => typeof c === 'string' && c.trim())
  if (typeof p.machine === 'string') out.machine = p.machine
  if (Array.isArray(p.muscles) && p.muscles.length) out.muscles = p.muscles.filter(m => typeof m === 'string')
  if (typeof p.bodyweight === 'boolean') out.bodyweight = p.bodyweight
  if (Array.isArray(p.superset) && p.superset.length === 2) out.superset = [String(p.superset[0]), String(p.superset[1])]
  return out
}

/**
 * Le programme EFFECTIF : livré + modifications + ajouts − retraits, dans l'ordre voulu.
 *
 * Les identifiants absents de `order` gardent leur place relative après ceux qui y
 * figurent : réordonner les trois premiers exercices ne doit pas obliger à énumérer
 * les six.
 */
export function mergeProgram(builtin: Session[], custom: ProgramCustom = {}): Session[] {
  const off = new Set(custom.disabled ?? [])
  return builtin.map((s) => {
    const ajoutes = (custom.added?.[s.id] ?? []).filter(e => e && typeof e.id === 'string')
    const tous = [...s.exercises, ...ajoutes]
      .filter(e => !off.has(e.id))
      .map(e => patchOf(e, custom.patches?.[e.id]))

    const voulu = custom.order?.[s.id]
    if (!voulu?.length) return { ...s, exercises: tous }
    const rang = new Map(voulu.map((id, i) => [id, i]))
    const trie = [...tous].sort((a, b) => {
      const ra = rang.get(a.id), rb = rang.get(b.id)
      if (ra === undefined && rb === undefined) return 0
      // Un exercice non cité reste après ceux qui le sont, sans changer d'ordre entre eux.
      if (ra === undefined) return 1
      if (rb === undefined) return -1
      return ra - rb
    })
    return { ...s, exercises: trie }
  })
}

/** Tous les exercices du programme effectif, à plat. */
export const allExercises = (sessions: Session[]): Exercise[] => sessions.flatMap(s => s.exercises)

/**
 * Les exercices RETIRÉS, avec leur fiche d'origine.
 *
 * L'historique les référence encore. Sans cette liste, une séance de mars afficherait
 * « dc-barre » en identifiant brut là où elle affichait « Développé couché barre ».
 */
export function retiredExercises(builtin: Session[], custom: ProgramCustom = {}): Record<string, Exercise> {
  const off = new Set(custom.disabled ?? [])
  const out: Record<string, Exercise> = {}
  for (const s of builtin) {
    for (const e of s.exercises) if (off.has(e.id)) out[e.id] = e
    for (const e of custom.added?.[s.id] ?? []) if (off.has(e.id)) out[e.id] = e
  }
  return out
}

/**
 * Les mouvements retirés AVANT que le programme ne devienne modifiable.
 *
 * Ils ne sont plus nulle part dans `PROGRAM`, mais des séances de l'historique les
 * référencent encore. Cette table vivait recopiée à l'identique dans deux composants —
 * `DaySheet` et `Report` — et un troisième écran l'aurait oubliée. Elle est ici, une
 * fois, avec la fonction qui la consulte.
 */
export const LEGACY_NAMES: Record<string, string> = {
  'ext-corde': 'Extension triceps corde',
  'curl-incline': 'Curl incliné haltères',
  'curl-ez': 'Curl barre EZ',
}

/** La séance qui contient cet exercice dans le programme livré ou personnalisé. */
export function sessionOf(sessions: Session[], exId: string): Session | null {
  return sessions.find(s => s.exercises.some(e => e.id === exId)) ?? null
}
