import { ref, watch } from 'vue'
import { KEEPALIVE_WAV } from '~/data/keepAliveAudio'

// Timer de repos partagé (module-scope) : la page peut le démarrer automatiquement
// quand une série est validée, et le composant SportRestTimer l'affiche.
const secondsLeft = ref(0)
const totalSeconds = ref(0)
let interval: ReturnType<typeof setInterval> | null = null
let endAt = 0 // timestamp de fin (ms) : le décompte se recale dessus, robuste à la mise en veille
let finished = false
let audioCtx: AudioContext | null = null
let keepAlive: HTMLAudioElement | null = null
let swReg: ServiceWorkerRegistration | null = null

const VIBRATE_PATTERN = [300, 150, 300, 150, 300]

// ─── Réglages du son de fin (choisis dans Profil, mémorisés) ────────────────
const SETTINGS_KEY = 'gr-timer-sound-v1'
const soundEnabled = ref(true)
const soundVolume = ref(0.7) // 0 → 1
const soundType = ref('bip')

// Motifs sonores générés à la volée (WebAudio) : { fréquence, départ, durée… }
interface ToneSpec { f: number; t: number; d: number; type?: OscillatorType; peak?: number }
const SOUNDS: Record<string, ToneSpec[]> = {
  bip: [{ f: 880, t: 0, d: 0.22 }, { f: 880, t: 0.28, d: 0.22 }],
  triple: [{ f: 1047, t: 0, d: 0.12 }, { f: 1047, t: 0.16, d: 0.12 }, { f: 1047, t: 0.32, d: 0.16 }],
  montee: [{ f: 523, t: 0, d: 0.16 }, { f: 659, t: 0.14, d: 0.16 }, { f: 784, t: 0.28, d: 0.28 }],
  cloche: [{ f: 660, t: 0, d: 0.6, peak: 0.6 }, { f: 1320, t: 0, d: 0.5, peak: 0.28 }, { f: 1980, t: 0, d: 0.35, peak: 0.14 }],
  doux: [{ f: 440, t: 0, d: 0.5, type: 'triangle', peak: 0.8 }],
}
export const SOUND_OPTIONS = [
  { key: 'bip', label: 'Bip double' },
  { key: 'triple', label: 'Triple bip' },
  { key: 'montee', label: 'Montée' },
  { key: 'cloche', label: 'Cloche' },
  { key: 'doux', label: 'Doux' },
]

let settingsHydrated = false
function hydrateSettings() {
  if (settingsHydrated || !import.meta.client) return
  settingsHydrated = true
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) {
      const s = JSON.parse(raw)
      if (typeof s.enabled === 'boolean') soundEnabled.value = s.enabled
      if (typeof s.volume === 'number') soundVolume.value = Math.min(1, Math.max(0, s.volume))
      if (typeof s.type === 'string' && SOUNDS[s.type]) soundType.value = s.type
    }
  } catch { /* réglages illisibles */ }
}
if (import.meta.client) {
  watch([soundEnabled, soundVolume, soundType], () => {
    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify({ enabled: soundEnabled.value, volume: soundVolume.value, type: soundType.value })) } catch { /* ignore */ }
  })
}

function getCtx(): AudioContext | null {
  if (!import.meta.client) return null
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = audioCtx || new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    return audioCtx
  } catch { return null }
}

function playTones(ctx: AudioContext, vol: number, tones: ToneSpec[]) {
  const now = ctx.currentTime
  for (const s of tones) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.connect(g); g.connect(ctx.destination)
    o.type = s.type || 'sine'
    o.frequency.value = s.f
    const peak = Math.max(0.0002, (s.peak ?? 0.9) * vol)
    g.gain.setValueAtTime(0.0001, now + s.t)
    g.gain.exponentialRampToValueAtTime(peak, now + s.t + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, now + s.t + s.d)
    o.start(now + s.t); o.stop(now + s.t + s.d + 0.02)
  }
}

// ─── Audio « keep-alive » ───────────────────────────────────────────────────
// Un onglet en arrière-plan voit ses timers gelés par Chrome Android… sauf s'il
// joue de l'audio. On boucle donc une piste quasi-inaudible pendant le repos :
// le minuteur reste actif et le bip de fin sonne à l'heure même hors de la page.
function ensureKeepAlive(): HTMLAudioElement | null {
  if (!import.meta.client) return null
  if (!keepAlive) {
    keepAlive = new Audio(KEEPALIVE_WAV)
    keepAlive.loop = true
    keepAlive.preload = 'auto'
  }
  return keepAlive
}
function startKeepAlive() {
  const a = ensureKeepAlive()
  if (!a) return
  try { a.currentTime = 0; const p = a.play(); if (p && typeof p.catch === 'function') p.catch(() => {}) } catch { /* ignore */ }
}
function stopKeepAlive() {
  if (keepAlive) { try { keepAlive.pause() } catch { /* ignore */ } }
}

