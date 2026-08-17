// ─────────────────────────────────────────────
// Programme recomp — points faibles pec/bras/abdos, jambes maintien + sprint
// ─────────────────────────────────────────────

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: string
  muscles: string[]
  cues: string[]
  machine: string
  bodyweight?: boolean // charge = poids de corps (+ lest) — préremplie avec le poids du profil
  superset?: [string, string] // 2 mouvements enchaînés — saisie d'une charge par mouvement
  /**
   * Repos entre deux séries de travail, en SECONDES.
   *
   * Réglé sur le mouvement et non sur les reps : le nombre de reps dit la charge,
   * le repos dépend de ce que la série a coûté. Non renseigné → déduit des reps
   * par `restFor` dans lib/rest.ts.
   */
  rest?: number
}

// Plan de sprint détaillé, avec variante extérieur (piste) et tapis
export interface SprintPlan {
  title: string
  goal: string
  warmup: string[]
  protocol: { label: string; value: string }[]
  exterieur: string[]
  tapis: string[]
  tapisNote: string
  cues: string[]
  cooldown: string
}

export interface Session {
  id: string
  name: string
  tag: string
  color: string
  sprint: SprintPlan | null
  exercises: Exercise[]
}

// Séance de sprint partagée par les jours « + Sprint » (mardi & vendredi)
export const SPRINT: SprintPlan = {
  title: 'Sprints — fin de séance',
  goal: 'Développer puissance et explosivité sans casser la récup des jambes. On reste à ~90 %, jamais à fond : la qualité prime sur la quantité.',
  warmup: [
    '5 min footing léger pour monter la température',
    'Mobilité : montées de genoux, talons-fesses, pas chassés (2 × 20 m)',
    '3 accélérations progressives sur 60 m : 60 %, puis 70 %, puis 80 %',
  ],
  protocol: [
    { label: 'Séries', value: '5 à 6' },
    { label: 'Effort', value: '60–80 m · 10–15 s' },
    { label: 'Intensité', value: '85–90 %' },
    { label: 'Récup', value: '2 min marche' },
  ],
  exterieur: [
    'Surface souple de préférence : piste synthétique, herbe sèche. Évite le bitume dur.',
    'Départ debout, accélération progressive sur les 20 premiers mètres.',
    'Tiens la vitesse max sur 30–40 m, sans crisper.',
    'Décélère en douceur sur 15–20 m — ne t\'arrête jamais net.',
  ],
  tapis: [
    'Règle la vitesse AVANT de lancer l\'effort : sur tapis on sprinte à vitesse fixe.',
    'Vitesse cible ≈ 15–18 km/h (commence plus bas et monte semaine après semaine).',
    'Inclinaison 1–2 % pour se rapprocher des conditions extérieures.',
    'Attache la pince d\'arrêt d\'urgence à toi — obligatoire.',
    'Pieds sur les rails latéraux, lance le tapis, attends la vitesse, puis pose-toi sur la bande (mains aux barres au départ si besoin).',
    'Sprinte 10–15 s, puis repose les pieds sur les rails (laisse le tapis tourner) pour la récup.',
  ],
  tapisNote: 'Sur tapis, raisonne en TEMPS (10–15 s) plutôt qu\'en distance, et ne descends jamais du tapis à pleine vitesse.',
  cues: [
    'Grandis-toi, buste très légèrement en avant.',
    'Bras actifs qui rythment la foulée, mains et épaules relâchées.',
    'Appuis sur l\'avant du pied, fréquence élevée plutôt que grandes enjambées.',
  ],
  cooldown: '5 min de marche + étirements légers ischios/mollets. Idéalement un week-end de récup derrière.',
}

