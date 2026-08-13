import { ref } from 'vue'
import { minutesOf, slotsOf } from '~/lib/nutritionStats'
import type { Slot } from '~/data/nutritionProgram'

// Rappels de repas : une notification à l'heure de chaque prise, relayée à la montre
// par le téléphone.
//
// ─── Ce que cette mécanique peut et ne peut pas faire ──────────────────────────
//
// Il n'y a pas de serveur derrière : pas de Web Push, donc pas de notification
// poussée depuis l'extérieur. Tout se déclenche SUR L'APPAREIL, dans la page.
//
// Il a existé une API faite pour ça — `TimestampTrigger` : on confiait le rappel au
// service worker et il sonnait à l'heure dite, application fermée. Le code la
// détectait et retombait sur un minuteur sinon. Sauf qu'elle n'existe nulle part :
// Chrome a ARRÊTÉ son développement après l'essai d'origine, elle n'a jamais été
// livrée, et aucun autre navigateur ne l'a reprise. La branche « programmé » ne
// s'exécutait donc jamais, et le repli par minuteur était en réalité le seul chemin.
// Elle a été retirée : du code mort qui promet une garantie qu'il ne tient pas coûte
// plus cher qu'il ne rapporte, et il aurait doublonné avec le rattrapage ci-dessous.
//
// ─── Pourquoi un minuteur ne suffit pas ────────────────────────────────────────
//
// Un `setTimeout` posé à 8 h pour 12 h 30 suppose que la page vive quatre heures.
// Elle ne vit pas : Android gèle un onglet en arrière-plan au bout de quelques
// minutes — écran verrouillé compris — et peut l'écarter complètement sous pression
// mémoire. Le minuteur ne tourne pas pendant le gel, et disparaît avec l'onglet
// écarté. D'où des rappels manqués alors que l'application avait bien été ouverte le
// matin.
//
// On ne dépend donc plus d'un minuteur qui doit SURVIVRE, mais de l'HORLOGE : un
// battement régulier compare l'heure qu'il est au programme du jour, et il est
// rejoué à chaque réveil de la page (retour à l'écran, reprise après gel,
// restauration depuis le cache de navigation). Ce qui a été manqué pendant le gel
// part au réveil, en retard et annoncé comme tel, plutôt que de ne jamais partir.
//
// Un rappel n'est rattrapé que s'il était ARMÉ, c'est-à-dire encore à venir la
// dernière fois que l'application a regardé. Activer les rappels à 14 h ne fait donc
// pas sonner le déjeuner de 12 h 30 dans la seconde. L'état du jour est persisté :
// un onglet écarté puis rechargé retrouve ce qu'il devait à l'utilisateur.

const KEY = 'gr-nutri-reminders-v1'
/** Ce que la journée en cours doit encore, et ce qu'elle a déjà donné. */
const DAY_KEY = 'gr-nutri-reminders-day-v1'

export interface ReminderSettings {
  /** Interrupteur général : coupe tout sans perdre le détail par repas. */
  on: boolean
  /** Par identifiant de créneau. Absent = actif, pour qu'un nouveau repas ne passe pas inaperçu. */
  slots: Record<string, boolean>
  /** Combien de minutes AVANT l'heure du repas. 0 = à l'heure pile. */
  lead: number
}

const DEFAULTS: ReminderSettings = { on: false, slots: {}, lead: 0 }

const settings = ref<ReminderSettings>({ ...DEFAULTS, slots: {} })
let hydrated = false

const MINUTES_PER_DAY = 24 * 60
const NOTIF_TAG = 'meal-reminder'
const NOTIF_ICON = '/sport/icon-192.png'
/**
 * Au-delà, un rappel de repas n'a plus d'objet : à 15 h on ne rappelle pas le
 * petit-déjeuner de 9 h, on le laisse passer. Assez large pour couvrir un téléphone
 * resté dans la poche pendant une réunion, assez court pour ne jamais sonner à
 * contretemps.
 */
export const CATCHUP_MINUTES = 90
/** Le battement. Trente secondes d'imprécision sur une heure de repas ne se voient pas. */
const TICK_MS = 30_000

