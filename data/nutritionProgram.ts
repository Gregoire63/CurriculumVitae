// Données du plan nutrition : table des aliments, recettes et cycle de 14 jours.
// Générées à partir du plan calculé (valeurs Ciqual/USDA arrondies, ±5 % d'incertitude —
// sans importance tant que l'ajustement se fait sur la balance et pas sur le tableur).
// Les grammages ci-dessous sont ceux d'un JOUR AVEC SÉANCE : la modulation des féculents
// pour les jours sans séance est calculée dans lib/nutritionStats.ts, jamais stockée.

export type MicroKey = 'fib' | 'ca' | 'fe' | 'mg' | 'zn' | 'k' | 'vc' | 'vd' | 'o3' | 'b9'

export type FoodCat = 'viandes' | 'oeufs' | 'laitiers' | 'complements' | 'feculents' | 'legumes' | 'fruits' | 'grasses'

// Valeurs pour 100 g. Viandes, poissons et féculents : TOUJOURS pesés crus.
export interface Food {
  id: string
  name: string
  cat: FoodCat
  kcal: number
  p: number // protéines (g)
  g: number // glucides (g)
  l: number // lipides (g)
  buy?: string // repère d'achat / de pesée affiché dans la liste de courses
  custom?: boolean // ajouté par l'utilisateur depuis l'emballage
  micro?: Partial<Record<MicroKey, number>> // micronutriments pour 100 g (voir MICRO_REFS)
  /**
   * Jours de conservation au réfrigérateur UNE FOIS CUISINÉ, à 4 °C.
   *
   * C'est ce qui décide si un plat peut être préparé le dimanche pour toute la
   * semaine ou s'il faut le refaire en milieu de semaine. Sans ce chiffre, « je
   * cuisine tout dimanche » revient à manger du poulet de six jours le samedi.
   * Absent = KEEPS_DEFAULT, le cas des féculents et des légumes cuits.
   */
  keeps?: number
}

/** Conservation par défaut d'un aliment cuisiné, en jours au frigo. */
export const KEEPS_DEFAULT = 4

export const CAT_LABELS: Record<FoodCat, string> = {
  viandes: 'Viandes / poissons',
  oeufs: 'Œufs',
  laitiers: 'Produits laitiers',
  complements: 'Compléments',
  feculents: 'Féculents',
  legumes: 'Légumes',
  fruits: 'Fruits',
  grasses: 'Matières grasses',
}
// Ordre d'affichage de la liste de courses : calqué sur le parcours en magasin.
export const CAT_ORDER: FoodCat[] = ['viandes', 'oeufs', 'laitiers', 'complements', 'feculents', 'legumes', 'fruits', 'grasses']

