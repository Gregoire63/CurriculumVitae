import { computed, ref } from 'vue'
import { PROGRAM } from '~/data/sportProgram'
import type { Exercise, Session } from '~/data/sportProgram'
import { LEGACY_NAMES, allExercises, mergeProgram, retiredExercises } from '~/lib/program'
import type { ExercisePatch, ProgramCustom } from '~/lib/program'

// ─────────────────────────────────────────────────────────────────────────────
// Le programme d'entraînement, désormais modifiable.
// ─────────────────────────────────────────────────────────────────────────────
//
// Même architecture que la bibliothèque de plats : le livré ne bouge pas, les
// modifications vivent à côté, et la fusion se fait à la lecture. C'est ce qui permet
// de revenir en arrière — retirer un patch rend la fiche d'origine — et ce qui rend
// une mise à jour du programme livré compatible avec des modifications déjà faites.
//
// Un exercice RETIRÉ n'est pas supprimé, il est désactivé. Les séances enregistrées
// sont indexées par identifiant d'exercice : le supprimer effacerait des records
// réellement soulevés et rendrait illisibles des mois de journal.

const PATCH_KEY = 'gr-prog-patch-v1' // exercices livrés, modifiés
const ADDED_KEY = 'gr-prog-added-v1' // exercices ajoutés, par séance
const OFF_KEY = 'gr-prog-off-v1' // exercices retirés du programme
const ORDER_KEY = 'gr-prog-order-v1' // ordre voulu, par séance

const patches = ref<Record<string, ExercisePatch>>({})
const added = ref<Record<string, Exercise[]>>({})
const disabled = ref<string[]>([])
const order = ref<Record<string, string[]>>({})

let hydrated = false

function safeParse<T>(raw: string | null, fb: T): T {
  if (!raw) return fb
  try { return JSON.parse(raw) as T }
  catch { return fb }
}
function write(key: string, value: unknown) {
  if (!import.meta.client) return
  try { localStorage.setItem(key, JSON.stringify(value)) }
  catch { /* stockage plein ou indisponible */ }
}

export function useProgram() {
  function hydrate() {
    if (hydrated || !import.meta.client) return
    hydrated = true
    patches.value = safeParse(localStorage.getItem(PATCH_KEY), {})
    added.value = safeParse(localStorage.getItem(ADDED_KEY), {})
    disabled.value = safeParse(localStorage.getItem(OFF_KEY), [])
    order.value = safeParse(localStorage.getItem(ORDER_KEY), {})
  }
  hydrate()

  const custom = computed<ProgramCustom>(() => ({
    patches: patches.value,
    added: added.value,
    disabled: disabled.value,
    order: order.value,
  }))

  /** LE programme, celui que tous les écrans doivent lire. */
  const program = computed<Session[]>(() => mergeProgram(PROGRAM, custom.value))
  const exercises = computed<Exercise[]>(() => allExercises(program.value))
  /** Les mouvements retirés, pour que l'historique garde leurs noms. */
  const retired = computed<Record<string, Exercise>>(() => retiredExercises(PROGRAM, custom.value))

  const sessionById = (id: string | null): Session | null =>
    (id ? program.value.find(s => s.id === id) ?? null : null)
  const exerciseById = (id: string): Exercise | null =>
    exercises.value.find(e => e.id === id) ?? retired.value[id] ?? null
  /**
   * Le nom d'un exercice, RETIRÉS COMPRIS.
   *
   * L'historique est indexé par identifiant : sans repli, une séance de mars
   * afficherait « ext-corde » là où elle affichait « Extension triceps corde ».
   * Tout écran qui montre du passé doit passer par ici.
   */
  const exerciseName = (id: string): string => exerciseById(id)?.name ?? LEGACY_NAMES[id] ?? id

  /** Modifie un exercice existant. Les clés absentes du patch ne sont pas touchées. */
  function patchExercise(exId: string, patch: ExercisePatch) {
    patches.value = { ...patches.value, [exId]: { ...patches.value[exId], ...patch } }
    write(PATCH_KEY, patches.value)
  }
  /** Rend sa fiche d'origine à un exercice livré. */
  function resetExercise(exId: string) {
    const next = { ...patches.value }
    delete next[exId]
    patches.value = next
    write(PATCH_KEY, patches.value)
  }
  function addExercise(sessionId: string, ex: Exercise) {
    added.value = { ...added.value, [sessionId]: [...(added.value[sessionId] ?? []), ex] }
    write(ADDED_KEY, added.value)
    // Un exercice ajouté puis retiré puis réajouté doit réapparaître.
    if (disabled.value.includes(ex.id)) enableExercise(ex.id)
  }
  /** Retire du PROGRAMME, jamais de l'historique. */
  function disableExercise(exId: string) {
    if (disabled.value.includes(exId)) return
    disabled.value = [...disabled.value, exId]
    write(OFF_KEY, disabled.value)
  }
  function enableExercise(exId: string) {
    disabled.value = disabled.value.filter(id => id !== exId)
    write(OFF_KEY, disabled.value)
  }
  function setOrder(sessionId: string, ids: string[]) {
    order.value = { ...order.value, [sessionId]: ids }
    write(ORDER_KEY, order.value)
  }

  function snapshot() {
    return { programme: { patches: patches.value, added: added.value, disabled: disabled.value, order: order.value } }
  }
  /** Restauration TOLÉRANTE : une sauvegarde d'avant cette fonctionnalité passe sans erreur. */
  function restore(data: Record<string, unknown>) {
    const p = data?.programme as ProgramCustom | undefined
    if (!p || typeof p !== 'object') return
    if (p.patches && typeof p.patches === 'object') { patches.value = p.patches; write(PATCH_KEY, patches.value) }
    if (p.added && typeof p.added === 'object') { added.value = p.added; write(ADDED_KEY, added.value) }
    if (Array.isArray(p.disabled)) { disabled.value = p.disabled; write(OFF_KEY, disabled.value) }
    if (p.order && typeof p.order === 'object') { order.value = p.order; write(ORDER_KEY, order.value) }
  }

  return {
    hydrate, program, exercises, retired, custom,
    sessionById, exerciseById, exerciseName,
    patchExercise, resetExercise, addExercise, disableExercise, enableExercise, setOrder,
    snapshot, restore,
  }
}