/** Journée en cours : ce qui a été armé, ce qui a déjà sonné. */
interface DayState { date: string, armed: string[], seen: string[] }

/** Le battement et les écouteurs de réveil, à ne poser qu'une fois. */
let ticker: ReturnType<typeof setInterval> | null = null
let wired = false
/**
 * Jour de salle ou non — en FONCTION, pas en valeur figée.
 *
 * Les heures de repas d'un jour de séance ne sont pas celles d'un jour de repos
 * (banane d'avant-séance, déjeuner à 13 h 45 au lieu de 12 h 30). Or la page vit
 * longtemps : entre l'ouverture du matin et le battement de midi, la séance a pu
 * être annulée ou déplacée depuis le calendrier — et il est même possible d'avoir
 * changé de jour. Le battement redemande donc la réponse au lieu de la retenir.
 */
let trainedSource: () => boolean = () => true
const isTrained = () => { try { return trainedSource() } catch { return true } }

function safeParse<T>(raw: string | null, fb: T): T {
  if (!raw) return fb
  try { return JSON.parse(raw) as T }
  catch { return fb }
}

function read(): ReminderSettings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS, slots: {} }
    const p = JSON.parse(raw) as Partial<ReminderSettings>
    return {
      on: p.on === true,
      slots: p.slots && typeof p.slots === 'object' ? p.slots : {},
      // Une avance négative ou absurde ferait sonner le rappel après le repas.
      lead: typeof p.lead === 'number' && p.lead >= 0 && p.lead <= 60 ? p.lead : 0,
    }
  }
  catch { return { ...DEFAULTS, slots: {} } }
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(settings.value)) }
  catch { /* quota ou navigation privée */ }
}

