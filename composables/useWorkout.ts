import { ref } from 'vue'
import { ALL_EXERCISES, topOfRange, suggestedIncrement } from '~/data/sportProgram'
import type { Exercise } from '~/data/sportProgram'

export interface SetLog { w: number; r: number }
export interface SessionLog { date: string; sets: SetLog[]; durationMin?: number }
export type Logs = Record<string, SessionLog[]>
export interface BodyWeightEntry { date: string; kg: number }

const LOGS_KEY = 'gr-workout-logs-v1'
const BW_KEY = 'gr-bodyweight-v1'

// État module-scope : partagé entre tous les composants, initialisé une fois
const logs = ref<Logs>({})
const bodyWeight = ref<BodyWeightEntry[]>([])
let hydrated = false

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try { return JSON.parse(raw) as T } catch { return fallback }
}

export function useWorkout() {
  // Hydratation côté client uniquement (localStorage inexistant en SSR)
  if (!hydrated && import.meta.client) {
    logs.value = safeParse(localStorage.getItem(LOGS_KEY), {})
    bodyWeight.value = safeParse(localStorage.getItem(BW_KEY), [])
    hydrated = true
  }

  function persistLogs() {
    if (import.meta.client) localStorage.setItem(LOGS_KEY, JSON.stringify(logs.value))
  }
  function persistBW() {
    if (import.meta.client) localStorage.setItem(BW_KEY, JSON.stringify(bodyWeight.value))
  }

  function lastPerf(exId: string): SessionLog | null {
    const h = logs.value[exId]
    return h && h.length ? h[h.length - 1] : null
  }

  function bestCharge(exId: string): number {
    const h = logs.value[exId] || []
    const all = h.flatMap(s => s.sets.map(x => x.w))
    return all.length ? Math.max(...all) : 0
  }

  function recordSession(entries: { exId: string; sets: SetLog[] }[], durationMin?: number) {
    const date = new Date().toISOString().slice(0, 10)
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
    return prs
  }

  // Progression : borne haute de reps atteinte sur toutes les séries de la dernière séance ?
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

  // Estimation 1RM (Epley) sur la meilleure série d'une séance
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

  // Historique global trié (toutes séances confondues)
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

  function addBodyWeight(kg: number) {
    const date = new Date().toISOString().slice(0, 10)
    const existing = bodyWeight.value.find(e => e.date === date)
    if (existing) existing.kg = kg
    else bodyWeight.value.push({ date, kg })
    bodyWeight.value.sort((a, b) => a.date.localeCompare(b.date))
    persistBW()
  }

  function exportJSON() {
    const payload = JSON.stringify({ logs: logs.value, bodyWeight: bodyWeight.value }, null, 1)
    const blob = new Blob([payload], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `suivi-seances-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  function importJSON(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => {
        try {
          const data = JSON.parse(r.result as string)
          // Compat : ancien format = logs à plat, nouveau = { logs, bodyWeight }
          if (data.logs) {
            logs.value = data.logs
            bodyWeight.value = data.bodyWeight || []
          } else {
            logs.value = data
          }
          persistLogs(); persistBW()
          resolve()
        } catch { reject(new Error('Fichier invalide')) }
      }
      r.onerror = () => reject(new Error('Lecture impossible'))
      r.readAsText(file)
    })
  }

  return {
    logs, bodyWeight,
    lastPerf, bestCharge, recordSession, progressionHint, chartData, history,
    addBodyWeight, exportJSON, importJSON,
  }
}
