import { ref } from 'vue'

// Profil + planning hebdo éditables, persistés en localStorage.
export interface Profile {
  heightCm: number | null
  sex: 'h' | 'f' | null
  birthYear: number | null
}
// Planning : 7 entrées (index 0 = Lundi … 6 = Dimanche), valeur = id de séance ou null (repos)
export type WeekPlan = (string | null)[]

export const DEFAULT_PLAN: WeekPlan = ['s1', 's2', null, 's3', 's4', null, null]
const PROFILE_KEY = 'gr-profile-v1'
const PLAN_KEY = 'gr-weekplan-v1'

const profile = ref<Profile>({ heightCm: null, sex: null, birthYear: null })
const weekPlan = ref<WeekPlan>([...DEFAULT_PLAN])
let hydrated = false

function safeParse<T>(raw: string | null, fb: T): T {
  if (!raw) return fb
  try { return JSON.parse(raw) as T } catch { return fb }
}

export function useProfile() {
  // Hydratation appelée onMounted (côté client) pour éviter tout décalage SSR
  function hydrate() {
    if (hydrated || !import.meta.client) return
    profile.value = { ...profile.value, ...safeParse(localStorage.getItem(PROFILE_KEY), {}) }
    const p = safeParse<WeekPlan>(localStorage.getItem(PLAN_KEY), DEFAULT_PLAN)
    if (Array.isArray(p) && p.length === 7) weekPlan.value = p
    hydrated = true
  }
  function persistProfile() { if (import.meta.client) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile.value)) }
  function persistPlan() { if (import.meta.client) localStorage.setItem(PLAN_KEY, JSON.stringify(weekPlan.value)) }

  function setHeight(cm: number | null) { profile.value.heightCm = cm && cm > 0 ? cm : null; persistProfile() }
  function setSex(sex: 'h' | 'f' | null) { profile.value.sex = sex; persistProfile() }
  function setBirthYear(y: number | null) { profile.value.birthYear = y && y > 1900 ? y : null; persistProfile() }
  function setDay(i: number, sid: string | null) {
    const copy = [...weekPlan.value]
    copy[i] = sid
    weekPlan.value = copy
    persistPlan()
  }
  function resetPlan() { weekPlan.value = [...DEFAULT_PLAN]; persistPlan() }

  // Restaure profil + planning depuis une sauvegarde importée
  function restore(data: { profile?: Partial<Profile>; weekPlan?: WeekPlan }) {
    if (data.profile && typeof data.profile === 'object') {
      profile.value = { ...profile.value, ...data.profile }
      persistProfile()
    }
    if (Array.isArray(data.weekPlan) && data.weekPlan.length === 7) {
      weekPlan.value = [...data.weekPlan]
      persistPlan()
    }
  }

  return { profile, weekPlan, hydrate, setHeight, setSex, setBirthYear, setDay, resetPlan, restore }
}