const pad2 = (n: number) => String(n).padStart(2, '0')
const isoOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`

/** L'état du jour, remis à zéro dès qu'on change de date. */
function readDay(date: string): DayState {
  if (!import.meta.client) return { date, armed: [], seen: [] }
  const s = safeParse<Partial<DayState>>(localStorage.getItem(DAY_KEY), {})
  if (s.date !== date || !Array.isArray(s.armed) || !Array.isArray(s.seen)) return { date, armed: [], seen: [] }
  return { date, armed: s.armed, seen: s.seen }
}
function writeDay(s: DayState) {
  if (!import.meta.client) return
  try { localStorage.setItem(DAY_KEY, JSON.stringify(s)) }
  catch { /* quota */ }
}

/** Le libellé affiché dans la notification. Court : sur une montre, c'est tout ce qui rentre. */
export function reminderBody(slot: Slot): string {
  return slot.recipe || slot.from ? `${slot.label} — ${slot.time}` : slot.label
}

/**
 * Tous les rappels d'une journée, dans l'ordre, avec la minute où ils tombent.
 * Fonction pure : c'est elle qu'on teste, le reste n'étant qu'une horloge autour.
 */
export function plannedReminders(
  slots: Slot[],
  enabled: (id: string) => boolean,
  lead = 0,
): { slot: Slot, at: number }[] {
  return slots
    .filter(s => enabled(s.id))
    .map(s => ({ slot: s, at: minutesOf(s.time) - lead }))
    // `minutesOf` rend 9999 sur un horaire illisible, pour l'envoyer en fin de frise.
    // Ici il faut au contraire l'écarter : un créneau sans heure ne peut pas produire
    // un rappel, et 9999 minutes tomberaient six jours plus tard.
    .filter(r => Number.isFinite(r.at) && r.at >= 0 && r.at < MINUTES_PER_DAY)
    .sort((a, b) => a.at - b.at)
}

/**
 * Ceux qui restent à venir. `now` sert à écarter ce qui est déjà passé — replanifier
 * le petit-déjeuner à 17 h ferait sonner le téléphone dans la seconde.
 */
export function dueReminders(
  slots: Slot[],
  enabled: (id: string) => boolean,
  nowMinutes: number,
  lead = 0,
): { slot: Slot, at: number }[] {
  return plannedReminders(slots, enabled, lead).filter(r => r.at > nowMinutes)
}

function supported(): boolean {
  return import.meta.client && 'Notification' in window
}

/**
 * Le service worker, ou rien — mais jamais l'attente infinie.
 *
 * `navigator.serviceWorker.ready` ne se résout QUE lorsqu'un worker actif contrôle
 * la page. Tant qu'il n'y en a pas — première visite, installation en cours,
 * enregistrement qui a échoué — la promesse reste en attente pour toujours. Elle
 * était attendue sans garde au moment d'afficher une notification : un rappel dû
 * partait dans cette attente et n'en revenait jamais, sans erreur ni trace. Pire, il
 * bloquait le passage en revue des créneaux suivants.
 *
 * Deux secondes suffisent largement quand le worker est là ; passé ce délai on
 * notifie sans lui, ce que le navigateur sait faire sur ordinateur.
 */
const REG_TIMEOUT_MS = 2000
async function reg(): Promise<ServiceWorkerRegistration | null> {
  if (!import.meta.client || !('serviceWorker' in navigator)) return null
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>(resolve => setTimeout(() => resolve(null), REG_TIMEOUT_MS)),
    ])
  }
  catch { return null }
}

/**
 * La permission, en `ref` et non en `computed`.
 *
 * `computed(() => Notification.permission)` ne dépend d'aucune source réactive : Vue
 * l'évalue une fois et le mémorise pour toujours. L'écran Profil le lisait à
 * l'affichage — donc `default`, avant qu'on autorise quoi que ce soit —, puis
 * `reschedule()` relisait ce même cache figé, croyait la permission refusée et ne
 * posait AUCUN rappel, pendant que le bouton passait à « Activé ». Le jour où on
 * activait les rappels était donc muet, et tout repartait le lendemain seulement.
 */
const permission = ref<'unsupported' | 'default' | 'granted' | 'denied'>('unsupported')
function refreshStatus() {
  permission.value = supported() ? (Notification.permission as 'default' | 'granted' | 'denied') : 'unsupported'
}

export function useMealReminders() {
  function hydrate() {
    // Hors du garde : la permission peut avoir changé dans les réglages du système
    // depuis la dernière fois, et elle doit être relue à chaque ouverture.
    refreshStatus()
    if (hydrated || !import.meta.client) return
    settings.value = read()
    hydrated = true
  }

  const status = permission

  /** Actif par défaut : un repas ajouté au programme ne doit pas être muet en silence. */
  const isSlotOn = (id: string) => settings.value.slots[id] !== false

  async function enable(): Promise<boolean> {
    if (!supported()) return false
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission() }
      catch { refreshStatus(); return false }
    }
    refreshStatus()
    if (permission.value !== 'granted') return false
    settings.value = { ...settings.value, on: true }
    persist()
    await reschedule()
    return true
  }

  async function disable() {
    settings.value = { ...settings.value, on: false }
    persist()
    await clearScheduled()
  }

  async function toggleSlot(id: string) {
    settings.value = {
      ...settings.value,
      slots: { ...settings.value.slots, [id]: !isSlotOn(id) },
    }
    persist()
    await reschedule()
  }

  async function setLead(min: number) {
    settings.value = { ...settings.value, lead: Math.max(0, Math.min(60, Math.round(min))) }
    persist()
    await reschedule()
  }

  /** Arrête le battement. Rien à fermer côté notifications : celles qui sont
   *  affichées ont été lues ou attendent de l'être, et les effacer les ferait
   *  disparaître sous les yeux de l'utilisateur. */
  async function clearScheduled() {
    if (ticker !== null) { clearInterval(ticker); ticker = null }
  }

  async function show(slot: Slot, lateBy = 0) {
    if (!supported() || Notification.permission !== 'granted') return
    const r = await reg()
    // Un rappel en retard le dit. Le faire passer pour « c'est l'heure » alors qu'il
    // est 13 h 10 pour un repas de 12 h 30, c'est donner une fausse information sur
    // la seule chose qui compte dans un rappel : l'heure.
    const title = lateBy > 0 ? `⏰ Repas en retard de ${lateBy} min` : '🍽️ C\'est l\'heure'
    const opts = {
      body: reminderBody(slot),
      tag: `${NOTIF_TAG}-${slot.id}`,
      icon: NOTIF_ICON,
      badge: NOTIF_ICON,
      renotify: true,
      vibrate: [180, 80, 180],
    } as NotificationOptions
    try {
      if (r?.showNotification) await r.showNotification(title, opts)
      else new Notification(title, opts)
    }
    catch { /* notification refusée en vol */ }
  }

  /**
   * Un battement : compare l'heure qu'il est au programme du jour.
   *
   * Trois cas par créneau, et un seul écrit quelque chose à l'écran :
   *   • encore à venir → on l'ARME (il devient rattrapable s'il est manqué) ;
   *   • passé, armé, dans la fenêtre de rattrapage, jamais sonné → il part, en retard ;
   *   • passé mais jamais armé (rappels activés après coup, journée déjà entamée à
   *     la première ouverture) → on le marque vu, en silence.
   */
  async function runDue(now = new Date()) {
    if (!import.meta.client || !settings.value.on || permission.value !== 'granted') return
    const day = readDay(isoOf(now))
    const nowMin = now.getHours() * 60 + now.getMinutes()
    const planned = plannedReminders(slotsOf(isTrained()), isSlotOn, settings.value.lead)
    let touched = false

    for (const { slot, at } of planned) {
      const id = slot.id
      if (at > nowMin) {
        if (!day.armed.includes(id)) { day.armed.push(id); touched = true }
        continue
      }
      if (day.seen.includes(id)) continue
      const lateBy = nowMin - at
      if (day.armed.includes(id) && lateBy <= CATCHUP_MINUTES) await show(slot, lateBy)
      day.seen.push(id)
      touched = true
    }
    if (touched) writeDay(day)
  }

  /**
   * Branche le battement et les réveils. Une seule fois pour la vie de la page : ce
   * sont des écouteurs sur `document` et `window`, pas sur un composant.
   *
   * `visibilitychange` couvre le retour à l'écran, `pageshow` la restauration depuis
   * le cache de navigation (retour arrière), `focus` le changement d'onglet et
   * `resume` la sortie de gel quand le navigateur l'expose. Aucun n'est garanti sur
   * tous les appareils, et c'est pour ça qu'on les prend tous.
   */
  function wire() {
    if (wired || !import.meta.client) return
    wired = true
    const wake = () => { void runDue() }
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') wake() })
    document.addEventListener('resume', wake)
    window.addEventListener('pageshow', wake)
    window.addEventListener('focus', wake)
  }

  /**
   * (Re)pose les rappels de la journée en cours. Appelée à l'ouverture de
   * l'application et à chaque changement de réglage.
   *
   * Rend le nombre de rappels encore À VENIR — ce qui reste dû aujourd'hui.
   */
  async function reschedule(trained?: boolean | (() => boolean), now = new Date()) {
    refreshStatus()
    // Sans argument, on garde la source en place : rallumer un repas ou changer
    // l'avance ne doit pas faire oublier que la journée est un jour de salle.
    if (trained !== undefined) trainedSource = typeof trained === 'function' ? trained : () => trained
    await clearScheduled()
    if (!settings.value.on || permission.value !== 'granted') return 0

    await runDue(now)
    if (import.meta.client) {
      wire()
      ticker = setInterval(() => { void runDue() }, TICK_MS)
    }

    const nowMin = now.getHours() * 60 + now.getMinutes()
    return dueReminders(slotsOf(isTrained()), isSlotOn, nowMin, settings.value.lead).length
  }

  /** Notification d'essai, pour vérifier que la montre vibre bien. */
  async function test() {
    if (!supported()) return 'unsupported' as const
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission() }
      catch { refreshStatus(); return 'denied' as const }
    }
    refreshStatus()
    if (permission.value !== 'granted') return 'denied' as const
    await show({ id: 'test', time: '', label: 'Essai — ta montre doit vibrer' } as Slot)
    return 'granted' as const
  }

  return {
    settings,
    hydrate,
    status,
    isSlotOn,
    enable,
    disable,
    toggleSlot,
    setLead,
    reschedule,
    clearScheduled,
    runDue,
    test,
  }
}
