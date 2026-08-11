// ─────────────────────────────────────────────────────────────────────────────
// Logique de calcul du suivi d'entraînement — 100 % pure (aucun accès au DOM,
// à localStorage ou à Vue). Tout ce qui est ici est testé dans test/unit/.
// Les composables/composants se contentent de brancher les données dessus.
// ─────────────────────────────────────────────────────────────────────────────
import type { Exercise } from '../data/sportProgram'

// ─── Séries ──────────────────────────────────────────────────────────────────
// w/r : charge et reps. w2/r2 : 2e mouvement d'un superset (enchaîné sans repos).
// warm : série d'échauffement — jamais comptée dans les stats.
export interface SetLike { w: number; r: number; warm?: boolean; w2?: number; r2?: number }

export const workSets = <T extends SetLike>(sets: T[]): T[] => sets.filter(s => !s.warm)

// Charge de référence d'une série. Sur un superset, les deux mouvements ciblent le
// même muscle : on prend la plus lourde des deux, sinon le 2e mouvement serait
// totalement invisible dans les courbes et les records.
export function setTop(s: SetLike): number {
  return Math.max(s.w || 0, s.w2 || 0)
}
// Volume = tonnage soulevé, les deux mouvements d'un superset comptent.
export function setVolume(s: SetLike): number {
  return (s.w || 0) * (s.r || 0) + (s.w2 && s.r2 ? s.w2 * s.r2 : 0)
}
// 1RM estimé (Epley). Chaque mouvement est évalué séparément, on garde le meilleur.
export function setE1rm(s: SetLike): number {
  const a = s.w && s.r ? s.w * (1 + s.r / 30) : 0
  const b = s.w2 && s.r2 ? s.w2 * (1 + s.r2 / 30) : 0
  return Math.max(a, b)
}

/** Charge maximale des séries de travail (échauffement exclu). */
export function topWeight(sets: SetLike[]): number {
  const w = workSets(sets).map(setTop)
  return w.length ? Math.max(...w) : 0
}
/** Tonnage des séries de travail. */
export function volumeOf(sets: SetLike[]): number {
  return workSets(sets).reduce((a, s) => a + setVolume(s), 0)
}
/** 1RM estimé des séries de travail, arrondi. */
export function e1rmOf(sets: SetLike[]): number {
  const w = workSets(sets).map(setE1rm)
  return w.length ? Math.round(Math.max(...w)) : 0
}

// ─── Arrondis / échauffement ─────────────────────────────────────────────────
export function roundToStep(v: number, step: number): number {
  return Math.round(v / step) * step
}
/** Charge d'échauffement conseillée : ~50 % de la charge de travail la plus
 *  lourde, arrondie au pas de 2,5 kg. null si l'exercice est trop léger pour
 *  mériter un échauffement chiffré. */
export const WARMUP_RATIO = 0.5
export const WARMUP_MIN_LOAD = 20
export function warmupLoad(maxWorkLoad: number): number | null {
  if (!maxWorkLoad || maxWorkLoad <= WARMUP_MIN_LOAD) return null
  const wu = roundToStep(maxWorkLoad * WARMUP_RATIO, 2.5)
  return wu > 0 ? wu : null
}

// ─── Durée de séance ─────────────────────────────────────────────────────────
// Les séances au chrono aberrant (oubli de « Terminer », appli laissée ouverte)
// faussaient la moyenne : on les écarte.
export const DURATION_MIN = 15
export const DURATION_MAX = 120
export function plausibleDurations(mins: (number | undefined | null)[]): number[] {
  return mins.filter((x): x is number => typeof x === 'number' && x >= DURATION_MIN && x <= DURATION_MAX)
}
export function avgSessionDuration(mins: (number | undefined | null)[]): number {
  const ds = plausibleDurations(mins)
  return ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0
}

