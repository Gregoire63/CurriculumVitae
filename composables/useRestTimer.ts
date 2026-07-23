import { ref } from 'vue'
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
  if (!import.meta.client) return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = audioCtx || new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    // bip quasi-silencieux pour finir de déverrouiller le contexte
    const o = audioCtx.createOscillator()
    const g = audioCtx.createGain()
    g.gain.value = 0.0001
    o.connect(g); g.connect(audioCtx.destination)
    o.start(); o.stop(audioCtx.currentTime + 0.02)
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
  if (!import.meta.client) return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = audioCtx || new Ctx()
    if (audioCtx.state === 'suspended') audioCtx.resume()
    const now = audioCtx.currentTime
    // deux bips courts
    for (const t of [0, 0.28]) {
      const o = audioCtx.createOscillator()
      const g = audioCtx.createGain()
      o.connect(g)
      g.connect(audioCtx.destination)
      o.type = 'sine'
      o.frequency.value = 880
      g.gain.setValueAtTime(0.0001, now + t)
      g.gain.exponentialRampToValueAtTime(0.35, now + t + 0.02)
      g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.22)
      o.start(now + t)
      o.stop(now + t + 0.24)
    }
  } catch { /* audio indisponible : on ignore */ }
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
  return { secondsLeft, totalSeconds, start, stop, addTime }
}