// Débloque l'audio sur un geste utilisateur (obligatoire sur iOS/mobile)
function unlockAudio() {
  const ctx = getCtx()
  if (!ctx) return
  try {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    g.gain.value = 0.0001
    o.connect(g); g.connect(ctx.destination)
    o.start(); o.stop(ctx.currentTime + 0.02)
  } catch { /* audio indisponible */ }
}

// Prépare la notification système (son + vibration en arrière-plan sur Android)
function prepareNotify() {
  if (!import.meta.client) return
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((r) => { swReg = r }).catch(() => {})
    }
  } catch { /* notifications indisponibles */ }
}

function beep() {
  if (!import.meta.client || !soundEnabled.value) return
  const ctx = getCtx()
  if (!ctx) return
  try { playTones(ctx, soundVolume.value, SOUNDS[soundType.value] || SOUNDS.bip) } catch { /* audio indisponible */ }
}

// Bouton « Tester » : joue le son choisi (même si désactivé) + petite vibration
function testSound() {
  unlockAudio()
  const ctx = getCtx()
  if (ctx) { try { playTones(ctx, soundVolume.value, SOUNDS[soundType.value] || SOUNDS.bip) } catch { /* ignore */ } }
  try { if (import.meta.client && navigator.vibrate) navigator.vibrate(120) } catch { /* ignore */ }
}

// Alerte de fin : vibration au premier plan + notification (son + vibration) en arrière-plan
function alertEnd() {
  if (!import.meta.client) return
  beep()
  try { if (navigator.vibrate) navigator.vibrate(VIBRATE_PATTERN) } catch { /* ignore */ }
  // Hors de la page (onglet masqué) : la notification système déclenche le son + la
  // vibration même quand navigator.vibrate est ignoré (page non visible).
  try {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      // vibrate/renotify : hors du type DOM NotificationOptions mais gérés par Android via le SW
      const opts = {
        body: 'Repos terminé — série suivante 💪',
        tag: 'rest-timer',
        icon: '/sport/icon-192.png',
        badge: '/sport/icon-192.png',
        silent: !soundEnabled.value,
        vibrate: VIBRATE_PATTERN,
        renotify: true,
      } as NotificationOptions
      if (swReg && swReg.showNotification) swReg.showNotification("⏱️ C'est reparti", opts)
      else new Notification("⏱️ C'est reparti", opts) // desktop
    }
  } catch { /* notification impossible */ }
}

function clear() {
  if (interval) clearInterval(interval)
  interval = null
}

function tick() {
  const remainMs = endAt - Date.now()
  secondsLeft.value = Math.max(0, Math.ceil(remainMs / 1000))
  if (remainMs <= 0 && !finished) {
    finished = true
    clear()
    secondsLeft.value = 0
    stopKeepAlive()
    alertEnd()
  }
}

function stop() {
  clear()
  stopKeepAlive()
  finished = true
  secondsLeft.value = 0
  totalSeconds.value = 0
}

function start(sec: number) {
  clear()
  finished = false
  unlockAudio()    // appelé depuis un tap → autorise le son de fin sur mobile
  prepareNotify()  // demande la permission de notifier (pour l'arrière-plan)
  startKeepAlive() // garde l'onglet actif en arrière-plan
  endAt = Date.now() + sec * 1000
  totalSeconds.value = sec
  secondsLeft.value = sec
  // tick fréquent : le décompte se recale sur endAt au retour de veille/arrière-plan
  interval = setInterval(tick, 250)
}

function addTime(delta: number) {
  if (secondsLeft.value <= 0) return
  endAt += delta * 1000
  const remain = Math.max(1, Math.ceil((endAt - Date.now()) / 1000))
  secondsLeft.value = remain
  if (remain > totalSeconds.value) totalSeconds.value = remain
}

// Recale immédiatement l'affichage quand on revient sur l'onglet
if (import.meta.client) {
  document.addEventListener('visibilitychange', () => { if (interval) tick() })
}

export function useRestTimer() {
  hydrateSettings()
  return {
    secondsLeft, totalSeconds, start, stop, addTime,
    soundEnabled, soundVolume, soundType, testSound, SOUND_OPTIONS,
  }
}