// ─── Ressenti (RPE simplifié) ────────────────────────────────────────────────
// Un tap par exercice. C'est la seule information qui permet d'auto-réguler la
// charge : « objectif de reps atteint » ne dit pas si ça a été facile ou une lutte.
export type Effort = 'easy' | 'ok' | 'hard' | 'fail'
//
// « À l'échec » et pas « Échec » : c'est l'ARRIVÉE à l'échec musculaire, la fin
// normale d'une série de travail — pas l'aveu d'avoir raté quelque chose. La
// nuance n'est pas cosmétique : tant que le libellé disait « Échec », l'app
// répondait par une décharge à chaque série poussée au bout, y compris quand les
// reps visées étaient toutes là. Voir `nextLoad`.
export const EFFORT_OPTIONS: { value: Effort; label: string; icon: string }[] = [
  { value: 'easy', label: 'Facile', icon: '😀' },
  { value: 'ok', label: 'Correct', icon: '🙂' },
  { value: 'hard', label: 'Dur', icon: '😤' },
  { value: 'fail', label: 'À l\'échec', icon: '💥' },
]
export const isEffort = (v: unknown): v is Effort =>
  v === 'easy' || v === 'ok' || v === 'hard' || v === 'fail'

// ─── Surcharge progressive auto-régulée ──────────────────────────────────────
export type LoadReason = 'progress' | 'stall' | 'keep' | 'deload' | 'none'
export const STALL_SESSIONS = 3

/** Charge conseillée pour la prochaine séance d'un exercice.
 *
 *  Ce sont les REPS qui décident, pas le ressenti. Le ressenti ne fait que les
 *  qualifier : il dit s'il restait de la réserve à ce nombre de reps.
 *
 *  C'est l'inverse de ce que faisait cette fonction, et l'erreur a coûté cher.
 *  « À l'échec » court-circuitait tout le reste et déclenchait une décharge —
 *  y compris quand les reps visées étaient toutes là. Or arriver à l'échec est
 *  la fin NORMALE d'une série de travail en hypertrophie, pas un incident. Le
 *  résultat, sur le journal réel : `dev-mil`, 3 × 8 à 40 kg poussées au bout,
 *  soit exactement la série demandée sur du 8-10 — et l'app conseillait de
 *  redescendre à 37,5.
 *
 *  Ce qui distingue les deux cas n'est pas le ressenti, c'est OÙ tombent les
 *  reps dans la fourchette :
 *
 *    à l'échec à 10 reps sur 8-10  → la charge est mûre, on monte
 *    à l'échec à  8 reps sur 8-10  → la série voulue, on reste et on gagne une rep
 *    à l'échec à  5 reps sur 8-10  → là seulement, la charge est trop lourde
 */
export function nextLoad(opts: {
  lastSets: SetLike[]
  plannedSets: number
  topReps: number | null
  /** Borne basse de la fourchette. En dessous, la charge est vraiment trop lourde. */
  bottomReps?: number | null
  inc: number
  streak: number
  effort?: Effort | null
  stallSessions?: number
}): { weight: number; base: number; inc: number; streak: number; reason: LoadReason } {
  const { lastSets, plannedSets, topReps, bottomReps, inc, streak, effort } = opts
  const stallAt = opts.stallSessions ?? STALL_SESSIONS
  const work = workSets(lastSets)
  if (!work.length) return { weight: 0, base: 0, inc, streak, reason: 'none' }

  const base = topWeight(lastSets)
  const out = (weight: number, reason: LoadReason) => ({ weight, base, inc, streak, reason })

  // 1) Objectif de reps atteint sur toutes les séries → on monte (double progression).
  //    Y compris à l'échec : toutes les reps visées + plus de réserve, c'est
  //    précisément le moment de charger.
  const targetHit = !!topReps && work.length >= plannedSets && work.every(s => s.r >= topReps)
  if (targetHit) return out(base + inc, 'progress')
  // 2) À l'échec SOUS la fourchette → la charge est trop lourde, on redescend.
  //    Sans borne basse connue, on ne devine pas : on consolide (cas 3).
  if (effort === 'fail' && !!bottomReps && work.some(s => s.r < bottomReps)) {
    return out(Math.max(0, base - inc), 'deload')
  }
  // 3) À l'échec DANS la fourchette → on reste et on va chercher la rep suivante.
  if (effort === 'fail') return out(base, 'keep')
  // 4) C'était facile → on monte même sans avoir atteint le haut de la fourchette.
  if (effort === 'easy') return out(base + inc, 'progress')
  // 5) C'était dur → on consolide, et surtout on ne force PAS la montée de stagnation.
  if (effort === 'hard') return out(base, 'keep')
  // 6) Bloqué à la même charge depuis trop longtemps → on force la montée.
  //    Le cas 3 est passé avant : on ne force jamais la montée sur quelqu'un qui
  //    est déjà à l'échec dans sa fourchette.
  if (streak >= stallAt) return out(base + inc, 'stall')
  return out(base, 'keep')
}

