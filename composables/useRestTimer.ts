import { ref } from 'vue'

// Timer de repos partagé (module-scope) : la page peut le démarrer automatiquement
// quand une série est validée, et le composant SportRestTimer l'affiche.
const secondsLeft = ref(0)
const totalSeconds = ref(0)
let interval: ReturnType<typeof setInterval> | null = null
let audioCtx: AudioContext | null = null

function beep() {
  if (!import.meta.client) return
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    audioCtx = audioCtx || new Ctx()
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

function clear() {
  if (interval) clearInterval(interval)
  interval = null
}

function stop() {
  clear()
  secondsLeft.value = 0
  totalSeconds.value = 0
}

function start(sec: number) {
  clear()
  secondsLeft.value = sec
  totalSeconds.value = sec
  interval = setInterval(() => {
    secondsLeft.value--
    if (secondsLeft.value <= 0) {
      clear()
      beep()
      if (import.meta.client && navigator.vibrate) navigator.vibrate([220, 120, 220])
    }
  }, 1000)
}

function addTime(delta: number) {
  if (secondsLeft.value <= 0) return
  secondsLeft.value = Math.max(1, secondsLeft.value + delta)
  if (secondsLeft.value > totalSeconds.value) totalSeconds.value = secondsLeft.value
}

export function useRestTimer() {
  return { secondsLeft, totalSeconds, start, stop, addTime }
}