export const PROGRAM: Session[] = [
  {
    id: 's1',
    name: 'Pecs, Épaules & Triceps',
    tag: 'Lundi · Push',
    color: '#8b6f5c',
    sprint: null,
    exercises: [
      { id: 'dc-barre', name: 'Développé couché barre', sets: 4, reps: '6-8', rest: 180, muscles: ['pecs', 'epaules-av', 'triceps'], cues: ['Omoplates serrées, pieds ancrés au sol', 'Barre au niveau des mamelons, coudes ~45°', 'Pousse en explosif, descends en 2 sec'], machine: 'Alternative On Air : machine convergente si les barres sont prises' },
      { id: 'di-halteres', name: 'Développé incliné haltères', sets: 3, reps: '8-10', rest: 120, muscles: ['pecs', 'epaules-av'], cues: ['Banc à 30° max, pas plus', "Descends jusqu'à l'étirement du pec", 'Ne claque pas les haltères en haut'], machine: '' },
      { id: 'dev-mil', name: 'Développé militaire haltères', sets: 2, reps: '8-10', rest: 120, muscles: ['epaules-av', 'epaules-lat', 'triceps'], cues: ['Assis dossier à 85°', 'Descends les haltères au niveau des oreilles', "Gainage serré, pas d'arche lombaire"], machine: 'Alternative : machine développé épaules' },
      { id: 'elev-lat', name: 'Élévations latérales', sets: 3, reps: '15', rest: 75, muscles: ['epaules-lat'], cues: ["Monte jusqu'à l'horizontale, pas plus", 'Petit doigt légèrement vers le haut', 'Léger et strict > lourd et moche'], machine: 'Ou poulie basse unilatéral' },
      { id: 'dips', name: 'Dips lestés', sets: 3, reps: '8-12', rest: 150, muscles: ['pecs', 'triceps'], cues: ['Buste penché en avant = pec, droit = triceps', "Descends jusqu'à 90° aux coudes", 'Charge préremplie avec ton poids de corps — ajoute ton lest par-dessus dès que tu passes 12 reps'], machine: 'Alternative : machine à dips assis', bodyweight: true },
      { id: 'crunch-cable', name: 'Crunch à la poulie', sets: 3, reps: '12-15', rest: 60, muscles: ['abdos'], cues: ['À genoux face à la poulie haute', 'Enroule la colonne, ne tire pas avec les bras', 'Charge progressive'], machine: '' },
    ],
  },
  {
    id: 's2',
    name: 'Dos & Biceps',
    tag: 'Mardi + Sprint',
    color: '#5f7a6b',
    sprint: SPRINT,
    exercises: [
      { id: 'tirage-v', name: 'Tirage vertical', sets: 3, reps: '8-10', rest: 120, muscles: ['dos', 'biceps'], cues: ['Prise légèrement plus large que les épaules', 'Tire vers le haut des pecs, coudes vers le bas', 'Ne te balance pas en arrière'], machine: 'Ou tractions lestées si maîtrisées' },
      { id: 'rowing-m', name: 'Rowing machine', sets: 4, reps: '8-10', rest: 120, muscles: ['dos', 'biceps'], cues: ['Poitrine collée au support', 'Tire les coudes en arrière, serre les omoplates', 'Pause 1 sec en contraction'], machine: 'Machine rowing assis prise neutre' },
      { id: 'lombaires', name: 'Extensions lombaires (banc)', sets: 3, reps: '12-15', rest: 75, muscles: ['lombaires', 'fessiers'], cues: ['Buste qui descend lentement, dos neutre', "Remonte jusqu'à l'alignement, sans cambrer à l'excès", 'Serre les fessiers en haut', '1-2 tenues de 5 s en haut sur la dernière série', 'Disque contre la poitrine quand 15 reps deviennent faciles (note le lest, 0 = poids de corps)'], machine: 'Banc à lombaires 45° ou banc romain' },
      { id: 'face-pull', name: 'Face pull', sets: 3, reps: '15', rest: 75, muscles: ['epaules-ar', 'dos'], cues: ['Poulie à hauteur du visage, corde', 'Tire vers le front en écartant', 'Rotation externe en fin de mouvement'], machine: '' },
      { id: 'oiseau', name: 'Oiseau (reverse fly)', sets: 3, reps: '15', rest: 75, muscles: ['epaules-ar'], cues: ['Buste penché à ~90°, dos plat', 'Écarte les bras en serrant les omoplates', "Léger et strict, aucun élan — monte jusqu'à l'horizontale"], machine: 'Haltères, poulies croisées ou pec deck inversé' },
      { id: 'curl-marteau', name: 'Curl marteau (hammer)', sets: 3, reps: '10-12', rest: 90, muscles: ['biceps', 'avant-bras'], cues: ['Prise NEUTRE (paumes qui se font face), poignets verrouillés', "Travaille le brachial (sous le biceps) + le long chef → l'épaisseur du bras", 'Contrôle la descente 2-3 s, aucun élan'], machine: 'Haltères, ou corde à la poulie basse' },
    ],
  },
  {
    id: 's3',
    name: 'Jambes',
    tag: 'Jeudi · maintien',
    color: '#b07d2e',
    sprint: null,
    exercises: [
      { id: 'squat', name: 'Squat', sets: 3, reps: '6-8', rest: 180, muscles: ['quadris', 'fessiers'], cues: ['Descends sous la parallèle si mobilité OK', "Genoux dans l'axe des pieds", 'Gainage avant de descendre'], machine: '' },
      { id: 'sdt-r', name: 'Soulevé de terre roumain', sets: 3, reps: '8-10', rest: 180, muscles: ['ischios', 'fessiers', 'dos'], cues: ['Hanches en arrière, genoux quasi fixes', 'Barre collée aux jambes', 'Étirement ischio puis remonte avec les hanches'], machine: '' },
      { id: 'fentes', name: 'Fentes marchées', sets: 2, reps: '10/j', rest: 150, muscles: ['quadris', 'fessiers'], cues: ['Grand pas, genou arrière frôle le sol', 'Buste droit', 'Haltères le long du corps'], machine: 'Ou presse unilatérale' },
      { id: 'leg-curl', name: 'Leg curl (ischios)', sets: 3, reps: '10-12', rest: 90, muscles: ['ischios'], cues: ['Contrôle la descente (2-3 s)', 'Amplitude complète, sans à-coup', 'Bassin plaqué au banc, pas de coup de rein'], machine: 'Machine leg curl allongé ou assis' },
      { id: 'mollets', name: 'Mollets debout', sets: 3, reps: '12-15', rest: 75, muscles: ['mollets'], cues: ['Amplitude complète, pause en bas', 'Monte sur la pointe max', 'Pas de rebond'], machine: 'Machine debout ou à la presse' },
      { id: 'releves', name: 'Relevés de jambes suspendu', sets: 3, reps: '12', rest: 60, muscles: ['abdos'], cues: ['Enroule le bassin, pas juste les jambes', 'Contrôle la descente', "Lest chevilles quand c'est facile"], machine: '' },
    ],
  },
  {
    id: 's4',
    name: 'Pecs & Bras',
    tag: 'Vendredi + Sprint',
    color: '#9a6a4f',
    sprint: SPRINT,
    exercises: [
      { id: 'dev-halteres', name: 'Développé couché haltères', sets: 4, reps: '8-10', rest: 120, muscles: ['pecs', 'epaules-av', 'triceps'], cues: ["Amplitude plus grande qu'à la barre", "Descends jusqu'à l'étirement", 'Trajectoire en léger arc de cercle'], machine: '' },
      { id: 'ecartes', name: 'Écartés à la poulie', sets: 3, reps: '12-15', rest: 75, muscles: ['pecs'], cues: ['Léger arrondi des coudes, fixe', 'Croise légèrement les mains devant', 'Tension continue, pas de repos en haut'], machine: 'Ou au pec deck' },
      { id: 'tractions', name: 'Tractions (+ tenues)', sets: 4, reps: 'max', rest: 150, muscles: ['dos', 'biceps'], cues: ['Note le nombre de reps à chaque série — objectif : battre ton total', 'Charge préremplie avec ton poids de corps ; ajoute du lest par-dessus dès que tu passes 10-12 reps propres', 'Finis chaque série par 1-2 tractions TENUES : menton au-dessus de la barre, tiens 5-10 s', 'Descente lente et contrôlée (2-3 s) — le négatif fait grossir le dos'], machine: 'Barre de traction — assistance élastique/machine si besoin', bodyweight: true },
      { id: 'ss-bras', name: 'Superset triceps : pushdown + extension', sets: 3, reps: '12+12', rest: 120, muscles: ['triceps'], cues: ['12 pushdowns à la corde (poulie haute)', 'Puis SANS repos, 12 extensions au-dessus de la tête (corde, poulie basse)', 'Repos seulement après les deux exos, puis on recommence', 'Deux angles : chef latéral (pushdown) + longue portion (overhead) = triceps complet'], machine: "Poulie corde — haute pour le pushdown, basse pour l'overhead", superset: ['Pushdown', 'Overhead'] },
      { id: 'curl-21', name: 'Curl 21 (méthode 7-7-7)', sets: 3, reps: '7+7+7 (21)', rest: 90, muscles: ['biceps'], cues: ['7 reps sur la moitié basse (bas → milieu)', '7 reps sur la moitié haute (milieu → haut)', '7 reps en amplitude complète', "Charge légère, aucun élan — c'est la brûlure qui fait le boulot"], machine: 'Barre EZ, haltères ou poulie basse' },
    ],
  },
]