export const FOODS: Food[] = [
  {
    id: 'flocons-d-avoine',
    name: 'Flocons d\'avoine',
    cat: 'feculents',
    kcal: 375,
    p: 13,
    g: 60,
    l: 7,
    buy: 'pesé cru',
    micro: { fib: 10, ca: 54, fe: 4, mg: 145, zn: 3, k: 380, b9: 32 },
  },
  {
    id: 'fromage-blanc-0',
    name: 'Fromage blanc 0 %',
    cat: 'laitiers',
    kcal: 47,
    p: 8,
    g: 4.5,
    l: 0.2,
    micro: { ca: 120, fe: 0.1, mg: 11, zn: 0.5, k: 150, vc: 1, b9: 12 },
  },
  {
    id: 'whey-poudre',
    name: 'Whey (poudre)',
    cat: 'complements',
    kcal: 375,
    p: 80,
    g: 7,
    l: 5,
    buy: '1 dose ≈ 30 g',
    micro: { ca: 400, fe: 1, mg: 60, zn: 3, k: 500, b9: 20 },
  },
  { id: 'creatine-monohydrate', name: 'Creatine monohydrate', cat: 'complements', kcal: 0, p: 0, g: 0, l: 0 },
  {
    id: 'fruits-rouges-surgeles',
    name: 'Fruits rouges surgelés',
    cat: 'fruits',
    kcal: 45,
    p: 1,
    g: 8,
    l: 0.3,
    buy: 'surgelés',
    micro: { fib: 5, ca: 25, fe: 0.6, mg: 18, zn: 0.3, k: 150, vc: 25, b9: 25 },
  },
  {
    id: 'filet-de-poulet',
    name: 'Filet de poulet',
    cat: 'viandes',
    kcal: 110,
    p: 23,
    g: 0,
    l: 1.8,
    keeps: 3,
    micro: { ca: 8, fe: 0.5, mg: 28, zn: 0.9, k: 350, vd: 0.1, o3: 30, b9: 5 },
  },
  {
    id: 'escalope-de-dinde',
    name: 'Escalope de dinde',
    cat: 'viandes',
    kcal: 105,
    p: 22,
    g: 0,
    l: 1.5,
    keeps: 3,
    micro: { ca: 10, fe: 0.7, mg: 28, zn: 1.5, k: 330, vd: 0.1, o3: 25, b9: 8 },
  },
  {
    id: 'steak-hache-5',
    name: 'Steak haché 5 %',
    cat: 'viandes',
    kcal: 137,
    p: 21,
    g: 0,
    l: 5,
    keeps: 3,
    micro: { ca: 8, fe: 2.6, mg: 22, zn: 4.5, k: 330, vd: 0.2, o3: 30, b9: 8 },
  },
  {
    id: 'cabillaud-colin',
    name: 'Cabillaud / colin',
    cat: 'viandes',
    kcal: 80,
    p: 18,
    g: 0,
    l: 0.8,
    keeps: 2,
    micro: { ca: 20, fe: 0.2, mg: 25, zn: 0.4, k: 380, vc: 1, vd: 1, o3: 200, b9: 8 },
  },
  {
    id: 'saumon',
    name: 'Saumon',
    cat: 'viandes',
    kcal: 200,
    p: 20,
    g: 0,
    l: 13,
    keeps: 2,
    micro: { ca: 12, fe: 0.4, mg: 28, zn: 0.5, k: 380, vd: 8, o3: 2200, b9: 26 },
  },
  {
    id: 'thon-au-naturel-egoutte',
    name: 'Thon au naturel égoutté',
    cat: 'viandes',
    kcal: 110,
    p: 26,
    g: 0,
    l: 1,
    keeps: 3,
    micro: { ca: 15, fe: 1, mg: 30, zn: 0.7, k: 240, vd: 2, o3: 250, b9: 4 },
  },
  {
    id: 'ufs-entiers',
    name: 'Œufs entiers',
    cat: 'oeufs',
    kcal: 143,
    p: 12.5,
    g: 0.7,
    l: 10,
    buy: '1 œuf ≈ 55 g',
    keeps: 3,
    micro: { ca: 55, fe: 1.8, mg: 12, zn: 1.3, k: 130, vd: 2, o3: 90, b9: 50 },
  },
  {
    id: 'riz-basmati',
    name: 'Riz basmati',
    cat: 'feculents',
    kcal: 350,
    p: 7,
    g: 78,
    l: 0.6,
    buy: 'pesé cru',
    micro: { fib: 1.4, ca: 10, fe: 0.9, mg: 35, zn: 1.1, k: 110, b9: 8 },
  },
  {
    id: 'pates-completes',
    name: 'Pâtes complètes',
    cat: 'feculents',
    kcal: 350,
    p: 13,
    g: 66,
    l: 2,
    buy: 'pesé cru',
    micro: { fib: 8, ca: 35, fe: 3, mg: 120, zn: 2.5, k: 300, b9: 30 },
  },
  {
    id: 'pommes-de-terre',
    name: 'Pommes de terre',
    cat: 'feculents',
    kcal: 77,
    p: 2,
    g: 17,
    l: 0.1,
    micro: { fib: 1.8, ca: 8, fe: 0.5, mg: 22, zn: 0.3, k: 420, vc: 15, b9: 20 },
  },
  {
    id: 'patate-douce',
    name: 'Patate douce',
    cat: 'feculents',
    kcal: 86,
    p: 1.6,
    g: 20,
    l: 0.1,
    micro: { fib: 3, ca: 30, fe: 0.6, mg: 25, zn: 0.3, k: 340, vc: 15, b9: 11 },
  },
  {
    id: 'lentilles-vertes',
    name: 'Lentilles vertes',
    cat: 'feculents',
    kcal: 340,
    p: 24,
    g: 50,
    l: 1.5,
    buy: 'pesées crues',
    micro: { fib: 15, ca: 50, fe: 7, mg: 90, zn: 3.5, k: 900, vc: 2, b9: 200 },
  },
  {
    id: 'pain-complet',
    name: 'Pain complet',
    cat: 'feculents',
    kcal: 250,
    p: 9,
    g: 43,
    l: 2.5,
    micro: { fib: 7, ca: 45, fe: 2.5, mg: 80, zn: 1.8, k: 250, b9: 30 },
  },
  {
    id: 'brocolis',
    name: 'Brocolis',
    cat: 'legumes',
    kcal: 34,
    p: 2.8,
    g: 4,
    l: 0.4,
    buy: 'frais ou surgelés',
    keeps: 4,
    micro: { fib: 3, ca: 47, fe: 0.7, mg: 21, zn: 0.4, k: 320, vc: 90, b9: 63 },
  },
  {
    id: 'haricots-verts',
    name: 'Haricots verts',
    cat: 'legumes',
    kcal: 31,
    p: 1.8,
    g: 5,
    l: 0.2,
    buy: 'surgelés',
    micro: { fib: 3, ca: 40, fe: 0.8, mg: 22, zn: 0.3, k: 230, vc: 12, b9: 40 },
  },
  {
    id: 'courgettes',
    name: 'Courgettes',
    cat: 'legumes',
    kcal: 17,
    p: 1.2,
    g: 3,
    l: 0.3,
    micro: { fib: 1.1, ca: 18, fe: 0.4, mg: 18, zn: 0.3, k: 260, vc: 15, b9: 24 },
  },
  {
    id: 'poivrons',
    name: 'Poivrons',
    cat: 'legumes',
    kcal: 26,
    p: 1,
    g: 5,
    l: 0.2,
    micro: { fib: 2, ca: 10, fe: 0.4, mg: 12, zn: 0.2, k: 210, vc: 120, b9: 46 },
  },
  {
    id: 'tomates-concassees',
    name: 'Tomates concassées',
    cat: 'legumes',
    kcal: 25,
    p: 1.2,
    g: 4,
    l: 0.2,
    keeps: 4,
    micro: { fib: 1.2, ca: 12, fe: 0.6, mg: 11, zn: 0.2, k: 250, vc: 10, b9: 15 },
  },
  {
    id: 'oignon',
    name: 'Oignon',
    cat: 'legumes',
    kcal: 40,
    p: 1.1,
    g: 8,
    l: 0.1,
    micro: { fib: 1.7, ca: 23, fe: 0.2, mg: 10, zn: 0.2, k: 150, vc: 7, b9: 19 },
  },
  {
    id: 'champignons',
    name: 'Champignons',
    cat: 'legumes',
    kcal: 22,
    p: 3,
    g: 1,
    l: 0.3,
    keeps: 3,
    micro: { fib: 2, ca: 4, fe: 0.5, mg: 10, zn: 0.5, k: 350, vc: 2, vd: 0.2, b9: 25 },
  },
  {
    id: 'epinards',
    name: 'Épinards',
    cat: 'legumes',
    kcal: 23,
    p: 2.9,
    g: 1.5,
    l: 0.4,
    buy: 'surgelés ou frais',
    keeps: 2,
    micro: { fib: 2.5, ca: 100, fe: 2.7, mg: 55, zn: 0.5, k: 500, vc: 30, b9: 150 },
  },
  {
    id: 'salade-verte',
    name: 'Salade verte',
    cat: 'legumes',
    kcal: 15,
    p: 1.4,
    g: 1.5,
    l: 0.2,
    keeps: 1,
    micro: { fib: 1.3, ca: 35, fe: 0.7, mg: 11, zn: 0.2, k: 220, vc: 8, b9: 55 },
  },
  {
    id: 'banane',
    name: 'Banane',
    cat: 'fruits',
    kcal: 89,
    p: 1.1,
    g: 21,
    l: 0.3,
    buy: '1 banane ≈ 120 g épluchée',
    micro: { fib: 2.6, ca: 6, fe: 0.3, mg: 27, zn: 0.15, k: 360, vc: 9, b9: 20 },
  },
  {
    id: 'pomme',
    name: 'Pomme',
    cat: 'fruits',
    kcal: 52,
    p: 0.3,
    g: 12,
    l: 0.2,
    buy: '1 pomme ≈ 150 g',
    micro: { fib: 2, ca: 6, fe: 0.1, mg: 5, zn: 0.05, k: 110, vc: 5, b9: 3 },
  },
  {
    id: 'huile-d-olive',
    name: 'Huile d\'olive',
    cat: 'grasses',
    kcal: 900,
    p: 0,
    g: 0,
    l: 100,
    buy: '1 c. à soupe = 10 g',
    micro: { ca: 1, fe: 0.1, k: 1 },
  },
  {
    id: 'amandes',
    name: 'Amandes',
    cat: 'grasses',
    kcal: 600,
    p: 21,
    g: 5,
    l: 53,
    micro: { fib: 12, ca: 250, fe: 3.7, mg: 270, zn: 3.1, k: 730, b9: 44 },
  },
]

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map(f => [f.id, f]))

