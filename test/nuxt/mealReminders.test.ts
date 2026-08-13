import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SLOTS_GYM, SLOTS_REST } from '../../data/nutritionProgram'
import { CATCHUP_MINUTES, dueReminders, plannedReminders, reminderBody } from '../../composables/useMealReminders'

// Rappels de repas.
//
// La logique testable est `dueReminders` : quels rappels poser, à quelle minute,
// compte tenu de l'heure qu'il est et de ce qui est activé. Le reste — permission,
// service worker, TimestampTrigger — dépend d'API navigateur qu'aucun environnement
// de test ne rend fidèlement ; ce qui compte est qu'elles soient toutes gardées par
// une détection de présence, jamais supposées.
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

const load = async () => {
  const { useMealReminders } = await import('../../composables/useMealReminders')
  const m = useMealReminders()
  m.hydrate()
  return m
}

const tous = () => true
const AVANT_TOUT = 0 // minuit : rien n'est encore passé

describe('quels rappels poser', () => {
  it('couvre tous les créneaux d\'un jour de séance', () => {
    const out = dueReminders(SLOTS_GYM, tous, AVANT_TOUT)
    expect(out).toHaveLength(SLOTS_GYM.length)
    expect(out.map(r => r.slot.id)).toContain('lunch')
    expect(out.map(r => r.slot.id)).toContain('pre') // la banane d'avant-séance
  })

  it('n\'a pas de banane les jours sans séance', () => {
    const out = dueReminders(SLOTS_REST, tous, AVANT_TOUT)
    expect(out.map(r => r.slot.id)).not.toContain('pre')
  })

  it('les rend dans l\'ordre de la journée', () => {
    const at = dueReminders(SLOTS_GYM, tous, AVANT_TOUT).map(r => r.at)
    expect(at).toEqual([...at].sort((a, b) => a - b))
  })

  it('écarte ce qui est déjà passé', () => {
    // Rouvrir l'app à 17 h ne doit pas faire sonner le petit-déjeuner dans la seconde.
    const out = dueReminders(SLOTS_GYM, tous, 17 * 60)
    expect(out.map(r => r.slot.id)).not.toContain('pdj')
    expect(out.map(r => r.slot.id)).not.toContain('lunch')
    expect(out.map(r => r.slot.id)).toContain('dinner')
  })

  it('ne pose plus rien une fois le dernier repas passé', () => {
    expect(dueReminders(SLOTS_GYM, tous, 23 * 60 + 30)).toEqual([])
  })

  it('respecte les repas coupés', () => {
    const sansDejeuner = (id: string) => id !== 'lunch'
    const out = dueReminders(SLOTS_GYM, sansDejeuner, AVANT_TOUT)
    expect(out.map(r => r.slot.id)).not.toContain('lunch')
    expect(out).toHaveLength(SLOTS_GYM.length - 1)
  })

  it('avance l\'heure du rappel quand on demande à être prévenu en avance', () => {
    const pile = dueReminders(SLOTS_GYM, tous, AVANT_TOUT, 0)
    const avance = dueReminders(SLOTS_GYM, tous, AVANT_TOUT, 15)
    for (const [i, r] of avance.entries()) expect(r.at).toBe(pile[i].at - 15)
  })

  it('l\'avance ne ressuscite pas un repas déjà passé', () => {
    // Le déjeuner est à 13 h 45. À 13 h 40 avec 15 min d'avance, son rappel serait
    // à 13 h 30 — déjà passé. Il ne doit pas partir.
    const out = dueReminders(SLOTS_GYM, tous, 13 * 60 + 40, 15)
    expect(out.map(r => r.slot.id)).not.toContain('lunch')
  })

  it('ignore un horaire illisible plutôt que de le placer à minuit', () => {
    const casse = [{ id: 'x', time: 'plus tard', label: 'Créneau sans heure' }] as typeof SLOTS_GYM
    // `minutesOf` rend 9999 pour un horaire illisible. Sans garde, le rappel serait
    // posé six jours plus tard ; il doit simplement ne pas exister.
    expect(dueReminders(casse, tous, AVANT_TOUT)).toEqual([])
  })
})

describe('le texte de la notification', () => {
  it('donne le repas et son heure', () => {
    const lunch = SLOTS_GYM.find(s => s.id === 'lunch')!
    expect(reminderBody(lunch)).toContain(lunch.time)
    expect(reminderBody(lunch)).toContain('Déjeuner')
  })
})

