import { ref } from 'vue'
import { ALL_EXERCISES, topOfRange, suggestedIncrement } from '~/data/sportProgram'
import type { Exercise } from '~/data/sportProgram'

// warm : série d'échauffement — enregistrée mais exclue des stats (charge, PR, progression)
// w2/r2 : 2e mouvement d'un superset (charge/reps propres)
export interface SetLog { w: number; r: number; warm?: boolean; w2?: number; r2?: number }
const working = (sets: SetLog[]) => sets.filter(s => !s.warm)
export interface SessionLog { date: string; sets: SetLog[]; durationMin?: number }
export type Logs = Record<string, SessionLog[]>
export interface BodyWeightEntry { date: string; kg: number }
// Effort de sprint (course) : ex. « 3 × 20 s @ 16 km/h »
export interface SprintEffort { kind: 'echauffement' | 'sprint'; count: number; duration: string; intensity: string }
// Enregistrement au niveau séance : garde l'ordre, la date ET l'heure
export interface SessionRecord {
  at: string // ISO complet (date + heure)
  sessionId: string | null
  name: string
  durationMin?: number
  entries: { exId: string; sets: SetLog[] }[]
  sprint?: SprintEffort[]
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
    const all = h.flatMap(s => working(s.sets).map(x => x.w))
    return all.length ? Math.max(...all) : 0
  }

  function recordSession(
    entries: { exId: string; sets: SetLog[] }[],
    durationMin?: number,
    meta?: { sessionId: string | null; name: string },
    sprint?: SprintEffort[],
  ) {
    const now = new Date()
    const at = localDateTime(now) // heure locale
    const date = localDate(now)
    const prs: string[] = []
    for (const { exId, sets } of entries) {
      if (!sets.length) continue
      const prevBest = bestCharge(exId)
      const work = working(sets)
      const newBest = work.length ? Math.max(...work.map(s => s.w)) : 0
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
    const sprintClean = (sprint ?? []).filter(s => s.duration.trim() || s.intensity.trim())
    if (recorded.length || sprintClean.length) {
      sessionHistory.value.push({
        at,
        sessionId: meta?.sessionId ?? null,
        name: meta?.name ?? 'Séance',
        durationMin,
        entries: recorded.map(e => ({ exId: e.exId, sets: e.sets })),
        ...(sprintClean.length ? { sprint: sprintClean } : {}),
      })
      persistSessions()
    }
    return prs
  }

  // Met à jour une séance déjà enregistrée (édition depuis l'accueil ou le journal).
  // Touche les deux stockages : le journal (sessionHistory) ET les logs par exercice
  // (utilisés pour progression/charts). On retrouve les anciennes entrées de logs par
  // date + égalité des séries, on les remplace par les nouvelles.
  function updateSession(
    rec: SessionRecord,
    entries: { exId: string; sets: SetLog[] }[],
    durationMin?: number,
    sprint?: SprintEffort[],
  ) {
    const idx = sessionHistory.value.indexOf(rec)
    if (idx < 0) return
    const date = rec.at.slice(0, 10)
    // 1) retire des logs les anciennes entrées de cette séance
    for (const oldE of rec.entries) {
      const arr = logs.value[oldE.exId]
      if (!arr) continue
      const j = arr.findIndex(l => l.date === date && JSON.stringify(l.sets) === JSON.stringify(oldE.sets))
      if (j >= 0) { arr.splice(j, 1); if (!arr.length) delete logs.value[oldE.exId] }
    }
    // 2) ajoute les nouvelles entrées (séries de travail + échauffement conservés)
    const recorded = entries.filter(e => e.sets.length)
    for (const e of recorded) {
      if (!logs.value[e.exId]) logs.value[e.exId] = []
      logs.value[e.exId].push({ date, sets: e.sets, durationMin })
    }
    // 3) met à jour l'enregistrement séance en place
    const sprintClean = (sprint ?? []).filter(s => s.duration.trim() || s.intensity.trim())
    rec.durationMin = durationMin
    rec.entries = recorded.map(e => ({ exId: e.exId, sets: e.sets }))
    if (sprintClean.length) rec.sprint = sprintClean
    else delete rec.sprint
    persistLogs(); persistSessions()
  }

  function progressionHint(ex: Exercise): string | null {
    const last = lastPerf(ex.id)
    const top = topOfRange(ex.reps)
    const work = last ? working(last.sets) : []
    if (!last || !top || work.length < ex.sets) return null
    if (!work.every(s => s.r >= top)) return null
    const inc = suggestedIncrement(ex)
    const maxW = Math.max(...work.map(s => s.w))
    return `Objectif atteint la dernière fois → passe à ${maxW + inc} kg`
  }

  // ─── Surcharge progressive ─────────────────────────────────────────────
  // Charge max d'une séance (séries de travail uniquement, hors échauffement)
  function topWeightOf(s: SessionLog): number {
    const w = working(s.sets)
    return w.length ? Math.max(...w.map(x => x.w)) : 0
  }
  // Nb de séances récentes consécutives à la même charge max (stagnation)
  function sameWeightStreak(exId: string): number {
    const h = logs.value[exId] || []
    if (!h.length) return 0
    const w = topWeightOf(h[h.length - 1])
    if (!w) return 0
    let n = 0
    for (let i = h.length - 1; i >= 0; i--) {
      if (topWeightOf(h[i]) === w) n++
      else break
    }
    return n
  }
  // À partir de combien de séances identiques on force la montée de charge
  const STALL_SESSIONS = 3

  // Charge conseillée pour la prochaine séance de cet exercice
  function suggestWeight(ex: Exercise): {
    weight: number; base: number; inc: number; streak: number
    reason: 'progress' | 'stall' | 'keep' | 'none'
  } {
    const last = lastPerf(ex.id)
    const work = last ? working(last.sets) : []
    if (!work.length) return { weight: 0, base: 0, inc: 0, streak: 0, reason: 'none' }
    const base = topWeightOf(last!)
    const inc = suggestedIncrement(ex)
    const top = topOfRange(ex.reps)
    const streak = sameWeightStreak(ex.id)
    // 1) objectif de reps atteint la dernière fois → on monte
    if (top && work.length >= ex.sets && work.every(s => s.r >= top)) {
      return { weight: base + inc, base, inc, streak, reason: 'progress' }
    }
    // 2) même charge depuis STALL_SESSIONS séances → on force la montée
    if (streak >= STALL_SESSIONS) {
      return { weight: base + inc, base, inc, streak, reason: 'stall' }
    }
    // 3) sinon on garde la charge
    return { weight: base, base, inc, streak, reason: 'keep' }
  }

  function e1rm(sets: SetLog[]): number {
    return Math.round(Math.max(...sets.map(s => s.w * (1 + s.r / 30))))
  }

  function chartData(exId: string) {
    return (logs.value[exId] || []).map(sess => {
      const w = working(sess.sets)
      return {
        date: sess.date.slice(5),
        charge: w.length ? Math.max(...w.map(s => s.w)) : 0,
        volume: w.reduce((a, s) => a + s.w * s.r, 0),
        e1rm: w.length ? e1rm(w) : 0,
      }
    }).filter(d => d.charge > 0)
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
    lastPerf, bestCharge, recordSession, updateSession, progressionHint, suggestWeight, chartData, history, sessionLog,
    addBodyWeight, exportJSON, importJSON,
  }
}