export type RecipeKind = 'pdj' | 'boite' | 'diner' | 'collation'

export interface RecipeItem { food: string, g: number }
export interface Recipe {
  id: string
  name: string
  kind: RecipeKind
  batch: boolean // préparable à l'avance en session de batch cooking
  steps: string
  items: RecipeItem[]
  custom?: boolean // créée par l'utilisateur, pas livrée avec le plan
  disabled?: boolean // mise de côté : consultable, mais ne tombe plus dans le planning
}

export const RECIPES: Recipe[] = [
  {
    id: 'pdj',
    name: 'Porridge protéiné',
    kind: 'pdj',
    batch: false,
    steps: 'Avoine + 200 ml d\'eau ou de lait écrémé, 2 min au micro-ondes. On incorpore le fromage blanc et la whey HORS du feu (sinon la whey coagule et devient granuleuse). Fruits rouges par-dessus.',
    items: [
      { food: 'flocons-d-avoine', g: 70 },
      { food: 'fromage-blanc-0', g: 250 },
      { food: 'whey-poudre', g: 30 },
      { food: 'fruits-rouges-surgeles', g: 100 },
    ],
  },
  {
    id: 'boite-a',
    name: 'Boîte A — Poulet rôti, riz, brocolis',
    kind: 'boite',
    batch: true,
    steps: 'Poulet au four 200 °C, 22 min (paprika, ail, curry). Riz à l\'eau. Brocolis et poivrons vapeur, ou au four sur la même plaque. L\'huile s\'ajoute APRÈS cuisson, directement dans la boîte : c\'est le poste où le déficit se perd.',
    items: [
      { food: 'filet-de-poulet', g: 180 },
      { food: 'riz-basmati', g: 80 },
      { food: 'brocolis', g: 200 },
      { food: 'poivrons', g: 100 },
      { food: 'huile-d-olive', g: 10 },
    ],
  },
  {
    id: 'boite-b',
    name: 'Boîte B — Bœuf 5 %, pommes de terre',
    kind: 'boite',
    batch: true,
    steps: 'Bœuf poêlé à sec avec l\'oignon (il rend assez de gras). Pommes de terre en cubes au four 200 °C, 30 min. Haricots verts surgelés vapeur. Se mange froid ou réchauffé.',
    items: [
      { food: 'steak-hache-5', g: 180 },
      { food: 'pommes-de-terre', g: 350 },
      { food: 'haricots-verts', g: 200 },
      { food: 'oignon', g: 50 },
      { food: 'huile-d-olive', g: 6 },
    ],
  },
  {
    id: 'boite-c',
    name: 'Boîte C — Pâtes thon-tomate, courgettes',
    kind: 'boite',
    batch: true,
    steps: 'Pâtes al dente : elles finiront de cuire au réchauffage. Sauce oignon + courgettes en dés + tomates concassées, thon ajouté hors du feu. Très bon froid, en salade de pâtes.',
    items: [
      { food: 'thon-au-naturel-egoutte', g: 160 },
      { food: 'pates-completes', g: 80 },
      { food: 'tomates-concassees', g: 200 },
      { food: 'courgettes', g: 200 },
      { food: 'oignon', g: 50 },
      { food: 'huile-d-olive', g: 8 },
    ],
  },
  {
    id: 'din-poisson',
    name: 'Poisson blanc, pommes de terre, haricots verts',
    kind: 'diner',
    batch: false,
    steps: 'Cabillaud en papillote au four, 15 min (citron, ail, herbes). Pommes de terre vapeur. Le poisson ne se batch pas : réchauffé, il devient sec.',
    items: [
      { food: 'cabillaud-colin', g: 220 },
      { food: 'pommes-de-terre', g: 350 },
      { food: 'haricots-verts', g: 250 },
      { food: 'huile-d-olive', g: 10 },
      { food: 'pain-complet', g: 40 },
    ],
  },
  {
    id: 'din-dinde',
    name: 'Dinde, riz, courgettes',
    kind: 'diner',
    batch: false,
    steps: 'Dinde en lanières à la poêle avec les courgettes et les champignons, sauce soja + gingembre. Riz à côté.',
    items: [
      { food: 'escalope-de-dinde', g: 220 },
      { food: 'riz-basmati', g: 70 },
      { food: 'courgettes', g: 300 },
      { food: 'champignons', g: 100 },
      { food: 'huile-d-olive', g: 10 },
    ],
  },
  {
    id: 'din-saumon',
    name: 'Saumon, patate douce, épinards',
    kind: 'diner',
    batch: false,
    steps: 'Saumon à la poêle côté peau, 4 min sans le retourner, puis 1 min sur l\'autre face. Patate douce en frites au four. Épinards poêlés à l\'ail.',
    items: [
      { food: 'saumon', g: 170 },
      { food: 'patate-douce', g: 300 },
      { food: 'epinards', g: 250 },
      { food: 'huile-d-olive', g: 5 },
    ],
  },
  {
    id: 'din-omelette',
    name: 'Omelette-poêlée dinde et légumes',
    kind: 'diner',
    batch: false,
    steps: '3 œufs ENTIERS, jaunes compris — aucun gaspillage. Dinde émincée saisie d\'abord, puis les légumes, puis les œufs battus par-dessus. 10 min chrono.',
    items: [
      { food: 'ufs-entiers', g: 165 },
      { food: 'escalope-de-dinde', g: 100 },
      { food: 'poivrons', g: 150 },
      { food: 'champignons', g: 100 },
      { food: 'epinards', g: 100 },
      { food: 'pain-complet', g: 60 },
      { food: 'huile-d-olive', g: 3 },
    ],
  },
  {
    id: 'din-poulet',
    name: 'Poulet, lentilles, salade',
    kind: 'diner',
    batch: true,
    steps: 'Lentilles 20 min à l\'eau — à cuire pendant la session de batch, elles se gardent 4 jours. Poulet grillé. Salade à côté.',
    items: [
      { food: 'filet-de-poulet', g: 200 },
      { food: 'lentilles-vertes', g: 70 },
      { food: 'salade-verte', g: 100 },
      { food: 'tomates-concassees', g: 100 },
      { food: 'huile-d-olive', g: 8 },
    ],
  },
  {
    id: 'col-pre',
    name: 'Banane d\'avant-séance',
    kind: 'collation',
    batch: false,
    steps: 'Une heure avant la séance, au bureau. C\'est ton seul apport entre le petit-déjeuner et la salle : ne la saute pas, sinon la fin de séance décroche. Café vers 11 h 45 si tu le tolères.',
    items: [
      { food: 'banane', g: 120 },
    ],
  },
  {
    id: 'col-post',
    name: 'Shaker d\'après-séance',
    kind: 'collation',
    batch: false,
    steps: 'Shaker préparé le matin, poudre à sec dedans, eau ajoutée sur place. Bu au vestiaire, dès la fin de la séance. La créatine part dans le même shaker : un seul geste, donc jamais oubliée.',
    items: [
      { food: 'whey-poudre', g: 30 },
      { food: 'creatine-monohydrate', g: 5 },
    ],
  },
  {
    id: 'creatine',
    name: 'Créatine',
    kind: 'collation',
    batch: false,
    steps: '5 g de monohydrate, tous les jours, y compris sans séance : ce qui compte est la saturation du muscle, pas le timing. Mélangée au porridge, elle ne se sent pas.',
    items: [
      { food: 'creatine-monohydrate', g: 5 },
    ],
  },
  {
    id: 'col-aprem-repos',
    name: 'Collation de l\'après-midi',
    kind: 'collation',
    batch: false,
    steps: 'Vers 16 h - 17 h, quand la faim arrive. Le creux entre le déjeuner et le dîner est le moment où les plans déraillent.',
    items: [
      { food: 'fromage-blanc-0', g: 200 },
      { food: 'pomme', g: 150 },
    ],
  },
  {
    id: 'col-aprem-salle',
    name: 'Collation de l\'après-midi',
    kind: 'collation',
    batch: false,
    steps: 'Vers 16 h - 17 h, quand la faim arrive. Le creux entre le déjeuner et le dîner est le moment où les plans déraillent.',
    items: [
      { food: 'fromage-blanc-0', g: 200 },
    ],
  },
  {
    id: 'col-soir-salle',
    name: 'Fromage blanc du soir',
    kind: 'collation',
    batch: false,
    steps: 'Caséine lente : elle ralentit la dégradation musculaire nocturne.',
    items: [
      { food: 'fromage-blanc-0', g: 150 },
    ],
  },
  {
    id: 'col-soir-repos',
    name: 'Fromage blanc du soir',
    kind: 'collation',
    batch: false,
    steps: 'Caséine lente : elle ralentit la dégradation musculaire nocturne.',
    items: [
      { food: 'fromage-blanc-0', g: 150 },
      { food: 'amandes', g: 10 },
    ],
  },
]

