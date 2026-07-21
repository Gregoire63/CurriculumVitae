// Correspondance exercice → jeu d'images « position de départ / position de fin ».
// La valeur est le nom de dossier dans la source d'images (voir scripts/fetch-exercise-images.mjs).
// Les fichiers finaux attendus par l'app : /public/sport/exercises/<idExercice>-1.jpg (départ)
// et <idExercice>-2.jpg (fin). Tant qu'ils sont absents, l'app retombe sur le schéma musculaire.
export const EXERCISE_IMAGE_SLUGS: Record<string, string> = {
  'dc-barre': 'Barbell_Bench_Press_-_Medium_Grip',
  'di-halteres': 'Incline_Dumbbell_Press',
  'dips': 'Dips_-_Chest_Version',
  'curl-ez': 'EZ-Bar_Curl',
  'ext-corde': 'Triceps_Pushdown_-_Rope_Attachment',
  'curl-incline': 'Incline_Dumbbell_Curl',
  'crunch-cable': 'Cable_Crunch',
  'tirage-v': 'Wide-Grip_Lat_Pulldown',
  'rowing-m': 'Seated_Cable_Rows',
  'dev-mil': 'Dumbbell_Shoulder_Press',
  'elev-lat': 'Side_Lateral_Raise',
  'face-pull': 'Face_Pull',
  'squat': 'Barbell_Full_Squat',
  'sdt-r': 'Romanian_Deadlift',
  'fentes': 'Dumbbell_Lunges',
  'mollets': 'Standing_Calf_Raises',
  'releves': 'Hanging_Leg_Raise',
  'dev-halteres': 'Dumbbell_Bench_Press',
  'ecartes': 'Cable_Crossover',
  'curl-marteau': 'Hammer_Curls',
  'ext-uni': 'Standing_One-Arm_Dumbbell_Triceps_Extension',
  'crunch-leste': 'Weighted_Crunches',
}

// Exercices disposant d'images (pour l'affichage conditionnel côté composant)
export function hasExerciseImages(exId: string): boolean {
  return exId in EXERCISE_IMAGE_SLUGS
}