/** Nb de séances récentes consécutives à la même charge max (stagnation). */
export function sameWeightStreak(history: { sets: SetLike[] }[]): number {
  if (!history.length) return 0
  const target = topWeight(history[history.length - 1].sets)
  if (!target) return 0
  let n = 0
  for (let i = history.length - 1; i >= 0; i--) {
    if (topWeight(history[i].sets) === target) n++
    else break
  }
  return n
}

// ─── Records ─────────────────────────────────────────────────────────────────
// Un PR n'est pas seulement une charge max : faire plus de reps à charge égale,
// ou améliorer son 1RM estimé, sont de vraies progressions.
export type PrKind = 'charge' | 'reps' | 'e1rm'

/** Compare une nouvelle séance à l'historique de l'exercice et renvoie les
 *  records battus. Historique vide → aucun PR (pas de « record » au 1er passage). */
export function detectPRs(history: { sets: SetLike[] }[], newSets: SetLike[]): PrKind[] {
  const prev = history.filter(h => workSets(h.sets).length)
  if (!prev.length) return []
  const out: PrKind[] = []

  const prevCharge = Math.max(...prev.map(h => topWeight(h.sets)))
  const newCharge = topWeight(newSets)
  if (newCharge > prevCharge) out.push('charge')

  // Reps à charge égale ou supérieure : on compare le meilleur nombre de reps
  // réalisé à la charge du jour (uniquement si cette charge a déjà été touchée).
  const repsAt = (sets: SetLike[], load: number) => {
    const r = workSets(sets).filter(s => setTop(s) >= load).map(s => (s.w >= load ? s.r : s.r2 ?? 0))
    return r.length ? Math.max(...r) : 0
  }
  const prevRepsAtLoad = Math.max(...prev.map(h => repsAt(h.sets, newCharge)))
  const newRepsAtLoad = repsAt(newSets, newCharge)
  if (prevRepsAtLoad > 0 && newRepsAtLoad > prevRepsAtLoad) out.push('reps')

  const prevE1rm = Math.max(...prev.map(h => e1rmOf(h.sets)))
  const newE1rm = e1rmOf(newSets)
  if (prevE1rm > 0 && newE1rm > prevE1rm) out.push('e1rm')

  return out
}

// ─── Volume par muscle ───────────────────────────────────────────────────────
// Les 3 faisceaux de l'épaule sont distingués : les fondre en « Épaules » masquait
// un déficit d'arrière d'épaule (le point faible le plus courant).
export const MUSCLE_LABELS: Record<string, string> = {
  pecs: 'Pecs',
  'epaules-av': 'Épaules avant',
  'epaules-lat': 'Épaules latérales',
  'epaules-ar': 'Épaules arrière',
  triceps: 'Triceps',
  biceps: 'Biceps',
  'avant-bras': 'Avant-bras',
  abdos: 'Abdos',
  dos: 'Dos',
  lombaires: 'Lombaires',
  quadris: 'Quadris',
  ischios: 'Ischios',
  fessiers: 'Fessiers',
  mollets: 'Mollets',
}
export const muscleLabel = (m: string) => MUSCLE_LABELS[m] || m

// Une série de développé couché n'est pas une série de triceps : le muscle
// principal (1er de la liste) compte 1, les muscles assistants comptent 0,5.
export const PRIMARY_WEIGHT = 1
export const SECONDARY_WEIGHT = 0.5
// Cible hebdomadaire par muscle communément admise pour l'hypertrophie.
export const WEEKLY_TARGET_MIN = 10
export const WEEKLY_TARGET_MAX = 20

/** Séries pondérées par muscle. `entries` = une ligne par exercice réalisé,
 *  avec son nombre de séries de travail. */
export function muscleSetCounts(entries: { muscles: string[]; sets: number }[]): Record<string, number> {
  const out: Record<string, number> = {}
  for (const { muscles, sets } of entries) {
    if (!sets) continue
    muscles.forEach((m, i) => {
      const label = muscleLabel(m)
      const w = i === 0 ? PRIMARY_WEIGHT : SECONDARY_WEIGHT
      out[label] = (out[label] || 0) + sets * w
    })
  }
  // Arrondi à 0,5 près pour éviter les 7.000000001
  for (const k of Object.keys(out)) out[k] = Math.round(out[k] * 2) / 2
  return out
}

