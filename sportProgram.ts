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
}

export interface Session {
  id: string
  name: string
  tag: string
  color: string
  sprint: { title: string; detail: string } | null
  exercises: Exercise[]
}

export const PROGRAM: Session[] = [
  {
    id: 's1',
    name: 'Pec · Bras A',
    tag: 'Lundi',
    color: '#3D6BFF',
    sprint: null,
    exercises: [
      { id: 'dc-barre', name: 'Développé couché barre', sets: 4, reps: '6-8', muscles: ['pecs', 'epaules-av', 'triceps'], cues: ['Omoplates serrées, pieds ancrés au sol', 'Barre au niveau des mamelons, coudes ~45°', 'Pousse en explosif, descends en 2 sec'], machine: 'Alternative On Air : machine convergente si les barres sont prises' },
      { id: 'di-halteres', name: 'Développé incliné haltères', sets: 3, reps: '8-10', muscles: ['pecs', 'epaules-av'], cues: ['Banc à 30° max, pas plus', "Descends jusqu'à l'étirement du pec", 'Ne claque pas les haltères en haut'], machine: 'Cible le haut des pecs — ta priorité visuelle' },
      { id: 'dips', name: 'Dips lestés', sets: 3, reps: '8-12', muscles: ['pecs', 'triceps'], cues: ['Buste penché en avant = pec, droit = triceps', "Descends jusqu'à 90° aux coudes", 'Ajoute du lest dès que tu passes 12 reps'], machine: 'Alternative : machine à dips assis' },
      { id: 'curl-ez', name: 'Curl barre EZ', sets: 3, reps: '8-10', muscles: ['biceps'], cues: ['Coudes collés au buste, zéro élan', 'Contrôle la descente (2-3 sec)', 'Contraction max en haut'], machine: 'Barre EZ = poignets préservés' },
      { id: 'ext-corde', name: 'Extension triceps corde', sets: 3, reps: '10-12', muscles: ['triceps'], cues: ['Coudes fixes le long du corps', 'Écarte la corde en bas du mouvement', 'Ne laisse pas les coudes partir en avant'], machine: 'Poulie haute, corde' },
      { id: 'curl-incline', name: 'Curl incliné haltères', sets: 2, reps: '12', muscles: ['biceps'], cues: ['Banc à 45°, bras qui pendent en arrière', 'Étirement max du biceps en bas', 'Charge légère, exécution stricte'], machine: "Le meilleur étirement biceps qui existe" },
      { id: 'crunch-cable', name: 'Crunch à la poulie', sets: 3, reps: '12-15', muscles: ['abdos'], cues: ['À genoux face à la poulie haute', 'Enroule la colonne, ne tire pas avec les bras', 'Charge progressive comme un vrai muscle'], machine: 'Les abdos se chargent — pas de séries infinies' },
    ],
  },
  {
    id: 's2',
    name: 'Dos · Épaules',
    tag: 'Mardi + Sprint',
    color: '#00C9A7',
    sprint: { title: 'Sprint fin de séance', detail: 'Échauffement : 3 accélérations progressives 60-70-80 %. Puis 5-6 × 60-80 m à 85-90 %, récup 2 min marchée.' },
    exercises: [
      { id: 'tirage-v', name: 'Tirage vertical', sets: 4, reps: '8-10', muscles: ['dos', 'biceps'], cues: ['Prise légèrement plus large que les épaules', 'Tire vers le haut des pecs, coudes vers le bas', 'Ne te balance pas en arrière'], machine: 'Ou tractions lestées si tu les maîtrises' },
      { id: 'rowing-m', name: 'Rowing machine', sets: 4, reps: '8-10', muscles: ['dos', 'biceps'], cues: ['Poitrine collée au support', 'Tire les coudes en arrière, serre les omoplates', 'Pause 1 sec en contraction'], machine: 'Machine rowing assis prise neutre' },
      { id: 'dev-mil', name: 'Développé militaire haltères', sets: 3, reps: '8-10', muscles: ['epaules-av', 'epaules-lat', 'triceps'], cues: ['Assis dossier à 85°', 'Descends les haltères au niveau des oreilles', "Gainage serré, pas d'arche lombaire"], machine: 'Alternative : machine développé épaules' },
      { id: 'elev-lat', name: 'Élévations latérales', sets: 3, reps: '15', muscles: ['epaules-lat'], cues: ["Monte jusqu'à l'horizontale, pas plus", 'Petit doigt légèrement vers le haut', 'Léger et strict > lourd et moche'], machine: 'Ou poulie basse unilatéral' },
      { id: 'face-pull', name: 'Face pull', sets: 2, reps: '15', muscles: ['epaules-ar', 'dos'], cues: ['Poulie à hauteur du visage, corde', 'Tire vers le front en écartant', 'Rotation externe en fin de mouvement'], machine: "Santé d'épaule — non négociable" },
    ],
  },
  {
    id: 's3',
    name: 'Jambes',
    tag: 'Jeudi · maintien',
    color: '#FFB020',
    sprint: null,
    exercises: [
      { id: 'squat', name: 'Squat', sets: 3, reps: '6-8', muscles: ['quadris', 'fessiers'], cues: ['Descends sous la parallèle si mobilité OK', "Genoux dans l'axe des pieds", 'Gainage avant de descendre'], machine: 'Ton point fort — 3 séries lourdes suffisent' },
      { id: 'sdt-r', name: 'Soulevé de terre roumain', sets: 3, reps: '8-10', muscles: ['ischios', 'fessiers', 'dos'], cues: ['Hanches en arrière, genoux quasi fixes', 'Barre collée aux jambes', 'Étirement ischio puis remonte avec les hanches'], machine: 'Protège aussi tes ischios pour le sprint' },
      { id: 'fentes', name: 'Fentes marchées', sets: 2, reps: '10/j', muscles: ['quadris', 'fessiers'], cues: ['Grand pas, genou arrière frôle le sol', 'Buste droit', 'Haltères le long du corps'], machine: 'Ou presse unilatérale' },
      { id: 'mollets', name: 'Mollets debout', sets: 3, reps: '12-15', muscles: ['mollets'], cues: ['Amplitude complète, pause en bas', 'Monte sur la pointe max', 'Pas de rebond'], machine: 'Machine debout ou à la presse' },
      { id: 'releves', name: 'Relevés de jambes suspendu', sets: 3, reps: '12', muscles: ['abdos'], cues: ['Enroule le bassin, pas juste les jambes', 'Contrôle la descente', "Lest chevilles quand c'est facile"], machine: '2e stimulus abdos de la semaine' },
    ],
  },
  {
    id: 's4',
    name: 'Pec · Bras B',
    tag: 'Vendredi + Sprint',
    color: '#3D6BFF',
    sprint: { title: 'Sprint fin de séance', detail: 'Échauffement : 3 accélérations progressives 60-70-80 %. Puis 5-6 × 60-80 m à 85-90 %, récup 2 min marchée. Week-end de récup derrière.' },
    exercises: [
      { id: 'dev-halteres', name: 'Développé couché haltères', sets: 4, reps: '8-10', muscles: ['pecs', 'epaules-av', 'triceps'], cues: ["Amplitude plus grande qu'à la barre", "Descends jusqu'à l'étirement", 'Trajectoire en léger arc de cercle'], machine: 'Variante du lundi — angle différent' },
      { id: 'ecartes', name: 'Écartés à la poulie', sets: 3, reps: '12-15', muscles: ['pecs'], cues: ['Léger arrondi des coudes, fixe', 'Croise légèrement les mains devant', 'Tension continue, pas de repos en haut'], machine: 'Ou pec deck — cherche la congestion' },
      { id: 'curl-marteau', name: 'Curl marteau', sets: 3, reps: '10', muscles: ['biceps', 'avant-bras'], cues: ['Prise neutre, pouces vers le haut', 'Coudes fixes', 'Brachial = épaisseur du bras'], machine: 'Haltères ou corde poulie basse' },
      { id: 'ext-uni', name: 'Extension triceps unilatéral', sets: 3, reps: '10-12', muscles: ['triceps'], cues: ['Un bras à la fois', 'Verrouille le coude en bas', 'Concentre-toi sur la contraction'], machine: 'Corrige les déséquilibres G/D' },
      { id: 'superset-bras', name: 'Superset curl pupitre + pushdown', sets: 2, reps: '15+15', muscles: ['biceps', 'triceps'], cues: ['Enchaîne sans repos les deux exos', 'Charges légères, brûlure assumée', 'Finisher — vide tout'], machine: 'Larry Scott + poulie : 2 rounds' },
      { id: 'crunch-leste', name: 'Crunch lesté', sets: 3, reps: '15', muscles: ['abdos'], cues: ['Disque sur la poitrine ou machine', 'Expire en montant', '3e stimulus abdos de la semaine'], machine: 'Machine à abdos On Air si dispo' },
    ],
  },
]

export const ALL_EXERCISES = PROGRAM.flatMap(s => s.exercises)

// Fourchette de reps → borne haute pour la suggestion de progression
export function topOfRange(reps: string): number | null {
  const m = reps.match(/(\d+)\s*-\s*(\d+)/)
  return m ? parseInt(m[2], 10) : null
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
  'epaules-ar': 'M22,30 Q28,24 33,30 L31,39 Q25,39 22,36 Z M67,30 Q72,24 78,30 L78,36 Q75,39 69,39 Z',
  'triceps': 'M20,43 Q24,41 27,44 L26,58 Q22,60 19,56 Z M73,44 Q76,41 80,43 L81,56 Q78,60 74,58 Z',
  'fessiers': 'M38,62 Q50,58 62,62 L61,78 Q50,84 39,78 Z',
  'ischios': 'M38,82 Q44,80 47,84 L46,105 Q42,108 38,104 Z M53,84 Q56,80 62,82 L62,104 Q58,108 54,105 Z',
  'mollets': 'M39,110 Q43,108 46,111 L45,127 Q42,129 39,126 Z M54,111 Q57,108 61,110 L61,126 Q58,129 55,127 Z',
}
