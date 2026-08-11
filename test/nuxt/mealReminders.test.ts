import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SLOTS_GYM, SLOTS_REST } from '../../data/nutritionProgram'
import { dueReminders, reminderBody } from '../../composables/useMealReminders'

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
