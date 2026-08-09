// Données du plan nutrition : table des aliments, recettes et cycle de 14 jours.
// Générées à partir du plan calculé (valeurs Ciqual/USDA arrondies, ±5 % d'incertitude —
// sans importance tant que l'ajustement se fait sur la balance et pas sur le tableur).
// Les grammages ci-dessous sont ceux d'un JOUR AVEC SÉANCE : la modulation des féculents
// pour les jours sans séance est calculée dans lib/nutritionStats.ts, jamais stockée.

export type MicroKey = 'fib' | 'ca' | 'fe' | 'mg' | 'zn' | 'k' | 'vc' | 'vd' | 'o3' | 'b9'

export type FoodCat = 'viandes' | 'oeufs' | 'laitiers' | 'complements' | 'feculents' | 'legumes' | 'fruits' | 'grasses' | 'aromates'

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
  /**
   * Comment le cuire, en une phrase — temps et méthode.
   *
   * C'est ce qui transforme la session de préparation en vraie recette : « riz
   * basmati 240 g » ne dit pas quoi en faire, « 11 min à l'eau bouillante salée »
   * si. Absent = rien à cuire (fruits, poudres, pain).
   */
  cook?: string
  /**
   * Se congèle mal une fois cuisiné. Sert à savoir si une boîte peut partir au
   * congélateur le jour de la préparation plutôt que d'imposer une deuxième session
   * en milieu de semaine. Absent = se congèle sans problème.
   */
  noFreeze?: boolean
}

/** Conservation par défaut d'un aliment cuisiné, en jours au frigo. */
export const KEEPS_DEFAULT = 4

/**
 * Au-dessous de ce seuil, un aliment ne se prépare JAMAIS à l'avance : il s'ajoute
 * au moment de manger. Il ne condamne pas le plat pour autant — une salade verte
 * dans une assiette de poulet-lentilles ne doit pas empêcher de cuire le poulet et
 * les lentilles le dimanche.
 */
export const KEEPS_FRESH = 1