export type MuscleStatus = 'low' | 'ok' | 'high'
export function weeklyStatus(sets: number): MuscleStatus {
  if (sets < WEEKLY_TARGET_MIN) return 'low'
  if (sets > WEEKLY_TARGET_MAX) return 'high'
  return 'ok'
}

/** Muscles du programme jamais touchés sur la période — le vrai angle mort.
 *  On les renvoie à 0 pour qu'ils apparaissent dans la liste. */
export function withProgramMuscles(
  counts: Record<string, number>,
  allExercises: Pick<Exercise, 'muscles'>[],
): Record<string, number> {
  const out = { ...counts }
  for (const e of allExercises) for (const m of e.muscles) {
    const l = muscleLabel(m)
    if (!(l in out)) out[l] = 0
  }
  return out
}

// ─── Fatigue & récupération ──────────────────────────────────────────────────
// Trois signaux, tous déjà dans les données : la tendance du volume hebdo,
// la part d'exercices vécus comme durs, et la stagnation simultanée.
// IMPORTANT : la tendance ne se calcule QUE sur des semaines TERMINÉES. Comparer
// la semaine en cours (partielle) à des semaines pleines afficherait une chute
// systématique et donnerait des conseils faux.
export interface WeekStats {
  start: string // lundi de la semaine (ISO)
  sessions: number
  workSets: number
  volume: number
  rated: number // exercices avec un ressenti déclaré
  hard: number // …dont « dur » ou « à l'échec » : les séries menées au bout
}

// Sous ce nombre de ressentis, le ratio n'est pas fiable.
export const HARD_SAMPLE_MIN = 5
export const HARD_RATIO_ALERT = 0.5
export const RAMP_ALERT = 3 // semaines de hausse consécutives avant alerte
export const RECOVERY_COOLDOWN = 6 // on ne redemande pas une décharge avant N semaines
export const RECOVERY_VOLUME_RATIO = 0.7 // semaine allégée = ≤ 70 % du volume habituel
export const MIN_WEEKS_FOR_TREND = 3

/** Semaines de hausse de volume consécutives à la fin de la série (semaines terminées,
 *  de la plus ancienne à la plus récente). */
export function rampWeeks(weeks: WeekStats[]): number {
  let n = 0
  for (let i = weeks.length - 1; i > 0; i--) {
    if (weeks[i].volume > weeks[i - 1].volume && weeks[i].volume > 0) n++
    else break
  }
  return n
}

/** Semaines allégées : volume ≤ 70 % de la moyenne des 4 semaines précédentes.
 *  Une semaine sans séance compte aussi comme une récupération (coupure). */
export function recoveryWeeks(weeks: WeekStats[]): number[] {
  const out: number[] = []
  for (let i = 1; i < weeks.length; i++) {
    const prev = weeks.slice(Math.max(0, i - 4), i)
    const base = prev.reduce((a, w) => a + w.volume, 0) / prev.length
    if (base > 0 && weeks[i].volume <= base * RECOVERY_VOLUME_RATIO) out.push(i)
  }
  return out
}
/** Nb de semaines écoulées depuis la dernière semaine allégée (null = jamais). */
export function weeksSinceRecovery(weeks: WeekStats[]): number | null {
  const idx = recoveryWeeks(weeks)
  return idx.length ? weeks.length - 1 - idx[idx.length - 1] : null
}

export type FatigueLevel = 'unknown' | 'fresh' | 'building' | 'high' | 'deload'
export interface FatigueVerdict {
  level: FatigueLevel
  score: number // 0–100, indicateur composite (pas une mesure physiologique)
  reasons: string[]
  advice: string
  ramp: number
  hardRatio: number | null
  stalled: number
  sinceRecovery: number | null
}

const LEVEL_ADVICE: Record<FatigueLevel, string> = {
  unknown: 'Continue à enregistrer tes séances et à noter le ressenti : il faut environ 3 semaines pour que la tendance soit lisible.',
  fresh: 'Charge bien absorbée. Tu peux continuer à monter les charges normalement.',
  building: 'Accumulation normale. Garde le cap, mais surveille le ressenti sur les gros exercices.',
  high: 'Fatigue marquée. Cette semaine : ne monte pas les charges, arrête chaque série 2 reps avant l\'échec, et allège les sprints.',
  deload: 'Semaine de décharge conseillée : garde les mêmes charges mais coupe ~40 % des séries de travail (4 → 2), stoppe 3 reps avant l\'échec, et remplace les sprints par du footing léger. Tu reprendras plus fort la semaine suivante.',
}

