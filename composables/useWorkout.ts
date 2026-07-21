import { ref } from 'vue'
import { ALL_EXERCISES, topOfRange, suggestedIncrement } from '~/data/sportProgram'
import type { Exercise } from '~/data/sportProgram'

export interface SetLog { w: number; r: number }
export interface SessionLog { date: string; sets: SetLog[]; durationMin?: number }
export type Logs = Record<string, SessionLog[]>
export interface BodyWeightEntry { date: string; kg: number }
// Enregistrement au niveau séance : garde l'ordre, la date ET l'heure
export interface SessionRecord {
  at: string // ISO complet (date + heure)
  sessionId: string | null
  name: string
  durationMin?: number
  entries: { exId: string; sets: SetLog[] }[]
}

const LOGS_KEY = 'gr-workout-logs-v1'
const BW_KEY = 'gr-bodyweight-v1'
const SESS_KEY = 'gr-sessions-v1'

const logs = ref<Logs>({})
const bodyWeight = ref<BodyWeightEntry[]>([])
const sessionHistory = ref<SessionRecord[]>([])
let hydrated = false

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

const pad2 = (n: number) => String(n).padStart(2, '0')
function localDate(d = new Date()) { return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` }
function localDateTime(d = new Date()) { return `${localDate(d)}T${pad2(d.getHours())}:${pad2(d.getMinutes())}` }

export function useWorkout() {
  if (!hydrated && import.meta.client) {
    logs.value = safeParse(localStorage.getItem(LOGS_KEY), {})
    bodyWeight.value = safeParse(localStorage.getItem(BW_KEY), [])
    sessionHistory.value = safeParse(localStorage.getItem(SESS_KEY), [])
    hydrated = true
  }

  function persistLogs() { if (import.meta.client) localStorage.setItem(LOGS_KEY, JSON.stringify(logs.value)) }
  function persistBW() { if (import.meta.client) localStorage.setItem(BW_KEY, JSON.stringify(bodyWeight.value)) }
  function persistSessions() { if (import.meta.client) localStorage.setItem(SESS_KEY, JSON.stringify(sessionHistory.value)) }

  function lastPerf(exId: string): SessionLog | null {
    const h = logs.value[exId]
    return h && h.length ? h[h.length - 1] : null
  }

  function bestCharge(exId: string): number {
    const h = logs.value[exId] || []
    const all = h.flatMap(s => s.sets.map(x => x.w))
    return all.length ? Math.max(...all) : 0
  }

  function recordSession(
    entries: { exId: string; sets: SetLog[] }[],
    durationMin?: number,
    meta?: { sessionId: string | null; name: string },
  ) {
    const now = new Date()
    const at = localDateTime(now) // heure locale
    const date = localDate(now)
    const prs: string[] = []
    for (const { exId, sets } of entries) {
      if (!sets.length) continue
      const prevBest = bestCharge(exId)
      const newBest = Math.max(...sets.map(s => s.w))
      if (prevBest > 0 && newBest > prevBest) {
        const ex = ALL_EXERCISES.find(e => e.id === exId)
        prs.push(ex ? ex.name : exId)
      }
      if (!logs.value[exId]) logs.value[exId] = []
      logs.value[exId].push({ date, sets, durationMin })
    }
    persistLogs()

    // Enregistrement niveau séance (mémorise tout : ordre, date, heure)
    const recorded = entries.filter(e => e.sets.length)
    if (recorded.length) {
      sessionHistory.value.push({
        at,
        sessionId: meta?.sessionId ?? null,
        name: meta?.name ?? 'Séance',
        durationMin,
        entries: recorded.map(e => ({ exId: e.exId, sets: e.sets })),
      })
      persistSessions()
    }
    return prs
  }

  function progressionHint(ex: Exercise): string | null {
    const last = lastPerf(ex.id)
    const top = topOfRange(ex.reps)
    if (!last || !top || last.sets.length < ex.sets) return null
    const allAtTop = last.sets.every(s => s.r >= top)
    if (!allAtTop) return null
    const inc = suggestedIncrement(ex)
    const maxW = Math.max(...last.sets.map(s => s.w))
    return `Objectif atteint la dernière fois → passe à ${maxW + inc} kg`
  }

  function e1rm(sets: SetLog[]): number {
    return Math.round(Math.max(...sets.map(s => s.w * (1 + s.r / 30))))
  }

  function chartData(exId: string) {
    return (logs.value[exId] || []).map(sess => ({
      date: sess.date.slice(5),
      charge: Math.max(...sess.sets.map(s => s.w)),
      volume: sess.sets.reduce((a, s) => a + s.w * s.r, 0),
      e1rm: e1rm(sess.sets),
    }))
  }

  // Historique groupé par jour (charges à plat) — conservé pour compat
  function history() {
    const byDate: Record<string, { exId: string; sets: SetLog[] }[]> = {}
    for (const [exId, sessions] of Object.entries(logs.value)) {
      for (const s of sessions) {
        if (!byDate[s.date]) byDate[s.date] = []
        byDate[s.date].push({ exId, sets: s.sets })
      }
    }
    return Object.entries(byDate)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, entries]) => ({ date, entries }))
  }

  // Journal des séances (le plus récent d'abord), avec heure
  function sessionLog() {
    return [...sessionHistory.value].sort((a, b) => b.at.localeCompare(a.at))
  }

  function addBodyWeight(kg: number) {
    const date = localDate()
    const existing = bodyWeight.value.find(e => e.date === date)
    if (existing) existing.kg = kg
    else bodyWeight.value.push({ date, kg })
    bodyWeight.value.sort((a, b) => a.date.localeCompare(b.date))
    persistBW()
  }

  // extra : données supplémentaires à inclure dans la sauvegarde (profil, planning…)
  function exportJSON(extra: Record<string, unknown> = {}) {
    const payload = JSON.stringify({ logs: logs.value, bodyWeight: bodyWeight.value, sessions: sessionHistory.value, ...extra }, null, 1)
    const blob = new Blob([payload], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `suivi-seances-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  // onExtra : reçoit les données brutes pour restaurer profil/planning côté appelant
  function importJSON(file: File, onExtra?: (data: Record<string, unknown>) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => {
        try {
          const data = JSON.parse(r.result as string)
          if (data.logs) {
            logs.value = data.logs
            bodyWeight.value = data.bodyWeight || []
            sessionHistory.value = data.sessions || []
          } else {
            logs.value = data
          }
          persistLogs(); persistBW(); persistSessions()
          if (onExtra) onExtra(data)
          resolve()
        } catch { reject(new Error('Fichier invalide')) }
      }
      r.onerror = () => reject(new Error('Lecture impossible'))
      r.readAsText(file)
    })
  }

  return {
    logs, bodyWeight, sessionHistory,
    lastPerf, bestCharge, recordSession, progressionHint, chartData, history, sessionLog,
    addBodyWeight, exportJSON, importJSON,
  }
}
