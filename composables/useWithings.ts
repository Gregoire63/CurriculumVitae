import { computed, ref } from 'vue'
import { useWorkout } from './useWorkout'
import type { ActivityDay, BodyEntry } from '../lib/withings'
import { composition, dailySeries, mergeEntries, parseActivity, parseGroup, suspectsOf, weeklySlope } from '../lib/withings'

// Connexion à la balance Withings Body Smart.
//
// Même principe que le reste de /sport : état au niveau du module (pas de Pinia),
// hydratation explicite côté client, persistance localStorage. Les jetons restent
// sur l'appareil ; seul le client_secret vit sur le serveur, dans server/api/withings/.

const TOK_KEY = 'gr-withings-tok-v1'
const BODY_KEY = 'gr-withings-body-v1'
const ACT_KEY = 'gr-withings-act-v1'
const SYNC_KEY = 'gr-withings-sync-v1'
// Clé de l'ancien suivi de poids du module séances, absorbée une fois pour toutes.
const LEGACY_BW_KEY = 'gr-bodyweight-v1'
const MIGRATED_KEY = 'gr-withings-migr-v1'

export interface WithingsTokens {
  accessToken: string
  refreshToken: string
  expiresAt?: number
  userid?: string
}

const tokens = ref<WithingsTokens | null>(null)
const entries = ref<BodyEntry[]>([])
const activity = ref<ActivityDay[]>([])
const lastSync = ref<number>(0) // epoch (s) du dernier `updatetime` Withings
const syncing = ref(false)
const syncError = ref<string | null>(null)
let hydrated = false

function safeParse<T>(raw: string | null, fb: T): T {
  if (!raw) return fb
  try { return JSON.parse(raw) as T }
  catch { return fb }
}
function write(key: string, value: unknown) {
  if (!import.meta.client) return
  try { localStorage.setItem(key, JSON.stringify(value)) }
  catch { /* quota ou navigation privée : on continue sans persister */ }
}