export const RECIPE_BY_ID: Record<string, Recipe> = Object.fromEntries(RECIPES.map(r => [r.id, r]))

// Féculents dont la portion se module selon que la séance a eu lieu ou non.
// Protéines, légumes et matières grasses ne bougent JAMAIS : c'est ce qui protège
// la masse maigre en déficit et garde la satiété constante.
export const STARCHY_IDS: string[] = [
  'lentilles-vertes',
  'pain-complet',
  'patate-douce',
  'pates-completes',
  'pommes-de-terre',
  'riz-basmati',
]

// Jour sans séance : féculents du midi ET du soir réduits de 30 %.
export const RATIO_REST = 0.7
// Jour avec séance : la boîte d'après-séance sert le gros des glucides,
// donc seul le dîner est réduit (de 27 %).
export const RATIO_DINNER_GYM = 0.73

export interface DayTemplate { lunch: string, dinner: string }
// Cycle de 14 jours, index 0 = lundi de la semaine 1. Les recettes alternent
// pour rester supportables sans multiplier les courses.
export const CYCLE: DayTemplate[] = [
  { lunch: 'boite-a', dinner: 'din-poisson' },
  { lunch: 'boite-a', dinner: 'din-dinde' },
  { lunch: 'boite-a', dinner: 'din-omelette' },
  { lunch: 'boite-b', dinner: 'din-saumon' },
  { lunch: 'boite-b', dinner: 'din-poisson' },
  { lunch: 'boite-b', dinner: 'din-poulet' },
  { lunch: 'boite-c', dinner: 'din-dinde' },
  { lunch: 'boite-c', dinner: 'din-poisson' },
  { lunch: 'boite-c', dinner: 'din-saumon' },
  { lunch: 'boite-c', dinner: 'din-omelette' },
  { lunch: 'boite-a', dinner: 'din-dinde' },
  { lunch: 'boite-a', dinner: 'din-poisson' },
  { lunch: 'boite-a', dinner: 'din-poulet' },
  { lunch: 'boite-b', dinner: 'din-dinde' },
]
export const CYCLE_LENGTH = CYCLE.length