/** Évalue la fatigue accumulée. `weeks` = semaines TERMINÉES (ancienne → récente),
 *  `current` = semaine en cours, utilisée seulement pour le ressenti récent. */
export function assessFatigue(opts: {
  weeks: WeekStats[]
  current: WeekStats
  stalled: number
}): FatigueVerdict {
  const { weeks, current, stalled } = opts
  const ramp = rampWeeks(weeks)
  const sinceRecovery = weeksSinceRecovery(weeks)

  // Ressenti récent : semaine en cours + dernière semaine terminée (~14 jours),
  // pour avoir un échantillon suffisant sans diluer le signal.
  const last = weeks[weeks.length - 1]
  const rated = current.rated + (last?.rated ?? 0)
  const hard = current.hard + (last?.hard ?? 0)
  const hardRatio = rated >= HARD_SAMPLE_MIN ? Math.round((hard / rated) * 100) / 100 : null

  const trained = weeks.filter(w => w.sessions > 0).length
  if (trained < MIN_WEEKS_FOR_TREND) {
    return { level: 'unknown', score: 0, reasons: [], advice: LEVEL_ADVICE.unknown, ramp, hardRatio, stalled, sinceRecovery }
  }

  const reasons: string[] = []
  let score = 0

  const rampPts = Math.min(50, Math.max(0, ramp - 1) * 25)
  if (rampPts) { score += rampPts; reasons.push(`Volume en hausse depuis ${ramp} semaines d'affilée`) }

  if (hardRatio !== null && hardRatio > 0) {
    score += Math.round(hardRatio * 40)
    // Formulation : « poussés au bout » et non « en échec ». `fail` veut dire
    // qu'on est allé à l'échec musculaire, ce qui est une FIN de série voulue, pas
    // un incident. Le compteur, lui, reste juste : une série menée au bout coûte
    // en récupération, qu'elle ait été choisie ou subie.
    if (hardRatio >= HARD_RATIO_ALERT) reasons.push(`${Math.round(hardRatio * 100)} % des exercices poussés au bout récemment (« dur » ou « à l'échec »)`)
  }

  const stallPts = Math.min(30, stalled * 10)
  if (stalled >= 2) { score += stallPts; reasons.push(`${stalled} exercices bloqués à la même charge`) }
  else if (stalled === 1) score += stallPts

  if (sinceRecovery !== null && sinceRecovery >= RECOVERY_COOLDOWN) reasons.push(`Aucune semaine allégée depuis ${sinceRecovery} semaines`)
  if (sinceRecovery === null && weeks.length >= RECOVERY_COOLDOWN) reasons.push('Aucune semaine allégée sur la période observée')

  score = Math.min(100, score)

  let level: FatigueLevel = score >= 75 ? 'deload' : score >= 50 ? 'high' : score >= 25 ? 'building' : 'fresh'
  // Accumulation longue sans décharge → on la conseille même si le score reste sous le seuil.
  if (ramp >= RAMP_ALERT && (sinceRecovery === null || sinceRecovery >= RECOVERY_COOLDOWN)) level = 'deload'
  // Une décharge vient d'avoir lieu : inutile d'en redemander une tout de suite.
  if (sinceRecovery !== null && sinceRecovery <= 1 && (level === 'deload' || level === 'high')) {
    level = 'building'
    reasons.push('Semaine allégée récente prise en compte')
  }

  return { level, score, reasons, advice: LEVEL_ADVICE[level], ramp, hardRatio, stalled, sinceRecovery }
}

export const FATIGUE_LABELS: Record<FatigueLevel, string> = {
  unknown: 'Pas assez de recul',
  fresh: 'Frais',
  building: 'Accumulation',
  high: 'Fatigue marquée',
  deload: 'Décharge conseillée',
}

// ─── Dates ───────────────────────────────────────────────────────────────────
const p2 = (n: number) => String(n).padStart(2, '0')
export const isoOf = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
/** Lundi de la semaine contenant `iso` (dow : 0 = dimanche, comme Date.getDay()). */
export function startOfWeek(iso: string, dow: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() - ((dow + 6) % 7))
  return isoOf(d)
}
/** Décale un ISO de n jours (n négatif = dans le passé). */
export function shiftIso(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00')
  d.setDate(d.getDate() + days)
  return isoOf(d)
}
