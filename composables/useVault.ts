import { computed, ref } from 'vue'
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import type { RawProposal } from '~/lib/proposals'
import { planFor } from '~/lib/proposals'
import { useNutrition } from '~/composables/useNutrition'
import { useTraining } from '~/composables/useTraining'
import { useWorkout } from '~/composables/useWorkout'
import { useProfile } from '~/composables/useProfile'
import { useWithings } from '~/composables/useWithings'
import { useSnapshot } from '~/composables/useSnapshot'
import { setAt as setPointer } from '~/lib/pointer'

// ─────────────────────────────────────────────────────────────────────────────
// Le côté téléphone du coffre.
// ─────────────────────────────────────────────────────────────────────────────
//
// Trois responsabilités, et une seule règle qui les relie : le téléphone reste la
// source de vérité.
//
//  1. Se déverrouiller — passkey, donc biométrie. Rien à retenir, rien à taper.
//  2. Pousser un miroir de ses données, pour que le connecteur ait quelque chose à
//     lire. C'est aussi la sauvegarde automatique qui manquait : l'export manuel
//     existait, mais il fallait y penser.
//  3. Relever les propositions déposées par Claude et les appliquer — seulement
//     celles dont la forme est reconnue, et seulement sur validation.
//
// Ce qui n'est PAS ici, et c'est important : aucune fusion. Le serveur ne renvoie
// jamais de données à réintégrer. Il renvoie des propositions, que l'utilisateur
// accepte ou refuse. Il n'existe donc aucun cas où deux versions d'une séance
// doivent être arbitrées.

export interface VaultState {
  connected: boolean
  registered: boolean
  bootstrapReady: boolean
}

const state = ref<VaultState>({ connected: false, registered: false, bootstrapReady: false })
const pending = ref<RawProposal[]>([])
const recent = ref<RawProposal[]>([])
const mirrorAt = ref<string | null>(null)
const busy = ref(false)
const error = ref<string | null>(null)
let hydrated = false

const LAST_PUSH_KEY = 'gr-vault-push-v1'
/** En dessous, on ne repousse pas : le miroir n'a pas à suivre chaque frappe. */
const PUSH_MIN_INTERVAL_MS = 5 * 60 * 1000

const message = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/^Error:\s*/, '')
}