export const CAT_LABELS: Record<FoodCat, string> = {
  viandes: 'Viandes / poissons',
  oeufs: 'Œufs',
  laitiers: 'Produits laitiers',
  complements: 'Compléments',
  feculents: 'Féculents',
  legumes: 'Légumes',
  fruits: 'Fruits',
  grasses: 'Matières grasses',
  aromates: 'Épices, herbes et condiments',
}
// Ordre d'affichage de la liste de courses : calqué sur le parcours en magasin.
export const CAT_ORDER: FoodCat[] = ['viandes', 'oeufs', 'laitiers', 'complements', 'feculents', 'legumes', 'fruits', 'grasses', 'aromates']

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
    id: 'yaourt-grec-0',
    name: 'Yaourt grec 0 %',
    cat: 'laitiers',
    kcal: 57,
    p: 10,
    g: 4,
    l: 0.2,
    buy: 'la base de toutes les sauces crémeuses du plan',
    keeps: 5,
    noFreeze: true,
    micro: { ca: 110, fe: 0.1, mg: 11, zn: 0.5, k: 141, b9: 7 },
  },
  {
    id: 'whey-poudre',
    // Nom générique : le plan ne dépend pas d'une marque ni même d'une source. Ce
    // qui compte est la densité protéique, et un isolat de bœuf hydrolysé fait aussi
    // bien qu'une whey — parfois mieux.
    name: 'Protéine en poudre',
    cat: 'complements',
    kcal: 407,
    p: 90,
    g: 6,
    l: 2.5,
    buy: '1 dose ≈ 30 g · vise 80 g de protéines ou plus pour 100 g',
    // Une protéine de bœuf n'apporte PAS le calcium d'une whey (400 mg/100 g contre
    // une vingtaine) : c'est du petit-lait qu'il venait. Le compteur de calcium doit
    // le savoir, sinon il annonce une couverture qui n'existe pas.
    micro: { ca: 20, fe: 2, mg: 15, zn: 3, k: 100, b9: 5 },
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
    cook: '22 min au four à 200 °C — paprika, ail, curry',
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
    cook: 'en lanières, 6 min à la poêle à feu vif',
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
    cook: 'poêlé à sec 5 min, il rend assez de gras pour lui-même',
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
    cook: 'en papillote, 15 min au four à 200 °C — citron, ail, herbes',
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
    cook: 'côté peau 4 min sans le retourner, puis 1 min sur l\'autre face',
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
    cook: 'rien à cuire : égoutte et ajoute hors du feu',
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
    noFreeze: true,
    cook: 'battus, versés sur les légumes déjà saisis, 3 min à couvert',
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
    cook: '11 min à l\'eau bouillante salée, puis égoutte et étale sur un plat pour refroidir vite',
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
    cook: '9 min, al dente — elles finiront de cuire au réchauffage',
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
    cook: 'en cubes de 2 cm, 30 min au four à 200 °C (ou 20 min vapeur)',
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
    cook: 'en frites, 25 min au four à 200 °C',
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
    cook: '20 min à l\'eau NON salée, sale seulement en fin de cuisson',
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
    cook: '6 min vapeur — ils doivent rester fermes sous la fourchette',
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
    cook: '8 min vapeur, directement depuis les surgelés',
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
    cook: 'en dés, 8 min à la poêle à feu vif',
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
    cook: 'en lanières, 10 min au four avec le reste de la plaque',
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
    cook: 'versées en fin de cuisson, 10 min à frémir à découvert',
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
    cook: 'émincé, 5 min à feu doux AVANT le reste',
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
    cook: 'émincés, 6 min à la poêle À SEC d\'abord, pour qu\'ils rendent leur eau',
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
    cook: '3 min à la poêle avec un peu d\'ail — ils réduisent des trois quarts',
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
    noFreeze: true,
    cook: 'lavée et essorée, à ajouter au dernier moment',
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
    cook: 'APRÈS cuisson, versée dans la boîte — c\'est le poste où le déficit se perd',
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
  // ─── Épices, herbes et condiments ─────────────────────────────────────────
  //
  // Le poste le plus rentable de tout le plan : c'est ici que se joue la différence
  // entre « je tiens deux semaines » et « je tiens six mois ». Un blanc de poulet
  // vapeur et un blanc de poulet paprika-ail-citron ont les mêmes macros ; un seul
  // des deux se mange encore avec plaisir le jeudi.
  //
  // Les quantités en jeu sont si petites que le coût calorique est dans le bruit :
  // 2 g de paprika, c'est 6 kcal. Compter les épices au gramme près serait aussi
  // absurde que de ne pas en mettre.
  {
    id: 'ail',
    name: 'Ail',
    cat: 'aromates',
    kcal: 149,
    p: 6.4,
    g: 33,
    l: 0.5,
    buy: '1 gousse ≈ 5 g',
    keeps: 5,
    micro: { fib: 2.1, ca: 180, fe: 1.7, mg: 25, zn: 1.2, k: 400, vc: 31, b9: 3 },
  },
  {
    id: 'gingembre-frais',
    name: 'Gingembre frais',
    cat: 'aromates',
    kcal: 80,
    p: 1.8,
    g: 18,
    l: 0.8,
    buy: 'un morceau de 5 cm dure deux semaines',
    keeps: 5,
    micro: { fib: 2, ca: 16, fe: 0.6, mg: 43, zn: 0.3, k: 415, vc: 5 },
  },
  {
    id: 'citron',
    name: 'Citron',
    cat: 'aromates',
    kcal: 29,
    p: 1.1,
    g: 9,
    l: 0.3,
    buy: '1 citron ≈ 100 g, soit 40 g de jus',
    keeps: 5,
    micro: { fib: 2.8, ca: 26, fe: 0.6, mg: 8, zn: 0.06, k: 138, vc: 53, b9: 11 },
  },
  {
    id: 'sauce-soja',
    name: 'Sauce soja (peu salée)',
    cat: 'aromates',
    kcal: 60,
    p: 6,
    g: 6,
    l: 0.1,
    buy: '1 c. à soupe = 15 g · prends la version réduite en sel',
    keeps: 5,
  },
  {
    id: 'vinaigre-balsamique',
    name: 'Vinaigre balsamique',
    cat: 'aromates',
    kcal: 88,
    p: 0.5,
    g: 17,
    l: 0,
    buy: '1 c. à soupe = 15 g',
    keeps: 5,
  },
  {
    id: 'moutarde-dijon',
    name: 'Moutarde de Dijon',
    cat: 'aromates',
    kcal: 66,
    p: 4,
    g: 6,
    l: 3.5,
    buy: '1 c. à café = 5 g',
    keeps: 5,
  },
  {
    id: 'concentre-tomate',
    name: 'Concentré de tomate',
    cat: 'aromates',
    kcal: 82,
    p: 4.3,
    g: 19,
    l: 0.5,
    buy: '1 c. à soupe = 15 g',
    keeps: 5,
    micro: { fib: 4, ca: 36, fe: 2.9, mg: 42, zn: 0.6, k: 1014, vc: 21 },
  },
  {
    id: 'levure-maltee',
    name: 'Levure maltée',
    cat: 'aromates',
    kcal: 350,
    p: 45,
    g: 35,
    l: 5,
    buy: '1 c. à soupe = 5 g · goût de fromage, sans le fromage',
    keeps: 5,
    micro: { fib: 20, fe: 5, mg: 120, zn: 8, k: 1900, b9: 300 },
  },
  {
    id: 'paprika-fume',
    name: 'Paprika fumé',
    cat: 'aromates',
    kcal: 280,
    p: 14,
    g: 54,
    l: 13,
    buy: '1 c. à café = 2 g · le fumé change tout, pas le doux',
    keeps: 5,
  },
  {
    id: 'curry-poudre',
    name: 'Curry en poudre',
    cat: 'aromates',
    kcal: 325,
    p: 14,
    g: 58,
    l: 14,
    buy: '1 c. à café = 2 g',
    keeps: 5,
  },
  {
    id: 'cumin-moulu',
    name: 'Cumin moulu',
    cat: 'aromates',
    kcal: 375,
    p: 18,
    g: 44,
    l: 22,
    buy: '1 c. à café = 2 g',
    keeps: 5,
  },
  {
    id: 'herbes-de-provence',
    name: 'Herbes de Provence',
    cat: 'aromates',
    kcal: 265,
    p: 9,
    g: 64,
    l: 7,
    buy: '1 c. à café = 1 g',
    keeps: 5,
  },
  {
    id: 'piment-en-poudre',
    name: 'Piment en poudre',
    cat: 'aromates',
    kcal: 282,
    p: 12,
    g: 50,
    l: 14,
    buy: 'à doser selon ta tolérance',
    keeps: 5,
  },
  {
    id: 'ail-en-poudre',
    name: 'Ail en poudre',
    cat: 'aromates',
    kcal: 331,
    p: 17,
    g: 73,
    l: 0.7,
    buy: '1 c. à café = 3 g · pour les marinades sèches',
    keeps: 5,
  },
  {
    id: 'persil-frais',
    name: 'Persil frais',
    cat: 'aromates',
    kcal: 36,
    p: 3,
    g: 6,
    l: 0.8,
    buy: '1 botte ≈ 60 g',
    keeps: 3,
    micro: { fib: 3.3, ca: 138, fe: 6.2, mg: 50, zn: 1.1, k: 554, vc: 133, b9: 152 },
  },
  {
    id: 'basilic-frais',
    name: 'Basilic frais',
    cat: 'aromates',
    kcal: 23,
    p: 3.2,
    g: 2.7,
    l: 0.6,
    buy: '1 botte ≈ 25 g · à ajouter cru, jamais cuit',
    // Un jour : ce n'est pas une question de sécurité mais de goût. Réchauffé, le
    // basilic noircit et perd tout. Il se pose dans l'assiette au dernier moment,
    // et c'est pour ça qu'il ne condamne pas la conservation du plat.
    keeps: 1,
    micro: { fib: 1.6, ca: 177, fe: 3.2, mg: 64, zn: 0.8, k: 295, vc: 18, b9: 68 },
  },
  {
    id: 'cornichons',
    name: 'Cornichons',
    cat: 'aromates',
    kcal: 12,
    p: 0.6,
    g: 2,
    l: 0.2,
    buy: 'le croquant et l\'acide qui manquent aux plats réchauffés',
    keeps: 5,
  },
  {
    id: 'skyr',
    name: 'Skyr nature 0 %',
    cat: 'laitiers',
    kcal: 63,
    p: 11,
    g: 4,
    l: 0.2,
    buy: 'plus épais et plus protéiné que le fromage blanc',
    keeps: 5,
    noFreeze: true,
    micro: { ca: 150, fe: 0.1, mg: 11, zn: 0.5, k: 160, b9: 8 },
  },
  {
    id: 'lait-ecreme',
    name: 'Lait écrémé',
    cat: 'laitiers',
    kcal: 33,
    p: 3.4,
    g: 5,
    l: 0.1,
    buy: '1 verre = 250 ml',
    keeps: 5,
    micro: { ca: 120, mg: 11, zn: 0.4, k: 155, b9: 5 },
  },
  {
    id: 'cacao-maigre',
    name: 'Cacao en poudre non sucré',
    cat: 'aromates',
    kcal: 350,
    p: 23,
    g: 10,
    l: 20,
    buy: '1 c. à soupe = 5 g · non sucré, pas du chocolat en poudre',
    keeps: 5,
    micro: { fib: 33, ca: 128, fe: 13, mg: 500, zn: 6.8, k: 1500 },
  },
  {
    id: 'cannelle',
    name: 'Cannelle',
    cat: 'aromates',
    kcal: 247,
    p: 4,
    g: 28,
    l: 1.2,
    buy: '1 c. à café = 2 g · elle donne un goût sucré sans sucre',
    keeps: 5,
    micro: { fib: 53, ca: 1000, fe: 8, mg: 60, zn: 1.8, k: 430 },
  },
  {
    id: 'beurre-de-cacahuete',
    name: 'Beurre de cacahuète',
    cat: 'grasses',
    kcal: 600,
    p: 25,
    g: 12,
    l: 50,
    buy: '1 c. à café = 8 g · sans sucre ni huile de palme ajoutés',
    keeps: 5,
    micro: { fib: 6, ca: 45, fe: 1.9, mg: 160, zn: 2.9, k: 650, b9: 90 },
  },
  {
    id: 'graines-de-chia',
    name: 'Graines de chia',
    cat: 'grasses',
    kcal: 486,
    p: 17,
    g: 8,
    l: 31,
    buy: '1 c. à soupe = 10 g · elles épaississent en une nuit',
    keeps: 5,
    micro: { fib: 34, ca: 630, fe: 7.7, mg: 335, zn: 4.6, k: 407, o3: 17800 },
  },
  {
    id: 'aquafaba',
    name: 'Aquafaba (eau de pois chiche)',
    cat: 'complements',
    kcal: 5,
    p: 0.3,
    g: 1,
    l: 0,
    buy: 'l\'eau d\'une boîte de pois chiche, à ne plus jeter',
    keeps: 3,
    noFreeze: true,
  },
]