export interface Slot {
  id: string
  time: string
  label: string
  recipe?: string // recette fixe (collations) ; sinon fournie par le CYCLE
  from?: 'lunch' | 'dinner'
  ratio?: 'rest' | 'dinnerGym' // modulation à appliquer aux féculents
}

// Journée AVEC séance entre midi et deux : le déjeuner devient le repas d'après-séance.
//
// Petit-déjeuner à 10 h : lever 8 h, travail à 9 h, et rien ne passe avant. Ça reste
// 2 h 15 avant la séance de 12 h 15, ce qui est le bon écart — assez pour digérer,
// assez peu pour ne pas repartir à jeun.
//
// La banane d'avant-séance est passée À 10 h 05, avec le petit-déjeuner : elle
// existait pour combler les 4 h 45 entre un petit-déjeuner de 7 h 30 et la séance.
// Ce trou n'existe plus, et une prise de plus à 11 h 15 serait une prise à forcer.
// Les calories, elles, sont inchangées : c'est la même banane, une heure plus tôt.
export const SLOTS_GYM: Slot[] = [
  { id: 'pdj', time: '10 h', label: 'Petit-déjeuner', recipe: 'pdj' },
  { id: 'pre', time: '10 h 05', label: 'Banane (avec le petit-déjeuner)', recipe: 'col-pre' },
  { id: 'post', time: '13 h 20', label: 'Après séance', recipe: 'col-post' },
  { id: 'lunch', time: '13 h 40', label: 'Déjeuner (boîte)', from: 'lunch' },
  { id: 'snack', time: '17 h', label: 'Collation', recipe: 'col-aprem-salle' },
  { id: 'dinner', time: '20 h 30', label: 'Dîner', from: 'dinner', ratio: 'dinnerGym' },
  { id: 'night', time: '22 h 30', label: 'Avant de dormir', recipe: 'col-soir-salle' },
]

