<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { PROGRAM, ALL_EXERCISES } from '~/data/sportProgram'
import { useWorkout } from '~/composables/useWorkout'
import type { SessionRecord } from '~/composables/useWorkout'
import { EFFORT_OPTIONS } from '~/utils/sportStats'

// Vue « Journal » (calendrier + feuille de séance) extraite de /sport (chargée à la demande).
const props = defineProps<{ todayIso: string | null }>()
const emit = defineEmits<{ edit: [rec: SessionRecord] }>()

const { sessionLog } = useWorkout()

const MONTHS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
const DOW = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const p2 = (n: number) => String(n).padStart(2, '0')
const RETIRED_NAMES: Record<string, string> = { 'ext-corde': 'Extension triceps corde', 'curl-incline': 'Curl incliné haltères', 'curl-ez': 'Curl barre EZ' }
const exName = (id: string) => ALL_EXERCISES.find(e => e.id === id)?.name ?? RETIRED_NAMES[id] ?? id
// Ressenti déclaré pendant la séance (facile / correct / dur / échec)
const effortIcon = (e?: string) => EFFORT_OPTIONS.find(o => o.value === e)?.icon ?? ''
const effortLabel = (e?: string) => EFFORT_OPTIONS.find(o => o.value === e)?.label ?? ''
const sessionById = (id: string | null) => (id ? PROGRAM.find(p => p.id === id) || null : null)
const recColor = (rec: SessionRecord) => sessionById(rec.sessionId)?.color || '#8b6f5c'

const sessions = computed(() => sessionLog())
const calMonth = ref<{ y: number; m: number }>({ y: 2024, m: 0 })
const selectedDay = ref<string | null>(null)
const sheetRecord = ref<SessionRecord | null>(null)

const sessionsByDay = computed(() => {
  const m: Record<string, SessionRecord[]> = {}
  for (const s of sessions.value) { const d = s.at.slice(0, 10); (m[d] ||= []).push(s) }
  return m
})
const calCells = computed(() => {
  const { y, m } = calMonth.value
  const lead = (new Date(y, m, 1).getDay() + 6) % 7
  const days = new Date(y, m + 1, 0).getDate()
  const cells: { iso: string | null; day: number; sessions: SessionRecord[] }[] = []
  for (let i = 0; i < lead; i++) cells.push({ iso: null, day: 0, sessions: [] })
  for (let d = 1; d <= days; d++) {
    const iso = `${y}-${p2(m + 1)}-${p2(d)}`
    cells.push({ iso, day: d, sessions: sessionsByDay.value[iso] || [] })
  }
  return cells
})
const monthLabel = computed(() => `${MONTHS[calMonth.value.m]} ${calMonth.value.y}`)

// Semaine (lundi → dimanche) contenant le jour sélectionné
function weekDaysOf(iso: string): string[] {
  const d = new Date(iso + 'T00:00:00')
  const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  const out: string[] = []
  for (let i = 0; i < 7; i++) { const x = new Date(mon); x.setDate(mon.getDate() + i); out.push(`${x.getFullYear()}-${p2(x.getMonth() + 1)}-${p2(x.getDate())}`) }
  return out
}
const selectedWeekDays = computed(() => (selectedDay.value ? weekDaysOf(selectedDay.value) : []))
const weekSet = computed(() => new Set(selectedWeekDays.value))
// Séances de la semaine sélectionnée, en ordre chronologique (lundi → dimanche)
const weekSessions = computed(() => {
  const days = weekSet.value
  return sessions.value.filter(s => days.has(s.at.slice(0, 10))).slice().sort((a, b) => a.at.localeCompare(b.at))
})
const fmtDM = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return `${d.getDate()} ${MONTHS[d.getMonth()].toLowerCase().slice(0, 4)}` }
const weekLabel = computed(() => {
  const d = selectedWeekDays.value
  return d.length ? `Semaine du ${fmtDM(d[0])} au ${fmtDM(d[6])}` : 'Choisis un jour'
})
const dayShort = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return `${DOW[(d.getDay() + 6) % 7]} ${d.getDate()}` }
function calShift(delta: number) {
  let m = calMonth.value.m + delta
  let y = calMonth.value.y
  if (m < 0) { m = 11; y-- } else if (m > 11) { m = 0; y++ }
  calMonth.value = { y, m }
}
function pickDay(iso: string | null, sess: SessionRecord[]) {
  if (!iso || !sess.length) return
  selectedDay.value = iso
}
function edit(rec: SessionRecord) {
  sheetRecord.value = null
  emit('edit', rec)
}

onMounted(() => {
  const recent = sessionLog()[0]
  if (recent) {
    calMonth.value = { y: +recent.at.slice(0, 4), m: +recent.at.slice(5, 7) - 1 }
    selectedDay.value = recent.at.slice(0, 10)
  } else {
    const now = new Date()
    calMonth.value = { y: now.getFullYear(), m: now.getMonth() }
    selectedDay.value = props.todayIso
  }
})
</script>