export const FOOD_BY_ID: Record<string, Food> = Object.fromEntries(FOODS.map(f => [f.id, f]))

export type RecipeKind = 'pdj' | 'boite' | 'diner' | 'collation' | 'sauce'

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
  /**
   * Sauce servie avec ce plat. Ses ingrédients entrent dans les macros et dans les
   * courses, mais PAS dans la boîte : elle se prépare à part, dans un petit pot, et
   * s'ajoute au moment de manger.
   *
   * C'est ce qui la rend possible. Mélangée à la préparation, une sauce blanche
   * tranche au réchauffage et une vinaigrette détrempe tout ; à côté, elle tient
   * cinq jours et sauve un plat qu'on a déjà mangé trois fois.
   */
  sauce?: string
  /**
   * Conservation du plat PRÉPARÉ, quand elle ne se déduit pas des ingrédients.
   *
   * Des flocons d'avoine tiennent des mois et du fromage blanc cinq jours ; mélangés
   * dans un bocal depuis la veille, l'ensemble tient trois jours. C'est la
   * préparation qui limite, pas un ingrédient — d'où cette valeur, qui l'emporte sur
   * le calcul quand elle est renseignée.
   */
  keeps?: number
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
    sauce: 'sauce-blanche',
    name: 'Boîte A — Poulet paprika, riz, brocolis',
    kind: 'boite',
    batch: true,
    steps: 'Frotte le poulet AVANT cuisson avec paprika fumé, ail en poudre, cumin, sel, poivre et un filet de citron : la marinade sèche fait plus pour le goût que n\'importe quelle sauce ajoutée après. Four 200 °C, 22 min. Riz à l\'eau. Brocolis et poivrons vapeur. L\'huile s\'ajoute APRÈS cuisson, directement dans la boîte : c\'est le poste où le déficit se perd. La sauce blanche se met dans un pot à part, jamais dans la boîte.',
    items: [
      { food: 'filet-de-poulet', g: 180 },
      { food: 'riz-basmati', g: 48 },
      { food: 'brocolis', g: 200 },
      { food: 'poivrons', g: 100 },
      { food: 'huile-d-olive', g: 10 },
      { food: 'paprika-fume', g: 2 },
      { food: 'ail-en-poudre', g: 3 },
      { food: 'cumin-moulu', g: 1 },
    ],
  },
  {
    id: 'boite-b',
    sauce: 'chimichurri',
    name: 'Boîte B — Bœuf cumin, pommes de terre',
    kind: 'boite',
    batch: true,
    steps: 'Bœuf poêlé à sec avec l\'oignon (il rend assez de gras), cumin et paprika jetés en fin de cuisson pour qu\'ils ne brûlent pas. Pommes de terre en cubes au four 200 °C, 30 min, avec l\'ail en poudre. Haricots verts vapeur. Le chimichurri à part réveille l\'ensemble au dernier moment.',
    items: [
      { food: 'steak-hache-5', g: 180 },
      { food: 'pommes-de-terre', g: 200 },
      { food: 'haricots-verts', g: 200 },
      { food: 'oignon', g: 50 },
      { food: 'huile-d-olive', g: 6 },
      { food: 'cumin-moulu', g: 2 },
      { food: 'paprika-fume', g: 2 },
      { food: 'ail-en-poudre', g: 2 },
    ],
  },
  {
    id: 'boite-c',
    sauce: 'vinaigrette-moutarde',
    name: 'Boîte C — Pâtes thon-tomate, courgettes',
    kind: 'boite',
    batch: true,
    steps: 'Pâtes al dente : elles finiront de cuire au réchauffage. Sauce oignon + ail + courgettes en dés + tomates concassées + herbes, thon ajouté hors du feu. Les cornichons se coupent au dernier moment : c\'est le croquant et l\'acide qui manquent toujours à un plat réchauffé. Le basilic se déchire À LA MAIN et se pose dans l\'assiette au dernier moment : cuit ou réchauffé, il noircit et ne sert plus à rien. Très bon froid, en salade de pâtes.',
    items: [
      { food: 'thon-au-naturel-egoutte', g: 160 },
      { food: 'pates-completes', g: 62 },
      { food: 'tomates-concassees', g: 200 },
      { food: 'courgettes', g: 200 },
      { food: 'oignon', g: 50 },
      { food: 'huile-d-olive', g: 8 },
      { food: 'ail', g: 5 },
      { food: 'herbes-de-provence', g: 2 },
      { food: 'cornichons', g: 20 },
      { food: 'basilic-frais', g: 10 },
    ],
  },
  {
    id: 'din-poisson',
    sauce: 'sauce-blanche',
    name: 'Poisson blanc citron-herbes, pommes de terre',
    kind: 'diner',
    batch: false,
    steps: 'Cabillaud en papillote au four, 15 min, avec citron, ail et herbes DANS la papillote — le poisson prend le goût en cuisant, il ne le prend plus après. Pommes de terre vapeur. Le poisson ne se réchauffe pas bien : s\'il te reste dix minutes le soir même, préfère le cuire à la minute.',
    items: [
      { food: 'cabillaud-colin', g: 220 },
      { food: 'pommes-de-terre', g: 230 },
      { food: 'haricots-verts', g: 250 },
      { food: 'huile-d-olive', g: 10 },
      { food: 'pain-complet', g: 20 },
      { food: 'citron', g: 20 },
      { food: 'ail', g: 5 },
      { food: 'herbes-de-provence', g: 2 },
    ],
  },
  {
    id: 'din-dinde',
    sauce: 'sauce-soja-gingembre',
    name: 'Dinde soja-gingembre, riz, courgettes',
    kind: 'diner',
    batch: false,
    steps: 'Dinde en lanières à la poêle très chaude avec les courgettes et les champignons. Sauce soja, gingembre râpé et ail en fin de cuisson, hors du feu : le gingembre cuit perd tout son mordant. Riz à côté.',
    items: [
      { food: 'escalope-de-dinde', g: 220 },
      { food: 'riz-basmati', g: 42 },
      { food: 'courgettes', g: 300 },
      { food: 'champignons', g: 100 },
      { food: 'huile-d-olive', g: 10 },
      { food: 'gingembre-frais', g: 8 },
      { food: 'ail', g: 5 },
      { food: 'sauce-soja', g: 15 },
    ],
  },
  {
    id: 'din-saumon',
    sauce: 'vinaigrette-moutarde',
    name: 'Saumon, patate douce, épinards',
    kind: 'diner',
    batch: false,
    steps: 'Saumon à la poêle côté peau, 4 min sans le retourner, puis 1 min sur l\'autre face. Patate douce en frites au four, saupoudrée de paprika fumé. Épinards poêlés à l\'ail, citron pressé dessus au moment de servir.',
    items: [
      { food: 'saumon', g: 170 },
      { food: 'patate-douce', g: 210 },
      { food: 'epinards', g: 250 },
      { food: 'huile-d-olive', g: 5 },
      { food: 'citron', g: 15 },
      { food: 'ail', g: 5 },
      { food: 'paprika-fume', g: 1 },
    ],
  },
  {
    id: 'din-omelette',
    sauce: 'sauce-tomate-piquante',
    name: 'Omelette-poêlée dinde et légumes',
    kind: 'diner',
    batch: false,
    steps: '3 œufs ENTIERS, jaunes compris — aucun gaspillage. Dinde émincée saisie d\'abord, puis les légumes et l\'ail, puis les œufs battus par-dessus. Persil frais jeté à la fin, hors du feu. 10 min chrono.',
    items: [
      { food: 'ufs-entiers', g: 165 },
      { food: 'escalope-de-dinde', g: 100 },
      { food: 'poivrons', g: 150 },
      { food: 'champignons', g: 100 },
      { food: 'epinards', g: 100 },
      { food: 'pain-complet', g: 20 },
      { food: 'huile-d-olive', g: 3 },
      { food: 'ail', g: 5 },
      { food: 'cumin-moulu', g: 1 },
      { food: 'persil-frais', g: 10 },
    ],
  },
  {
    id: 'din-poulet',
    sauce: 'sauce-cesar',
    name: 'Poulet, lentilles, salade',
    kind: 'diner',
    batch: true,
    steps: 'Lentilles 20 min à l\'eau non salée, avec une gousse d\'ail entière dedans — à cuire pendant la session de cuisine, elles se gardent 4 jours. Poulet grillé, citron pressé dessus. Salade ajoutée au moment de manger, jamais avant : elle rend de l\'eau et se flétrit en une heure.',
    items: [
      { food: 'filet-de-poulet', g: 200 },
      { food: 'lentilles-vertes', g: 45 },
      { food: 'salade-verte', g: 100 },
      { food: 'tomates-concassees', g: 100 },
      { food: 'huile-d-olive', g: 8 },
      { food: 'ail', g: 5 },
      { food: 'herbes-de-provence', g: 2 },
      { food: 'citron', g: 15 },
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
  // ─── Les petits-déjeuners ─────────────────────────────────────────────────
  //
  // Tous calés sur les mêmes macros que le porridge : environ 540 kcal et 54 g de
  // protéines. C'est la condition pour qu'en changer ne décale pas la journée — un
  // petit-déjeuner « au choix » qui fait 200 kcal de plus n'est pas un choix, c'est
  // un piège. Deux d'entre eux se préparent la veille, parce que le vrai obstacle à
  // 10 h au bureau n'est pas l'envie, c'est le temps.
  {
    id: 'pdj-overnight',
    keeps: 3,
    name: 'Overnight oats fruits rouges',
    kind: 'pdj',
    batch: true,
    steps: 'La veille au soir, ou trois pots d\'un coup le dimanche : avoine, fromage blanc, whey, chia et cannelle dans un bocal, fruits rouges surgelés par-dessus (ils décongèlent pendant la nuit et colorent tout). Rien à faire le matin, ça se mange froid, à la cuillère, au bureau. Se garde 3 jours au frigo.',
    items: [
      { food: 'flocons-d-avoine', g: 60 },
      { food: 'fromage-blanc-0', g: 250 },
      { food: 'whey-poudre', g: 30 },
      { food: 'fruits-rouges-surgeles', g: 100 },
      { food: 'graines-de-chia', g: 8 },
      { food: 'cannelle', g: 2 },
    ],
  },
  {
    id: 'pdj-smoothie',
    name: 'Smoothie du matin (à boire)',
    kind: 'pdj',
    batch: false,
    steps: 'Pour les matins où rien ne passe : un liquide se boit quand un bol ne s\'avale pas. Lait écrémé, whey, avoine mixée, fruits rouges, cannelle. Trente secondes au blender, et ça se finit dans la voiture ou devant l\'ordinateur.',
    items: [
      { food: 'lait-ecreme', g: 250 },
      { food: 'whey-poudre', g: 42 },
      { food: 'flocons-d-avoine', g: 62 },
      { food: 'fruits-rouges-surgeles', g: 100 },
      { food: 'cannelle', g: 2 },
    ],
  },
  {
    id: 'pdj-cheesecake',
    name: 'Bol cheesecake pomme-cannelle',
    kind: 'pdj',
    batch: false,
    steps: 'Fromage blanc fouetté avec la whey pour qu\'il devienne mousseux — c\'est le fouet qui fait la texture, pas un ingrédient de plus. Pomme râpée avec la peau, avoine par-dessus, cannelle généreuse. Le goût de dessert pour les macros d\'un petit-déjeuner.',
    items: [
      { food: 'fromage-blanc-0', g: 300 },
      { food: 'whey-poudre', g: 28 },
      { food: 'flocons-d-avoine', g: 50 },
      { food: 'pomme', g: 150 },
      { food: 'cannelle', g: 2 },
    ],
  },
  {
    id: 'pdj-sale',
    name: 'Œufs brouillés, pain complet',
    kind: 'pdj',
    batch: false,
    steps: 'La version salée, pour les matins où le sucré écœure. Œufs brouillés à feu DOUX en remuant sans arrêt (le feu vif les rend caoutchouteux), pain complet grillé, fromage blanc à côté avec ciboulette et poivre. Huit minutes.',
    items: [
      { food: 'ufs-entiers', g: 165 },
      { food: 'pain-complet', g: 70 },
      { food: 'fromage-blanc-0', g: 200 },
      { food: 'whey-poudre', g: 12 },
      { food: 'ail', g: 2 },
    ],
  },

  // ─── Les collations ───────────────────────────────────────────────────────
  //
  // Celle de 17 h se mange au bureau : elle doit tenir dans un sac et se manger sans
  // vaisselle. Celle du soir vise la caséine, qui se digère lentement et ralentit la
  // dégradation musculaire pendant la nuit.
  {
    id: 'col-cacao',
    name: 'Fromage blanc au cacao',
    kind: 'collation',
    batch: false,
    steps: 'Cacao NON SUCRÉ (pas du chocolat en poudre, qui est du sucre à 80 %), whey, un peu d\'édulcorant si besoin. Délaie le cacao avec une cuillère d\'eau chaude avant de l\'incorporer, sinon il reste en grumeaux. Goût de mousse au chocolat pour 15 kcal de cacao.',
    items: [
      { food: 'fromage-blanc-0', g: 200 },
      { food: 'whey-poudre', g: 15 },
      { food: 'cacao-maigre', g: 5 },
    ],
  },
  {
    id: 'col-skyr',
    name: 'Skyr et fruits rouges',
    kind: 'collation',
    batch: false,
    steps: 'Le skyr est plus épais et plus protéiné que le fromage blanc, donc plus rassasiant à calories égales. Fruits rouges surgelés sortis le matin : ils auront décongelé pour 17 h et rendu leur jus.',
    items: [
      { food: 'skyr', g: 200 },
      { food: 'fruits-rouges-surgeles', g: 100 },
      { food: 'cannelle', g: 1 },
    ],
  },
  {
    id: 'col-mousse',
    keeps: 2,
    name: 'Mousse whey-aquafaba',
    kind: 'collation',
    batch: true,
    steps: 'L\'eau d\'une boîte de pois chiche montée en neige ferme au batteur (3 à 4 min, elle monte comme un blanc d\'œuf), puis la whey et le cacao incorporés DÉLICATEMENT à la spatule pour ne pas la casser. Un volume énorme pour presque rien : c\'est le meilleur rapport satiété/calories du plan. Se garde 48 h au frigo, elle retombe un peu, c\'est normal.',
    items: [
      { food: 'aquafaba', g: 150 },
      { food: 'whey-poudre', g: 30 },
      { food: 'cacao-maigre', g: 4 },
    ],
  },
  {
    id: 'col-oeufs',
    keeps: 5,
    name: 'Œufs durs et cornichons',
    kind: 'collation',
    batch: true,
    steps: 'La collation salée, à cuire par six le dimanche : 9 min dans l\'eau bouillante, puis eau glacée pour qu\'ils s\'écalent sans arracher le blanc. Se gardent 5 jours en coquille. Les cornichons apportent le croquant et l\'acide qui manquent à 17 h.',
    items: [
      { food: 'ufs-entiers', g: 110 },
      { food: 'cornichons', g: 50 },
    ],
  },
  {
    id: 'col-shaker',
    name: 'Shaker lait-whey',
    kind: 'collation',
    batch: false,
    steps: 'La solution des jours pressés : poudre dans le shaker le matin, lait ajouté à 17 h. Aucune vaisselle, aucune excuse. Le lait ralentit la digestion par rapport à l\'eau, donc ça cale mieux.',
    items: [
      { food: 'lait-ecreme', g: 250 },
      { food: 'whey-poudre', g: 22 },
    ],
  },
  {
    id: 'col-soir-cacahuete',
    name: 'Fromage blanc, beurre de cacahuète',
    kind: 'collation',
    batch: false,
    steps: 'Pour le soir : la caséine du fromage blanc se digère lentement, le gras de la cacahuète ralentit encore le transit. Une cuillère À CAFÉ, pas à soupe — c\'est 600 kcal aux 100 g, l\'aliment le plus facile à sous-estimer de toute la table.',
    items: [
      { food: 'fromage-blanc-0', g: 180 },
      { food: 'beurre-de-cacahuete', g: 8 },
      { food: 'cannelle', g: 1 },
    ],
  },

  // ─── Les sauces ───────────────────────────────────────────────────────────
  //
  // Toutes se préparent en une fois le jour de la cuisine, se gardent dans un pot
  // fermé, et s'ajoutent au moment de manger. Aucune ne dépasse 90 kcal la portion,
  // et la plupart apportent des protéines plutôt que des calories vides — le yaourt
  // grec 0 % remplace la crème et la mayonnaise à peu près partout.
  {
    id: 'sauce-blanche',
    name: 'Sauce blanche citron-ail',
    kind: 'sauce',
    batch: true,
    steps: 'Yaourt grec, jus de citron, ail écrasé, herbes, sel, poivre. Fouette 30 secondes. Se garde 5 jours au frigo dans un pot fermé — fais-en pour toute la semaine d\'un coup.',
    items: [
      { food: 'yaourt-grec-0', g: 100 },
      { food: 'citron', g: 10 },
      { food: 'ail', g: 5 },
      { food: 'herbes-de-provence', g: 1 },
    ],
  },
  {
    id: 'sauce-soja-gingembre',
    name: 'Sauce soja-gingembre',
    kind: 'sauce',
    batch: true,
    steps: 'Sauce soja, gingembre râpé, ail, vinaigre balsamique, piment. Rien à cuire. Elle réveille n\'importe quel riz et n\'importe quelle volaille — et elle ne coûte presque rien.',
    items: [
      { food: 'sauce-soja', g: 20 },
      { food: 'gingembre-frais', g: 5 },
      { food: 'ail', g: 3 },
      { food: 'vinaigre-balsamique', g: 5 },
      { food: 'piment-en-poudre', g: 0.5 },
    ],
  },
  {
    id: 'sauce-curry',
    name: 'Sauce curry-yaourt',
    kind: 'sauce',
    batch: true,
    steps: 'Yaourt grec, curry, un peu de citron, ail. Laisse reposer 10 min : le curry a besoin de ce temps pour se réhydrater, sinon il reste poudreux.',
    items: [
      { food: 'yaourt-grec-0', g: 90 },
      { food: 'curry-poudre', g: 3 },
      { food: 'citron', g: 10 },
      { food: 'ail', g: 3 },
    ],
  },
  {
    id: 'sauce-tomate-piquante',
    name: 'Sauce tomate piquante',
    kind: 'sauce',
    batch: true,
    steps: 'Concentré de tomate détendu avec un peu d\'eau, ail, paprika fumé, piment, vinaigre. Deux minutes à la casserole suffisent. C\'est la sauce qui pardonne le plus : elle rattrape une viande un peu sèche.',
    items: [
      { food: 'concentre-tomate', g: 30 },
      { food: 'ail', g: 5 },
      { food: 'paprika-fume', g: 2 },
      { food: 'piment-en-poudre', g: 0.5 },
      { food: 'vinaigre-balsamique', g: 10 },
    ],
  },
  {
    id: 'vinaigrette-moutarde',
    name: 'Vinaigrette moutarde sans huile',
    kind: 'sauce',
    batch: true,
    steps: 'Moutarde, vinaigre balsamique, une cuillère d\'eau, herbes. Secoue dans un bocal. Vingt kcal au lieu de cent vingt : c\'est l\'huile qu\'on retire, pas le goût.',
    items: [
      { food: 'moutarde-dijon', g: 10 },
      { food: 'vinaigre-balsamique', g: 15 },
      { food: 'herbes-de-provence', g: 1 },
    ],
  },
  {
    id: 'sauce-cesar',
    name: 'Sauce césar allégée',
    kind: 'sauce',
    batch: true,
    steps: 'Yaourt grec, moutarde, levure maltée, citron, ail. La levure maltée fait le goût de parmesan — c\'est elle qui rend la chose crédible.',
    items: [
      { food: 'yaourt-grec-0', g: 80 },
      { food: 'moutarde-dijon', g: 5 },
      { food: 'levure-maltee', g: 5 },
      { food: 'citron', g: 10 },
      { food: 'ail', g: 3 },
    ],
  },
  {
    id: 'sauce-basilic',
    name: 'Sauce yaourt-basilic',
    kind: 'sauce',
    batch: true,
    steps: 'Basilic haché au couteau (le mixeur le fait noircir), yaourt grec, ail, citron, une cuillère d\'huile. Celle-ci ne se garde que 3 jours, contre 5 pour les autres : le basilic frais ne tient pas plus. Fais-en moins, plus souvent.',
    items: [
      { food: 'yaourt-grec-0', g: 90 },
      { food: 'basilic-frais', g: 15 },
      { food: 'ail', g: 3 },
      { food: 'citron', g: 5 },
      { food: 'huile-d-olive', g: 2 },
    ],
  },
  {
    id: 'chimichurri',
    name: 'Chimichurri',
    kind: 'sauce',
    batch: true,
    steps: 'Persil haché très fin, ail, vinaigre, huile d\'olive, piment. Une seule cuillère d\'huile pour toute la sauce : le persil et l\'acide font le reste. Née pour la viande rouge, excellente sur les pommes de terre.',
    items: [
      { food: 'persil-frais', g: 20 },
      { food: 'ail', g: 5 },
      { food: 'vinaigre-balsamique', g: 10 },
      { food: 'huile-d-olive', g: 5 },
      { food: 'piment-en-poudre', g: 0.5 },
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
