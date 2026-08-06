// @vitest-environment nuxt
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Ces tests couvrent le CÂBLAGE du module nutrition (localStorage, aller-retour
// d'écriture, export/import), pas les calculs — ceux-là sont dans
// test/unit/nutritionStats.test.ts.
// Le composable garde son état au niveau du module : on réimporte à neuf à chaque
// test pour repartir d'une hydratation propre.
beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

const load = async () => {
  const { useNutrition } = await import('../../composables/useNutrition')
  const n = useNutrition()
  n.hydrate()
  return n
}

describe('cycle de 14 jours', () => {
  it('donne une position sans qu\'il y ait rien à démarrer', async () => {
    const n = await load()
    expect(n.indexFor('2026-08-06')).toBeGreaterThanOrEqual(0)
    expect(n.indexFor('2026-08-06')).toBeLessThan(14)
  })
})

describe('semaine type', () => {
  it('place les séances lundi, mardi, jeudi, vendredi et le télétravail mardi et vendredi', async () => {
    const n = await load()
    const week = ['2026-08-03', '2026-08-04', '2026-08-05', '2026-08-06', '2026-08-07', '2026-08-08', '2026-08-09']
    expect(week.map(d => n.dayFor(d).gym)).toEqual([true, true, false, true, true, false, false])
    expect(week.map(d => n.dayFor(d).tt)).toEqual([false, true, false, false, true, false, false])
  })

  it('modifie la semaine type et la relit après rechargement', async () => {
    const n = await load()
    n.setWeekDay(2, 'tt', true) // mercredi en télétravail
    expect(n.dayFor('2026-08-05').tt).toBe(true)

    vi.resetModules()
    const again = await load()
    expect(again.dayFor('2026-08-05').tt).toBe(true)
    again.resetWeek()
    expect(again.dayFor('2026-08-05').tt).toBe(false)
  })
})

describe('exceptions du jour', () => {
  it('surcharge la semaine type pour une date, sans la modifier', async () => {
    const n = await load()
    expect(n.dayFor('2026-08-03').gym).toBe(true)

    n.setOverride('2026-08-03', { gym: false })
    expect(n.dayFor('2026-08-03').gym).toBe(false)
    // La semaine type n'a pas bougé : c'est bien la journée qui s'adapte.
    expect(n.week.value.gym[0]).toBe(true)
    expect(n.hasOverride('2026-08-03')).toBe(true)

    n.clearOverride('2026-08-03')
    expect(n.dayFor('2026-08-03').gym).toBe(true)
  })

  it('mémorise les pas du jour et sait les effacer', async () => {
    const n = await load()
    n.setSteps('2026-08-06', 9400)
    expect(n.stepsFor('2026-08-06')).toBe(9400)
    n.setSteps('2026-08-06', null)
    expect(n.stepsFor('2026-08-06')).toBeNull()
    // Plus rien à surcharger : l'exception disparaît au lieu de rester vide.
    expect(n.hasOverride('2026-08-06')).toBe(false)
  })

  it('permet d\'imposer un plat sur une date', async () => {
    const n = await load()
    n.setOverride('2026-08-06', { dinner: 'din-saumon' })
    expect(n.dayFor('2026-08-06').menu.dinner).toBe('din-saumon')
  })
})

describe('bibliothèque', () => {
  it('crée un aliment et le rend disponible dans les plats', async () => {
    const n = await load()
    const id = n.addFood({ name: 'Skyr nature', cat: 'laitiers', kcal: 64, p: 11, g: 4, l: 0.2 })
    expect(id).toBe('skyr-nature')
    expect(n.library.value.foods[id].name).toBe('Skyr nature')
    expect(n.isCustomFood(id)).toBe(true)
  })

  it('modifie un aliment livré et sait revenir à l\'original', async () => {
    const n = await load()
    const before = n.library.value.foods['filet-de-poulet'].kcal
    n.patchFood('filet-de-poulet', { kcal: 125 })
    expect(n.library.value.foods['filet-de-poulet'].kcal).toBe(125)
    n.resetFood('filet-de-poulet')
    expect(n.library.value.foods['filet-de-poulet'].kcal).toBe(before)
  })

  it('crée un plat, le retrouve après rechargement, et le supprime', async () => {
    const n = await load()
    const id = n.addRecipe({ name: 'Poke bowl', kind: 'boite', batch: true, steps: '', items: [{ food: 'saumon', g: 150 }] })
    expect(n.library.value.recipes[id].name).toBe('Poke bowl')

    vi.resetModules()
    const again = await load()
    expect(again.library.value.recipes[id]).toBeDefined()
    again.removeRecipe(id)
    expect(again.library.value.recipes[id]).toBeUndefined()
  })

  it('met un plat de côté sans le supprimer', async () => {
    const n = await load()
    n.toggleRecipeActive('din-saumon')
    expect(n.isRecipeActive('din-saumon')).toBe(false)
    expect(n.library.value.recipes['din-saumon']).toBeDefined()
    expect(n.library.value.recipes['din-saumon'].disabled).toBe(true)
  })
})

describe('séance annulée', () => {
  // Régression : sans réduction, une séance annulée laisserait la journée à ~2 200 kcal
  // pour une dépense de jour de repos — le déficit de la semaine y passe.
  it('fait réellement baisser les calories de la journée', async () => {
    const n = await load()
    const { buildDay } = await import('../../lib/nutritionStats')
    const before = buildDay(n.indexFor('2026-08-03')!, n.dayFor('2026-08-03').gym).total.kcal
    n.setOverride('2026-08-03', { gym: false })
    const after = buildDay(n.indexFor('2026-08-03')!, n.dayFor('2026-08-03').gym).total.kcal
    expect(before - after).toBeGreaterThan(150)
  })
})

describe('repas hors plan', () => {
  it('ajoute un extra avec son heure et sait le retirer', async () => {
    const n = await load()
    const id = n.addExtra('2026-08-06', { label: 'Restaurant', kcal: 850, p: 40, g: 70, l: 35, time: '20:30' })
    expect(n.extrasFor('2026-08-06')).toHaveLength(1)
    expect(n.extrasFor('2026-08-06')[0].time).toBe('20:30')

    vi.resetModules()
    const again = await load()
    expect(again.extrasFor('2026-08-06')).toHaveLength(1)
    again.removeExtra('2026-08-06', id)
    expect(again.extrasFor('2026-08-06')).toHaveLength(0)
  })
})

describe('repas cochés', () => {
  it('mémorise les repas pris jour par jour', async () => {
    const n = await load()
    n.toggleEaten('2026-08-06', 'pdj')
    n.toggleEaten('2026-08-06', 'lunch')
    n.toggleEaten('2026-08-07', 'pdj')
    expect(n.eatenCount('2026-08-06')).toBe(2)
    expect(n.eatenCount('2026-08-07')).toBe(1)
    expect(n.isEaten('2026-08-06', 'dinner')).toBe(false)

    n.toggleEaten('2026-08-06', 'pdj')
    expect(n.eatenCount('2026-08-06')).toBe(1)
  })
})

describe('prix et panier', () => {
  it('enregistre un prix au kilo et l\'arrondit au centime', async () => {
    const n = await load()
    n.setPrice('filet-de-poulet', 9.876)
    expect(n.prices.value['filet-de-poulet']).toBe(9.88)
  })

  it('efface le prix quand la saisie est vidée ou invalide', async () => {
    const n = await load()
    n.setPrice('filet-de-poulet', 10)
    n.setPrice('filet-de-poulet', null)
    expect(n.prices.value['filet-de-poulet']).toBeUndefined()
    n.setPrice('saumon', -3)
    expect(n.prices.value.saumon).toBeUndefined()
  })

  it('calcule le total de la fenêtre de courses à partir des prix saisis', async () => {
    const n = await load()
    const list = n.shoppingWindow('2026-08-03', 7)
    expect(list.length).toBeGreaterThan(0)

    const { total: empty, missing } = n.cost(list)
    expect(empty).toBe(0)
    expect(missing.length).toBeGreaterThan(0)

    for (const s of list) for (const l of s.lines) n.setPrice(l.food.id, 10)
    const { total, missing: none } = n.cost(list)
    expect(none).toHaveLength(0)
    expect(total).toBeGreaterThan(0)
  })

  it('archive un panier et le relit', async () => {
    const n = await load()
    n.addBasket(87.4, 7, '2026-08-03')
    expect(n.baskets.value[0]).toEqual({ date: '2026-08-03', total: 87.4, days: 7 })

    vi.resetModules()
    const again = await load()
    expect(again.baskets.value).toHaveLength(1)
    again.removeBasket(0)
    expect(again.baskets.value).toHaveLength(0)
  })

  it('refuse un panier à zéro', async () => {
    const n = await load()
    n.addBasket(0, 7, '2026-08-03')
    expect(n.baskets.value).toHaveLength(0)
  })
})

describe('batch cooking', () => {
  it('coche et réinitialise les tâches d\'une session sans toucher à l\'autre', async () => {
    const n = await load()
    n.toggleBatch('2026-08-03:dim:0')
    n.toggleBatch('2026-08-03:dim:1')
    n.toggleBatch('2026-08-03:mer:0')
    expect(n.isBatchDone('2026-08-03:dim:0')).toBe(true)

    n.resetBatch('2026-08-03:dim:')
    expect(n.isBatchDone('2026-08-03:dim:0')).toBe(false)
    expect(n.isBatchDone('2026-08-03:mer:0')).toBe(true)
  })
})

describe('mode de préparation', () => {
  it('part sur les féculents à part, le mode le plus souple', async () => {
    const n = await load()
    expect(n.prepMode.value).toBe('separate')
  })

  it('mémorise le passage en boîtes assemblées', async () => {
    const n = await load()
    n.setPrepMode('assembled')
    expect(localStorage.getItem('gr-nutri-prep-v1')).toBe('assembled')

    vi.resetModules()
    const again = await load()
    expect(again.prepMode.value).toBe('assembled')
  })

  it('ignore une valeur stockée invalide', async () => {
    localStorage.setItem('gr-nutri-prep-v1', 'nimportequoi')
    const n = await load()
    expect(n.prepMode.value).toBe('separate')
  })
})

describe('sauvegarde', () => {
  it('exporte et restaure l\'intégralité de l\'état', async () => {
    const n = await load()
    n.setPrice('saumon', 18.5)
    n.toggleChecked('saumon')
    n.setOverride('2026-08-04', { gym: false, steps: 9000 })
    n.toggleEaten('2026-08-04', 'pdj')
    n.addExtra('2026-08-04', { label: 'Resto', kcal: 700, p: 0, g: 0, l: 0 })
    n.addFood({ name: 'Mon skyr', cat: 'laitiers', kcal: 64, p: 11, g: 4, l: 0.2 })
    n.addBasket(50, 7, '2026-08-03')
    n.setPrepMode('assembled')
    const snapshot = JSON.parse(JSON.stringify(n.exportData()))

    localStorage.clear()
    vi.resetModules()
    const fresh = await load()
    fresh.restore({ nutrition: snapshot })

    expect(fresh.prices.value.saumon).toBe(18.5)
    expect(fresh.isChecked('saumon')).toBe(true)
    expect(fresh.dayFor('2026-08-04').gym).toBe(false)
    expect(fresh.stepsFor('2026-08-04')).toBe(9000)
    expect(fresh.extrasFor('2026-08-04')).toHaveLength(1)
    expect(fresh.library.value.foods['mon-skyr']).toBeDefined()
    expect(fresh.isEaten('2026-08-04', 'pdj')).toBe(true)
    expect(fresh.baskets.value).toHaveLength(1)
    expect(fresh.prepMode.value).toBe('assembled')
  })

  it('accepte une sauvegarde ancienne sans bloc nutrition', async () => {
    const n = await load()
    expect(() => n.restore({})).not.toThrow()
  })

  // Les sauvegardes de la version précédente stockaient les séances annulées à part.
  it('convertit une ancienne liste de jours annulés en exceptions', async () => {
    const n = await load()
    n.restore({ nutrition: { skipped: ['2026-08-03'] } })
    expect(n.dayFor('2026-08-03').gym).toBe(false)
  })
})