export const ALL_EXERCISES = PROGRAM.flatMap(s => s.exercises)

// Fourchette de reps → borne haute pour la suggestion de progression
export function topOfRange(reps: string): number | null {
  const m = reps.match(/(\d+)\s*-\s*(\d+)/)
  return m ? parseInt(m[2], 10) : null
}

/**
 * Borne BASSE de la fourchette. « 8-10 » → 8 ; « 15 » → 15 (une valeur seule est
 * ses deux bornes à la fois).
 *
 * Elle sert à distinguer les deux situations que le ressenti « à l'échec » ne
 * distingue pas tout seul : arriver à l'échec À 8 reps sur du 8-10, c'est la
 * série qu'on voulait ; arriver à l'échec à 5, c'est une charge trop lourde.
 * Sans cette borne, les deux donnaient le même conseil — redescendre.
 */
export function bottomOfRange(reps: string): number | null {
  const range = reps.match(/(\d+)\s*-\s*(\d+)/)
  if (range) return parseInt(range[1], 10)
  const single = reps.match(/(\d+)/)
  return single ? parseInt(single[1], 10) : null
}

// Incrément suggéré selon le groupe musculaire
export function suggestedIncrement(ex: Exercise): number {
  const lower = ['quadris', 'ischios', 'fessiers', 'mollets']
  return ex.muscles.some(m => lower.includes(m)) ? 5 : 2.5
}