// Journée SANS séance : pas de banane ni de shaker, féculents réduits sur les deux repas.
// Le déjeuner reste à 13 h 40 : garder le même horaire les deux types de jours évite
// d'avoir faim à contretemps le lendemain d'un changement.
export const SLOTS_REST: Slot[] = [
  { id: 'pdj', time: '10 h', label: 'Petit-déjeuner', recipe: 'pdj' },
  { id: 'creatine', time: '10 h 05', label: 'Créatine', recipe: 'creatine' },
  { id: 'lunch', time: '13 h 40', label: 'Déjeuner (boîte)', from: 'lunch', ratio: 'rest' },
  { id: 'snack', time: '17 h', label: 'Collation', recipe: 'col-aprem-repos' },
  { id: 'dinner', time: '20 h 30', label: 'Dîner', from: 'dinner', ratio: 'rest' },
  { id: 'night', time: '22 h 30', label: 'Avant de dormir', recipe: 'col-soir-repos' },
]

// Les sessions de cuisine ne sont plus une liste écrite à la main : elles sont
// CALCULÉES d'après la semaine choisie et la conservation de chaque plat (voir
// `cookPlan` dans lib/nutritionStats.ts). Deux textes figés ne pouvaient pas dire
// ce qu'il faut cuisiner quand la semaine change — et c'est précisément ce qui
// change toutes les semaines.