<template>
  <div class="stack">
    <div v-if="!sessions.length" class="card empty">Aucune séance enregistrée pour l'instant.<br>Tes séances apparaîtront ici dans le calendrier.</div>
    <template v-else>
      <div class="card cal-card">
        <div class="cal-head">
          <button class="cal-nav" aria-label="Mois précédent" @click="calShift(-1)">‹</button>
          <div class="cal-month">{{ monthLabel }}</div>
          <button class="cal-nav" aria-label="Mois suivant" @click="calShift(1)">›</button>
        </div>
        <div class="cal-dow-row"><span v-for="(d, i) in ['L', 'M', 'M', 'J', 'V', 'S', 'D']" :key="i" class="cal-dow">{{ d }}</span></div>
        <div class="cal-grid">
          <button
            v-for="(c, i) in calCells" :key="i"
            class="cal-cell"
            :class="{ empty: !c.iso, has: c.sessions.length, today: c.iso === todayIso, sel: c.iso === selectedDay, inweek: c.iso && weekSet.has(c.iso) }"
            :disabled="!c.iso || !c.sessions.length"
            @click="pickDay(c.iso, c.sessions)"
          >
            <span v-if="c.iso" class="cal-day">{{ c.day }}</span>
            <span v-if="c.sessions.length" class="cal-dots">
              <span v-for="(s, k) in c.sessions.slice(0, 3)" :key="k" class="cal-dot" :style="{ background: recColor(s) }"></span>
            </span>
          </button>
        </div>
      </div>

      <div class="section-label">{{ weekLabel }}</div>
      <div v-if="weekSessions.length" class="day-sessions">
        <button v-for="(s, i) in weekSessions" :key="i" class="card day-session" :style="{ '--c': recColor(s) }" @click="sheetRecord = s">
          <div class="ds-top">
            <span class="ds-day mono">{{ dayShort(s.at.slice(0, 10)) }}</span>
            <span class="ds-dot"></span>
            <span class="ds-name">{{ s.name }}</span>
            <span class="ds-time mono">{{ s.at.slice(11, 16) }}<template v-if="s.durationMin"> · {{ s.durationMin }} min</template></span>
          </div>
          <div class="ds-sum muted">{{ s.entries.length }} exos<template v-if="s.sprint && s.sprint.length"> · ⚡ sprint</template> · touche pour voir / modifier</div>
        </button>
      </div>
      <div v-else class="card empty small">Aucune séance cette semaine. Touche un jour marqué d'un point.</div>
    </template>

    <!-- Feuille de séance (bottom sheet) -->
    <transition name="sheet">
      <div v-if="sheetRecord" class="sheet-overlay" @click.self="sheetRecord = null">
        <div class="sheet">
          <div class="sheet-handle"></div>
          <div class="sheet-head" :style="{ '--c': recColor(sheetRecord) }">
            <div>
              <div class="sheet-title"><span class="sheet-dot"></span>{{ sheetRecord.name }}</div>
              <div class="muted mono">{{ sheetRecord.at.slice(0, 10) }} · {{ sheetRecord.at.slice(11, 16) }}<template v-if="sheetRecord.durationMin"> · {{ sheetRecord.durationMin }} min</template></div>
            </div>
            <button class="sheet-close" aria-label="Fermer" @click="sheetRecord = null">×</button>
          </div>
          <div class="sheet-body">
            <div v-for="e in sheetRecord.entries" :key="e.exId" class="history-entry">
              <span class="history-ex">{{ exName(e.exId) }}<span v-if="effortIcon(e.effort)" class="history-effort" :title="effortLabel(e.effort)">{{ effortIcon(e.effort) }}</span></span>
              <span class="mono muted">{{ e.sets.map(x => `${x.warm ? '🔥' : ''}${x.w}×${x.r}${x.w2 != null ? ` / ${x.w2}×${x.r2}` : ''}`).join(' · ') }}</span>
            </div>
            <div v-for="(sp, k) in (sheetRecord.sprint || [])" :key="'sp' + k" class="history-entry">
              <span class="history-ex">⚡ {{ sp.kind === 'echauffement' ? 'Échauffement' : 'Sprint' }}</span>
              <span class="mono muted">{{ sp.count }} × {{ sp.duration }}<template v-if="sp.intensity"> @ {{ sp.intensity }}</template></span>
            </div>
            <div v-if="sheetRecord.note" class="history-note">📝 {{ sheetRecord.note }}</div>
            <div v-if="!sheetRecord.entries.length && !(sheetRecord.sprint || []).length" class="muted">Séance sans détail enregistré.</div>
          </div>
          <button class="btn-primary sheet-edit" @click="edit(sheetRecord!)">✏️ Modifier cette séance</button>
        </div>
      </div>
    </transition>
  </div>
</template>