describe('réglages', () => {
  it('démarre éteint : on ne demande pas la permission de notifier sans être sollicité', async () => {
    const m = await load()
    expect(m.settings.value.on).toBe(false)
  })

  it('considère un repas comme actif tant qu\'on ne l\'a pas coupé', async () => {
    // Un créneau ajouté au programme plus tard ne doit pas être muet en silence.
    const m = await load()
    expect(m.isSlotOn('lunch')).toBe(true)
    expect(m.isSlotOn('creneau-qui-nexiste-pas-encore')).toBe(true)
  })

  it('retient les repas coupés d\'une session à l\'autre', async () => {
    const m = await load()
    await m.toggleSlot('night')
    expect(m.isSlotOn('night')).toBe(false)

    vi.resetModules()
    const encore = await load()
    expect(encore.isSlotOn('night')).toBe(false)
    expect(encore.isSlotOn('lunch')).toBe(true)
  })

  it('borne l\'avance à des valeurs qui ont un sens', async () => {
    const m = await load()
    await m.setLead(-10)
    expect(m.settings.value.lead).toBe(0) // sinon le rappel sonnerait après le repas
    await m.setLead(999)
    expect(m.settings.value.lead).toBe(60)
    await m.setLead(15)
    expect(m.settings.value.lead).toBe(15)
  })

  it('éteindre garde le détail par repas', async () => {
    // Couper puis rallumer ne doit pas réactiver un repas qu'on avait mis en sourdine.
    const m = await load()
    await m.toggleSlot('night')
    await m.disable()
    expect(m.settings.value.on).toBe(false)
    expect(m.isSlotOn('night')).toBe(false)
  })

  it('survit à un stockage corrompu', async () => {
    localStorage.setItem('gr-nutri-reminders-v1', '{ ceci n est pas du JSON')
    const m = await load()
    expect(m.settings.value.on).toBe(false)
    expect(m.isSlotOn('lunch')).toBe(true)
  })

  it('ne pose rien tant que les notifications ne sont pas autorisées', async () => {
    // Sans permission, `reschedule` doit rendre 0 et ne rien programmer — plutôt que
    // d'échouer en silence en laissant croire que les rappels sont en place.
    const m = await load()
    expect(await m.reschedule(true)).toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Le déclenchement
//
// C'est là que les rappels se perdaient. Trois pannes distinctes, trois familles de
// tests : la permission qu'on relisait dans un cache figé, le minuteur qui mourait
// avec l'onglet gelé, et le rattrapage qui ne devait pas sonner à contretemps.

/** Un `Notification` de laboratoire : on veut savoir CE QUI a été affiché, et quand. */
const shown: { title: string, body: string }[] = []
class FakeNotification {
  static permission: NotificationPermission = 'granted'
  static requestPermission = async () => FakeNotification.permission
  constructor(title: string, opts?: NotificationOptions) {
    shown.push({ title, body: String(opts?.body ?? '') })
  }
}

/** Une heure du 13 août 2026 (un jeudi), pour raisonner en heures rondes. */
const at = (h: number, min = 0) => new Date(2026, 7, 13, h, min, 0, 0)

const armed = () => JSON.parse(localStorage.getItem('gr-nutri-reminders-day-v1') || '{}').armed ?? []

beforeEach(() => {
  shown.length = 0
  FakeNotification.permission = 'granted'
  FakeNotification.requestPermission = async () => FakeNotification.permission
  vi.stubGlobal('Notification', FakeNotification)
})

describe('la permission', () => {
  it('est relue, jamais mémorisée', async () => {
    // La panne : `status` était un `computed` sans dépendance réactive. L'écran
    // Profil le lisait à l'affichage — donc « default » —, puis `reschedule` relisait
    // ce cache figé et ne posait aucun rappel, bouton sur « Activé ». Le jour où on
    // activait les rappels était muet.
    FakeNotification.permission = 'default'
    const m = await load()
    expect(m.status.value).toBe('default') // ce que l'écran de réglages affiche

    FakeNotification.permission = 'granted' // l'utilisateur autorise
    m.settings.value.on = true
    expect(await m.reschedule(false, at(8, 0))).toBeGreaterThan(0)
    expect(m.status.value).toBe('granted')
  })

  it('activer pose les rappels le jour même', async () => {
    FakeNotification.permission = 'default'
    const m = await load()
    void m.status.value // l'écran de réglages est passé par là
    FakeNotification.requestPermission = async () => {
      FakeNotification.permission = 'granted'
      return 'granted' as NotificationPermission
    }
    expect(await m.enable()).toBe(true)
    expect(m.status.value).toBe('granted')
    await m.reschedule(false, at(8, 0))
    expect(armed()).toContain('lunch')
  })
})

describe('le rattrapage', () => {
  const openInTheMorning = async () => {
    const m = await load()
    m.settings.value.on = true
    await m.reschedule(false, at(8, 0)) // l'app est ouverte, tout est encore à venir
    await m.clearScheduled() // …puis le téléphone est verrouillé : plus rien ne tourne
    shown.length = 0
    return m
  }

  it('sonne à l\'heure, sans mention de retard', async () => {
    const m = await openInTheMorning()
    await m.runDue(at(12, 30))
    expect(shown).toHaveLength(1)
    expect(shown[0].title).toContain('C\'est l\'heure')
    expect(shown[0].body).toContain('Déjeuner')
  })

  it('rattrape ce qui a été manqué pendant que l\'onglet dormait', async () => {
    // Le cas réel : app ouverte à 8 h, téléphone verrouillé, repris à 13 h. Le
    // déjeuner de 12 h 30 doit partir — en retard, et en le disant.
    const m = await openInTheMorning()
    await m.runDue(at(13, 0))
    expect(shown).toHaveLength(1)
    expect(shown[0].title).toContain('retard')
    expect(shown[0].title).toContain('30 min')
    expect(shown[0].body).toContain('Déjeuner')
  })

  it('abandonne ce qui est trop vieux plutôt que de sonner à contretemps', async () => {
    // À 13 h, le petit-déjeuner de 9 h est passé depuis quatre heures : il ne doit
    // pas partir. Seul le déjeuner, dans la fenêtre, est rattrapé.
    const m = await openInTheMorning()
    await m.runDue(at(13, 0))
    expect(shown.map(s => s.body).join(' ')).not.toContain('Petit-déjeuner')

    // Et une fois la fenêtre dépassée, le déjeuner lui-même se tait.
    const encore = await openInTheMorning()
    await encore.runDue(at(12, 31 + CATCHUP_MINUTES))
    expect(shown).toEqual([])
  })

  it('ne sonne jamais deux fois pour le même repas', async () => {
    // Le battement tourne toutes les 30 s et chaque réveil de la page en rejoue un :
    // sans mémoire du jour, le déjeuner sonnerait en boucle jusqu'à 13 h.
    const m = await openInTheMorning()
    await m.runDue(at(12, 30))
    await m.runDue(at(12, 31))
    await m.runDue(at(12, 45))
    expect(shown).toHaveLength(1)
  })

  it('ne réveille pas un repas passé quand on active les rappels en pleine journée', async () => {
    // Activer à 14 h ne doit pas faire sonner le déjeuner de 12 h 30 dans la seconde :
    // il n'a jamais été armé, donc il n'y a rien à rattraper.
    const m = await load()
    m.settings.value.on = true
    await m.reschedule(false, at(14, 0))
    await m.runDue(at(14, 1))
    expect(shown).toEqual([])
  })

  it('repart à zéro le lendemain', async () => {
    const m = await openInTheMorning()
    await m.runDue(at(12, 30))
    expect(shown).toHaveLength(1)

    // Le jour suivant : la mémoire du jour est datée, elle ne doit pas museler
    // le déjeuner de demain.
    const demain = new Date(2026, 7, 14, 8, 0)
    await m.reschedule(false, demain)
    shown.length = 0
    await m.runDue(new Date(2026, 7, 14, 12, 30))
    expect(shown).toHaveLength(1)
  })

  it('se tait quand les rappels sont éteints', async () => {
    const m = await openInTheMorning()
    await m.disable()
    await m.runDue(at(12, 30))
    expect(shown).toEqual([])
  })
})

describe('le programme du jour', () => {
  it('garde les repas passés, contrairement à ceux « à venir »', async () => {
    // `plannedReminders` sert au rattrapage : il lui faut TOUTE la journée, y compris
    // ce qui est derrière. `dueReminders` n'en garde que la suite.
    const tousLes = plannedReminders(SLOTS_REST, tous, 0)
    expect(tousLes).toHaveLength(SLOTS_REST.length)
    expect(dueReminders(SLOTS_REST, tous, 17 * 60).length).toBeLessThan(tousLes.length)
  })
})