export function useWithings() {
  function hydrate() {
    if (hydrated || !import.meta.client) return
    tokens.value = safeParse<WithingsTokens | null>(localStorage.getItem(TOK_KEY), null)
    entries.value = safeParse<BodyEntry[]>(localStorage.getItem(BODY_KEY), [])
    activity.value = safeParse<ActivityDay[]>(localStorage.getItem(ACT_KEY), [])
    lastSync.value = safeParse<number>(localStorage.getItem(SYNC_KEY), 0)
    absorbLegacy()
    hydrated = true
  }

  /**
   * Le poids se saisissait autrefois dans l'onglet Profil, dans son propre stockage.
   * Deux historiques du même chiffre, c'était une pesée notée à un endroit et absente
   * de l'autre. On absorbe l'ancien une seule fois, en saisie manuelle, sans écraser
   * ce qui existe déjà ici — la balance reste prioritaire sur une saisie à la main.
   */
  function absorbLegacy() {
    if (localStorage.getItem(MIGRATED_KEY)) return
    const old = safeParse<{ date: string, kg: number }[]>(localStorage.getItem(LEGACY_BW_KEY), [])
    const known = new Set(entries.value.map(e => e.date))
    const add = old
      .filter(e => e && e.date && e.kg > 0 && !known.has(e.date))
      .map(e => ({ date: e.date, at: `${e.date}T07:00`, kg: e.kg, source: 'manual' as const }))
    if (add.length) {
      entries.value = mergeEntries(entries.value, add)
      write(BODY_KEY, entries.value)
    }
    mirror()
    try { localStorage.setItem(MIGRATED_KEY, '1') }
    catch { /* stockage indisponible : on retentera au prochain démarrage */ }
  }

  /**
   * Recopie les pesées retenues dans la série simple du module séances.
   *
   * Import à sens unique : useWorkout n'a aucune connaissance d'ici, donc pas de
   * cycle. Le miroir existe parce que le métabolisme de base, le lest des exercices
   * au poids du corps et l'export lisent tous cette série-là — les faire pointer
   * ici un par un multiplierait les endroits à ne pas oublier.
   *
   * Les pesées en quarantaine sont exclues : c'est tout l'intérêt de les filtrer.
   */
  function mirror() {
    const { setBodyWeightAt } = useWorkout()
    const bad = new Set(suspectsOf(entries.value).map(e => e.at))
    // Une pesée par jour : la dernière du jour l'emporte, comme dans les courbes.
    const byDay = new Map<string, number>()
    for (const e of entries.value) {
      if (!bad.has(e.at)) byDay.set(e.date, e.kg)
    }
    for (const [date, kg] of byDay) setBodyWeightAt(date, kg)
  }

  const connected = computed(() => !!tokens.value?.accessToken)

  /** Enregistre les jetons renvoyés par /api/withings/callback (query string). */
  function adoptFromQuery(q: Record<string, unknown>): boolean {
    const access = typeof q.access_token === 'string' ? q.access_token : ''
    const refresh = typeof q.refresh_token === 'string' ? q.refresh_token : ''
    if (!access || !refresh) return false
    tokens.value = {
      accessToken: access,
      refreshToken: refresh,
      expiresAt: Number(q.expires_at) || undefined,
      userid: typeof q.userid === 'string' ? q.userid : undefined,
    }
    write(TOK_KEY, tokens.value)
    return true
  }

  function connect() {
    if (import.meta.client) window.location.href = '/api/withings/authorize'
  }

  function disconnect() {
    tokens.value = null
    if (import.meta.client) {
      try { localStorage.removeItem(TOK_KEY) }
      catch { /* ignore */ }
    }
    // Les mesures déjà récupérées restent : elles sont à toi, pas à Withings.
  }

  /** Saisie manuelle, pour les jours sans balance ou avant de l'avoir reçue. */
  function addManual(kg: number, date: string, at?: string) {
    if (!(kg > 0)) return
    const stamp = at || `${date}T07:00`
    entries.value = mergeEntries(entries.value, [{ date, at: stamp, kg: Math.round(kg * 100) / 100, source: 'manual' }])
    write(BODY_KEY, entries.value)
    mirror()
  }

  function removeEntry(at: string) {
    entries.value = entries.value.filter(e => e.at !== at)
    write(BODY_KEY, entries.value)
    mirror()
  }

  /**
   * « C'est bien moi » : lève la quarantaine. Le drapeau est persisté, sinon la
   * pesée serait remise en doute à chaque ouverture — et une vraie perte de poids
   * rapide deviendrait insupportable à valider tous les jours.
   */
  function confirmEntry(at: string) {
    entries.value = entries.value.map(e => (e.at === at ? { ...e, confirmed: true, suspect: false } : e))
    write(BODY_KEY, entries.value)
    mirror()
  }

  /**
   * Rapatrie les nouvelles mesures. `full` refait les 90 jours (utile après un
   * import ou si la balance a corrigé une pesée) ; sinon on repart du dernier
   * `updatetime`, ce que Withings attend pour ne renvoyer que le delta.
   */
  async function sync(opts: { full?: boolean } = {}): Promise<boolean> {
    if (!tokens.value || syncing.value) return false
    syncing.value = true
    syncError.value = null
    try {
      const res = await $fetch<{
        groups: { date: number, measures: { value: number, type: number, unit: number }[] }[]
        activity: { date: string, steps?: number, distance?: number, calories?: number }[]
        updatetime: number
        tokens: { accessToken: string, refreshToken: string, expiresIn: number } | null
      }>('/api/withings/sync', {
        method: 'POST',
        body: {
          accessToken: tokens.value.accessToken,
          refreshToken: tokens.value.refreshToken,
          since: opts.full ? 0 : lastSync.value || 0,
        },
      })

      if (res.tokens) {
        tokens.value = {
          ...tokens.value,
          accessToken: res.tokens.accessToken,
          refreshToken: res.tokens.refreshToken,
          expiresAt: Math.floor(Date.now() / 1000) + res.tokens.expiresIn,
        }
        write(TOK_KEY, tokens.value)
      }

      const fresh = (res.groups || []).map(g => parseGroup(g)).filter((e): e is BodyEntry => !!e)
      if (fresh.length) {
        entries.value = mergeEntries(entries.value, fresh)
        write(BODY_KEY, entries.value)
        mirror()
      }

      const acts = parseActivity(res.activity || [])
      if (acts.length) {
        const byDate = new Map(activity.value.map(a => [a.date, a]))
        for (const a of acts) byDate.set(a.date, a)
        activity.value = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date))
        write(ACT_KEY, activity.value)
      }

      lastSync.value = res.updatetime || Math.floor(Date.now() / 1000)
      write(SYNC_KEY, lastSync.value)
      return true
    }
    catch (e) {
      const msg = (e as { data?: { statusMessage?: string }, message?: string })
      syncError.value = msg?.data?.statusMessage || msg?.message || 'Synchronisation impossible.'
      return false
    }
    finally {
      syncing.value = false
    }
  }

  // ─── Lectures dérivées ──────────────────────────────────────────────────
  /** Pesées mises de côté parce qu'elles ne collent pas à la tendance. */
  const suspects = computed(() => suspectsOf(entries.value))
  const suspectAts = computed(() => new Set(suspects.value.map(e => e.at)))
  // La dernière pesée RETENUE : afficher un poids en quarantaine en gros chiffre
  // reviendrait à mettre en avant celui de quelqu'un d'autre.
  const latest = computed<BodyEntry | null>(
    () => [...entries.value].reverse().find(e => !suspectAts.value.has(e.at)) ?? null,
  )
  const weightSeries = computed(() => dailySeries(entries.value, 'kg'))
  const slope = computed(() => weeklySlope(weightSeries.value))
  const comp = computed(() => composition(entries.value))
  const stepsByDate = computed(() => Object.fromEntries(activity.value.map(a => [a.date, a.steps])))
  const stepsFor = (iso: string): number | null => {
    const s = stepsByDate.value[iso]
    return typeof s === 'number' ? s : null
  }
  /**
   * Poids connu le plus proche (avant ou égal) d'une date : sert aux calculs d'énergie.
   * Les pesées en quarantaine sont ignorées — elles fausseraient le métabolisme de base,
   * donc la cible calorique de la journée.
   */
  function weightAt(iso: string): number | null {
    const kept = entries.value.filter(e => !suspectAts.value.has(e.at))
    const before = kept.filter(e => e.date <= iso)
    if (before.length) return before.at(-1)!.kg
    return kept.length ? kept[0].kg : null
  }

  /** Sauvegarde/restauration, branchées sur l'export JSON existant. */
  function snapshot() {
    return { withingsBody: entries.value, withingsActivity: activity.value }
  }
  function restore(data: Record<string, unknown>) {
    if (Array.isArray(data.withingsBody)) {
      entries.value = mergeEntries([], data.withingsBody as BodyEntry[])
      write(BODY_KEY, entries.value)
      mirror()
    }
    if (Array.isArray(data.withingsActivity)) {
      activity.value = data.withingsActivity as ActivityDay[]
      write(ACT_KEY, activity.value)
    }
  }

  return {
    hydrate, connected, tokens, connect, disconnect, adoptFromQuery,
    entries, activity, latest, syncing, syncError, lastSync,
    sync, addManual, removeEntry, confirmEntry, suspects, suspectAts, mirror,
    weightSeries, slope, comp, stepsFor, weightAt,
    snapshot, restore,
  }
}