export function useVault() {
  const nutrition = useNutrition()
  const training = useTraining()
  const workout = useWorkout()
  const profileStore = useProfile()
  const withings = useWithings()
  const { buildSnapshot } = useSnapshot()

  /**
   * Ce que le validateur doit savoir du monde réel.
   *
   * Les deux lecteurs de valeurs (`setAt`, `weightAt`) ne sont pas là pour afficher :
   * ils servent à REFUSER une correction dont la valeur de départ ne correspond pas
   * à ce qui est réellement stocké. C'est ce contrôle qui rend acceptable d'écrire
   * par-dessus une donnée qu'on ne pourra pas reconstituer.
   */
  const ctx = {
    recipeKnown: (id: string) => !!nutrition.library.value.recipes[id],
    foodKnown: (id: string) => !!nutrition.library.value.foods[id],
    setAt: workout.setAt,
    weightAt: workout.weightAt,
    snapshot: buildSnapshot,
  }

  async function hydrate() {
    if (hydrated || !import.meta.client) return
    hydrated = true
    await refresh()
  }

  /** Où en est-on : passkey enregistré ? session ouverte ? */
  async function refresh() {
    try {
      state.value = await $fetch<VaultState>('/api/auth/me')
      if (state.value.connected) await loadPending()
    }
    catch { /* hors ligne : le coffre est un confort, pas une dépendance */ }
  }

  /** Le tout premier passkey, protégé par le code de démarrage. */
  async function register(bootstrap: string): Promise<boolean> {
    busy.value = true; error.value = null
    try {
      const options = await $fetch('/api/auth/challenge', { method: 'POST', body: { mode: 'register' } })
      const response = await startRegistration({ optionsJSON: options as never })
      await $fetch('/api/auth/register', { method: 'POST', body: { bootstrap, response } })
      await refresh()
      return true
    }
    catch (e) { error.value = message(e); return false }
    finally { busy.value = false }
  }

  async function login(): Promise<boolean> {
    busy.value = true; error.value = null
    try {
      const options = await $fetch('/api/auth/challenge', { method: 'POST', body: { mode: 'login' } })
      const response = await startAuthentication({ optionsJSON: options as never })
      await $fetch('/api/auth/login', { method: 'POST', body: { response } })
      await refresh()
      return true
    }
    catch (e) { error.value = message(e); return false }
    finally { busy.value = false }
  }

  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    state.value = { ...state.value, connected: false }
    pending.value = []
  }

  async function loadPending() {
    try {
      const r = await $fetch<{ mirrorAt: string | null, pending: RawProposal[], recent: RawProposal[] }>('/api/vault/pending')
      mirrorAt.value = r.mirrorAt
      pending.value = r.pending
      recent.value = r.recent
    }
    catch { /* session expirée : `refresh` le dira */ }
  }

  /**
   * Pousse l'instantané. `force` contourne l'espacement minimal.
   *
   * Sans espacement, chaque série cochée déclencherait un envoi ; avec, le miroir
   * a au pire quelques minutes de retard — et l'outil `etat` du connecteur donne
   * toujours sa date, pour qu'aucune réponse ne soit construite sur une fraîcheur
   * supposée.
   */
  async function push(snapshot: () => Record<string, unknown>, force = false): Promise<boolean> {
    if (!state.value.connected) return false
    const last = Number(localStorage.getItem(LAST_PUSH_KEY) || 0)
    if (!force && Date.now() - last < PUSH_MIN_INTERVAL_MS) return false
    busy.value = true; error.value = null
    try {
      const r = await $fetch<{ at: string }>('/api/vault/push', { method: 'POST', body: { version: 2, data: snapshot() } })
      mirrorAt.value = r.at
      localStorage.setItem(LAST_PUSH_KEY, String(Date.now()))
      return true
    }
    catch (e) { error.value = message(e); return false }
    finally { busy.value = false }
  }

  /**
   * Applique une proposition — et seulement si sa forme est reconnue.
   *
   * `planFor` rend `null` pour tout ce qui sort des deux gestes fermés ; on refuse
   * alors d'écrire quoi que ce soit plutôt que d'interpréter. L'écriture passe par
   * les mêmes fonctions que l'interface : rien de spécial, donc rien qui puisse
   * diverger de ce qu'un tap fait déjà.
   */
  async function apply(p: RawProposal): Promise<boolean> {
    const plan = planFor(p, ctx)
    if (!plan) { error.value = 'Cette proposition ne peut pas être appliquée automatiquement.'; return false }
    // On passe par les MÊMES fonctions que l'interface : `assign` tient ensemble le
    // planning et la journée alimentaire, donc les calories suivent, que le geste
    // vienne du calendrier ou d'une proposition.
    if (plan.kind === 'plat') { nutrition.setPicked(plan.date, plan.slot, plan.recipeId) }
    else if (plan.kind === 'repas-libre') {
      if (!nutrition.setFreeMeal(plan.date, plan.slot, plan.repas)) {
        error.value = 'Ce repas n\'a pas pu être enregistré.'
        return false
      }
    }
    else if (plan.kind === 'seance') { training.assign(plan.date, plan.sessionId) }
    else if (plan.kind === 'recette') {
      if (plan.id) nutrition.patchRecipe(plan.id, plan.recette)
      else nutrition.addRecipe({ ...plan.recette, custom: true })
    }
    else if (plan.kind === 'semaine-type') {
      plan.seances?.forEach((sid, i) => profileStore.setDay(i, sid))
      plan.salle?.forEach((on, i) => nutrition.setWeekDay(i, 'gym', on))
      plan.teletravail?.forEach((on, i) => nutrition.setWeekDay(i, 'tt', on))
    }
    else if (plan.kind === 'correction-serie') {
      if (!workout.fixSet(plan.exercice, plan.date, plan.index, plan.vers)) {
        error.value = 'La série visée n\'existe plus telle quelle.'
        return false
      }
    }
    else if (plan.kind === 'correction-champ') {
      // On repasse par le chemin d'IMPORT : instantané → modification → restauration
      // complète. Écrire dans localStorage directement laisserait les composables
      // sur leur ancienne valeur en mémoire, et l'écran continuerait d'afficher
      // ce qu'on vient de corriger.
      const snap = buildSnapshot()
      if (!setPointer(snap, plan.chemin, plan.vers)) {
        error.value = 'Ce champ n\'existe plus, ou n\'est pas modifiable.'
        return false
      }
      workout.restoreData(snap)
      profileStore.restore(snap as never)
      nutrition.restore({ nutrition: snap.nutrition } as never)
      withings.restore(snap as never)
    }
    else if (plan.kind === 'correction-pesee') {
      const ok = plan.vers === null
        ? workout.removeBodyWeight(plan.date)
        : (workout.setBodyWeightAt(plan.date, plan.vers), true)
      if (!ok) { error.value = 'Pesée introuvable.'; return false }
    }
    else {
      // Une semaine entière : on CRÉE une semaine nommée plutôt que de réécrire
      // celle en cours. Les semaines livrées doivent rester ce qu'elles sont, et on
      // veut pouvoir revenir en arrière en réappliquant l'ancienne.
      const id = nutrition.createMenu(plan.nom, plan.jours)
      if (!id) { error.value = 'Semaine invalide.'; return false }
      nutrition.applyMenuFrom(plan.lundi, id)
    }
    return resolve(p, 'applied')
  }

  async function resolve(p: RawProposal, status: 'applied' | 'refused'): Promise<boolean> {
    try {
      await $fetch('/api/vault/resolve', { method: 'POST', body: { id: p.id, status } })
      pending.value = pending.value.filter(x => x.id !== p.id)
      recent.value = [{ ...p, status, resolvedAt: new Date().toISOString() }, ...recent.value].slice(0, 10)
      return true
    }
    catch (e) { error.value = message(e); return false }
  }

  /** Applicable d'un tap ? Sert aussi à l'écran, pour ne pas promettre un bouton
   *  qui ne ferait rien. */
  const applicable = (p: RawProposal) => planFor(p, ctx) !== null

  const pendingCount = computed(() => pending.value.length)

  return {
    state, pending, recent, mirrorAt, busy, error, pendingCount,
    hydrate, refresh, register, login, logout, loadPending, push, apply, resolve, applicable, ctx,
  }
}