// Trois choses à emporter chaque matin de séance. Si l'une manque, la journée se
// décale — et un déjeuner improvisé après une séance, c'est ~300 kcal de plus.
export const GYM_BAG: string[] = ['La boîte du midi', 'Le shaker (poudre déjà dedans)', 'La banane']

// Références nutritionnelles pour un homme adulte (ANSES 2016-2021 / VNR européennes).
// Ce sont des repères de population, pas des cibles individuelles : seule une prise de
// sang dit où on en est vraiment.
export const MICRO_REFS: Record<MicroKey, { label: string, unit: string, ref: number }> = {
  fib: { label: 'Fibres', unit: 'g', ref: 30 },
  ca: { label: 'Calcium', unit: 'mg', ref: 950 },
  fe: { label: 'Fer', unit: 'mg', ref: 11 },
  mg: { label: 'Magnésium', unit: 'mg', ref: 380 },
  zn: { label: 'Zinc', unit: 'mg', ref: 11 },
  k: { label: 'Potassium', unit: 'mg', ref: 3500 },
  vc: { label: 'Vitamine C', unit: 'mg', ref: 110 },
  vd: { label: 'Vitamine D', unit: 'µg', ref: 15 },
  o3: { label: 'Oméga-3 EPA+DHA', unit: 'mg', ref: 500 },
  b9: { label: 'Folates (B9)', unit: 'µg', ref: 330 },
}

