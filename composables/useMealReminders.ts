import { computed, ref } from 'vue'
import { minutesOf, slotsOf } from '~/lib/nutritionStats'
import type { Slot } from '~/data/nutritionProgram'

// Rappels de repas : une notification à l'heure de chaque prise, relayée à la montre
// par le téléphone.
//
// ─── Ce que cette mécanique peut et ne peut pas faire ──────────────────────────
//
// Il n'y a pas de serveur derrière : pas de Web Push, donc pas de notification
// poussée depuis l'extérieur. Tout est planifié SUR L'APPAREIL, avec deux moyens :
//
//  1. `TimestampTrigger` — l'API des notifications programmées. Le service worker
//     garde le rappel et l'affiche à l'heure dite, même application fermée. C'est
//     le bon outil, mais il n'existe que sur Chrome/Android et reste expérimental :
//     on teste sa présence, on ne la suppose jamais.
//  2. Un minuteur en repli, qui ne tient que tant que l'onglet vit.
//
// Autrement dit : sur Android avec Chrome, les rappels arrivent même si l'app est
// fermée. Ailleurs, ils n'arrivent que si elle est ouverte quelque part. C'est écrit
// noir sur blanc dans l'écran de réglages — un rappel auquel on se fie et qui ne
// vient pas est pire que pas de rappel du tout.
//
// La replanification se fait à chaque ouverture de l'application et à chaque
// changement de réglage, ce qui suffit à couvrir la journée en cours.

const KEY = 'gr-nutri-reminders-v1'

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
/** Minuteurs du repli, à annuler avant toute replanification. */
let timers: ReturnType<typeof setTimeout>[] = []

const MINUTES_PER_DAY = 24 * 60
const NOTIF_TAG = 'meal-reminder'
const NOTIF_ICON = '/sport/icon-192.png'

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

/** Le libellé affiché dans la notification. Court : sur une montre, c'est tout ce qui rentre. */
export function reminderBody(slot: Slot): string {
  return slot.recipe || slot.from ? `${slot.label} — ${slot.time}` : slot.label
}

/**
 * Les rappels d'une journée, dans l'ordre. Fonction pure : c'est elle qu'on teste,
 * la planification n'étant qu'un `setTimeout` autour.
 *
 * `now` sert à écarter ce qui est déjà passé — replanifier le petit-déjeuner à 17 h
 * ferait sonner le téléphone dans la seconde.
 */
export function dueReminders(
  slots: Slot[],
  enabled: (id: string) => boolean,
  nowMinutes: number,
  lead = 0,
): { slot: Slot, at: number }[] {
  return slots
    .filter(s => enabled(s.id))
    .map(s => ({ slot: s, at: minutesOf(s.time) - lead }))
    // `minutesOf` rend 9999 sur un horaire illisible, pour l'envoyer en fin de frise.
    // Ici il faut au contraire l'écarter : un créneau sans heure ne peut pas produire
    // un rappel, et 9999 minutes tomberaient six jours plus tard.
    .filter(r => Number.isFinite(r.at) && r.at > nowMinutes && r.at < MINUTES_PER_DAY)
    .sort((a, b) => a.at - b.at)
}

function supported(): boolean {
  return import.meta.client && 'Notification' in window
}

/** L'API des notifications programmées est-elle là ? Chrome/Android uniquement à ce jour. */
export function canSchedule(): boolean {
  return import.meta.client && 'showTrigger' in (window.Notification?.prototype ?? {})
}

async function reg(): Promise<ServiceWorkerRegistration | null> {
  if (!import.meta.client || !('serviceWorker' in navigator)) return null
  try { return await navigator.serviceWorker.ready }
  catch { return null }
}

