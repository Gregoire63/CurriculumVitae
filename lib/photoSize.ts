// Dimensionnement et budget des photos de plats.
// Pur : pas de canvas, pas d'IndexedDB, pas de DOM — tout ce qui décide de la taille
// d'une image vit ici et se teste sans navigateur. Le travail sur les pixels est dans
// composables/usePhotos.ts, qui applique ces règles.

/**
 * Côté le plus long conservé pour l'affichage plein écran.
 * 1024 px suffit : la carte la plus large du module fait ~340 px CSS, et même un
 * écran à 3× ne demande que 1020 px réels. Au-delà, on stocke des pixels que
 * personne ne verra jamais.
 */
export const MAX_EDGE = 1024

/**
 * Vignette des listes. La bibliothèque affiche une quinzaine de plats d'un coup :
 * décoder quinze images de 1024 px coûte de la mémoire et un à-coup au défilement,
 * pour des cases de 56 px à l'écran.
 */
export const THUMB_EDGE = 192

/**
 * 0,72 en WebP : au-dessus, le fichier grossit vite sans gain visible sur une photo
 * de gamelle ; en dessous, les aplats (riz, sauce) commencent à baver.
 */
export const QUALITY = 0.72
export const THUMB_QUALITY = 0.7

/** Au-delà, on refuse : c'est probablement une capture d'écran ou un fichier non photo. */
export const MAX_INPUT_BYTES = 25 * 1024 * 1024

/** Formats acceptés à l'entrée. HEIC n'est pas décodable par canvas dans un navigateur. */
export const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp']

export interface Size { w: number, h: number }

/**
 * Réduit une taille pour tenir dans un carré de `max`, en gardant les proportions.
 * N'agrandit JAMAIS : une photo déjà petite reste telle quelle, l'upscaling ne fait
 * qu'inventer des pixels et gonfler le fichier.
 */
export function fitWithin(w: number, h: number, max: number): Size {
  if (!(w > 0) || !(h > 0)) return { w: 0, h: 0 }
  const longest = Math.max(w, h)
  if (longest <= max) return { w: Math.round(w), h: Math.round(h) }
  const k = max / longest
  // Math.max(1, …) : une image extrêmement panoramique ne doit pas finir à 0 px de haut.
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

/** Taille de stockage attendue pour une photo (plein + vignette), en octets. */
export function expectedBytes(w: number, h: number): number {
  const full = fitWithin(w, h, MAX_EDGE)
  const thumb = fitWithin(w, h, THUMB_EDGE)
  // ~0,11 octet par pixel en WebP à 0,72 sur une photo courante. Approximation
  // volontairement large : elle sert à prévenir, pas à facturer.
  return Math.round(full.w * full.h * 0.11 + thumb.w * thumb.h * 0.13)
}

/** Refus explicite plutôt qu'un échec silencieux au moment du décodage. */
export function rejectReason(file: { type: string, size: number }): string | null {
  if (!file.type.startsWith('image/')) return 'Ce fichier n\'est pas une image.'
  if (file.type === 'image/heic' || file.type === 'image/heif') {
    return 'Le format HEIC n\'est pas lisible par le navigateur. Sur iPhone : Réglages → Appareil photo → Formats → « Le plus compatible ».'
  }
  if (!ACCEPTED.includes(file.type)) return `Format non géré (${file.type}).`
  if (file.size > MAX_INPUT_BYTES) return 'Image trop lourde (plus de 25 Mo).'
  return null
}

export function humanBytes(n: number): string {
  if (n < 1024) return `${n} o`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} Ko`
  return `${(n / (1024 * 1024)).toFixed(n < 10 * 1024 * 1024 ? 1 : 0)} Mo`
}

/**
 * Seuil d'alerte : une photo par plat, une trentaine de plats, ça reste sous 5 Mo.
 * Si on dépasse, c'est que quelque chose ne se nettoie pas — mieux vaut le dire.
 */
export const BUDGET_WARN_BYTES = 8 * 1024 * 1024

export interface StorageVerdict { bytes: number, human: string, warn: boolean, note: string }

export function storageVerdict(bytes: number, count: number): StorageVerdict {
  const human = humanBytes(bytes)
  if (!count) return { bytes, human, warn: false, note: 'Aucune photo pour l\'instant.' }
  const avg = Math.round(bytes / count)
  if (bytes > BUDGET_WARN_BYTES) {
    return { bytes, human, warn: true, note: `${count} photo(s), ${human} au total — c'est beaucoup pour une photo par plat. Supprime celles des plats que tu ne fais plus.` }
  }
  return { bytes, human, warn: false, note: `${count} photo(s), ${human} au total (${humanBytes(avg)} en moyenne).` }
}