// ─────────────────────────────────────────────
// Tracés SVG des zones musculaires (viewBox 0 0 100 140)
// ─────────────────────────────────────────────
export const MUSCLE_PATHS_FRONT: Record<string, string> = {
  'pecs': 'M32,34 Q40,30 48,34 L48,46 Q40,50 32,46 Z M52,34 Q60,30 68,34 L68,46 Q60,50 52,46 Z',
  'epaules-av': 'M22,30 Q28,24 33,30 L31,40 Q25,40 22,36 Z M67,30 Q72,24 78,30 L78,36 Q75,40 69,40 Z',
  'epaules-lat': 'M20,32 Q17,36 19,42 L25,40 Q22,36 24,31 Z M80,32 Q83,36 81,42 L75,40 Q78,36 76,31 Z',
  'biceps': 'M20,44 Q24,42 27,45 L26,58 Q22,60 19,57 Z M73,45 Q76,42 80,44 L81,57 Q78,60 74,58 Z',
  'avant-bras': 'M17,60 Q21,58 25,60 L23,74 Q20,76 17,73 Z M75,60 Q79,58 83,60 L83,73 Q80,76 77,74 Z',
  'abdos': 'M40,50 L60,50 L58,74 Q50,78 42,74 Z',
  'quadris': 'M38,80 Q44,78 47,82 L46,106 Q42,110 38,106 Z M53,82 Q56,78 62,80 L62,106 Q58,110 54,106 Z',
  'mollets': 'M39,112 Q43,110 46,113 L45,128 Q42,130 39,127 Z M54,113 Q57,110 61,112 L61,127 Q58,130 55,128 Z',
}

export const MUSCLE_PATHS_BACK: Record<string, string> = {
  'dos': 'M33,30 Q50,26 67,30 L64,58 Q50,64 36,58 Z',
  'lombaires': 'M41,57 Q50,55 59,57 L58,65 Q50,67 42,65 Z',
  'epaules-ar': 'M22,30 Q28,24 33,30 L31,39 Q25,39 22,36 Z M67,30 Q72,24 78,30 L78,36 Q75,39 69,39 Z',
  'triceps': 'M20,43 Q24,41 27,44 L26,58 Q22,60 19,56 Z M73,44 Q76,41 80,43 L81,56 Q78,60 74,58 Z',
  'fessiers': 'M38,62 Q50,58 62,62 L61,78 Q50,84 39,78 Z',
  'ischios': 'M38,82 Q44,80 47,84 L46,105 Q42,108 38,104 Z M53,84 Q56,80 62,82 L62,104 Q58,108 54,105 Z',
  'mollets': 'M39,110 Q43,108 46,111 L45,127 Q42,129 39,126 Z M54,111 Q57,108 61,110 L61,126 Q58,129 55,127 Z',
}