export function useMealReminders() {
  function hydrate() {
    if (hydrated || !import.meta.client) return
    settings.value = read()
    hydrated = true
  }

  const status = computed<'unsupported' | 'default' | 'granted' | 'denied'>(() =>
    (supported() ? (Notification.permission as 'default' | 'granted' | 'denied') : 'unsupported'))

  /** Actif par défaut : un repas ajouté au programme ne doit pas être muet en silence. */
  const isSlotOn = (id: string) => settings.value.slots[id] !== false

  async function enable(): Promise<boolean> {
    if (!supported()) return false
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission() }
      catch { return false }
    }
    if (Notification.permission !== 'granted') return false
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

  /** Retire tout ce qui était en attente : les minuteurs ET les rappels programmés. */
  async function clearScheduled() {
    for (const t of timers) clearTimeout(t)
    timers = []
    const r = await reg()
    if (!r) return
    try {
      // `includeTriggered: false` ne rend que ceux qui n'ont pas encore sonné : fermer
      // une notification déjà affichée l'effacerait sous les yeux de l'utilisateur.
      const pending = await r.getNotifications({ tag: NOTIF_TAG, includeTriggered: false } as GetNotificationOptions)
      for (const n of pending) n.close()
    }
    catch { /* getNotifications sans includeTriggered : rien à nettoyer */ }
  }

  async function show(slot: Slot) {
    if (!supported() || Notification.permission !== 'granted') return
    const r = await reg()
    const opts = {
      body: reminderBody(slot),
      tag: `${NOTIF_TAG}-${slot.id}`,
      icon: NOTIF_ICON,
      badge: NOTIF_ICON,
      renotify: true,
      vibrate: [180, 80, 180],
    } as NotificationOptions
    try {
      if (r?.showNotification) await r.showNotification('🍽️ C\'est l\'heure', opts)
      else new Notification('🍽️ C\'est l\'heure', opts)
    }
    catch { /* notification refusée en vol */ }
  }

  /**
   * (Re)pose les rappels de la journée en cours.
   *
   * Appelée à l'ouverture de l'application et à chaque changement de réglage. On
   * efface avant de reposer : sans ça, deux ouvertures dans la journée donneraient
   * deux notifications par repas.
   */
  async function reschedule(trained = true, now = new Date()) {
    await clearScheduled()
    if (!settings.value.on || status.value !== 'granted') return 0

    const nowMin = now.getHours() * 60 + now.getMinutes()
    const due = dueReminders(slotsOf(trained), isSlotOn, nowMin, settings.value.lead)
    if (!due.length) return 0

    const r = await reg()
    if (canSchedule() && r?.showNotification) {
      for (const { slot, at } of due) {
        const when = new Date(now)
        when.setHours(Math.floor(at / 60), at % 60, 0, 0)
        try {
          await r.showNotification('🍽️ C\'est l\'heure', {
            body: reminderBody(slot),
            tag: `${NOTIF_TAG}-${slot.id}`,
            icon: NOTIF_ICON,
            badge: NOTIF_ICON,
            // @ts-expect-error TimestampTrigger n'est pas dans les types DOM
            showTrigger: new window.TimestampTrigger(when.getTime()),
          } as NotificationOptions)
        }
        catch { /* refusé : on retombe sur le minuteur ci-dessous */ }
      }
      return due.length
    }

    for (const { slot, at } of due) {
      const delay = (at - nowMin) * 60_000
      // Au-delà de ~24 jours, setTimeout déborde et se déclenche immédiatement. On ne
      // planifie jamais si loin, mais la garde coûte une ligne.
      if (delay <= 0 || delay > 86_400_000) continue
      timers.push(setTimeout(() => { void show(slot) }, delay))
    }
    return due.length
  }

  /** Notification d'essai, pour vérifier que la montre vibre bien. */
  async function test() {
    if (!supported()) return 'unsupported' as const
    if (Notification.permission === 'default') {
      try { await Notification.requestPermission() }
      catch { return 'denied' as const }
    }
    if (Notification.permission !== 'granted') return 'denied' as const
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
    test,
    canSchedule,
  }
}