// La vitamine C des légumes est dégradée d'environ 35 % à la cuisson.
export const COOK_C_LOSS = 0.65

export interface Supplement {
  id: string
  name: string
  dose: string
  when: string
  why: string
  caution?: string
}

// Compléments retenus : uniquement ceux que le plan ne peut pas couvrir par l'assiette,
// plus la créatine qui est un choix de performance, pas une correction de carence.
export const SUPPLEMENTS: Supplement[] = [
  {
    id: 'creatine',
    name: 'Créatine monohydrate',
    dose: '5 g par jour',
    when: 'Dans le shaker d\'après-séance les jours de salle, dans le porridge les autres jours',
    why: 'Le complément le plus documenté en musculation : elle augmente la force et le volume de travail, et en déficit calorique elle aide à limiter la perte de masse maigre. Le monohydrate suffit — les formes « avancées » coûtent plus cher sans faire mieux.',
    caution: 'Pas de phase de charge nécessaire : 5 g par jour saturent le muscle en 3 à 4 semaines, jours de repos compris. Attends-toi à +1 à 2 kg sur la balance les premières semaines — c\'est de l\'eau intramusculaire, pas du gras. Raison de plus pour ne juger la tendance que sur des moyennes sur 7 jours.',
  },
  {
    id: 'vitd',
    name: 'Vitamine D3',
    dose: '1 000 à 2 000 UI par jour (25 à 50 µg)',
    when: 'Au repas le plus gras de la journée — c\'est une vitamine liposoluble',
    why: 'C\'est le seul nutriment que ce plan ne couvre pas : environ 4 µg par jour pour une référence de 15 µg. Aucun aménagement réaliste de l\'assiette ne comble l\'écart, et sous nos latitudes le soleil ne suffit pas d\'octobre à avril.',
    caution: 'Fais doser ta 25(OH)D par une prise de sang avant de fixer la dose : c\'est le seul moyen de savoir d\'où tu pars. La vitamine D se stocke, donc les très fortes doses ponctuelles ne sont pas anodines — le sujet se tranche avec un médecin, pas avec un tableur.',
  },
]
