<script setup lang="ts">
import { ref, onUnmounted } from 'vue'

const left = ref(0)
let interval: ReturnType<typeof setInterval> | null = null

function start(sec: number) {
  stop()
  left.value = sec
  interval = setInterval(() => {
    left.value--
    if (left.value <= 0) {
      stop()
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    }
  }, 1000)
}

function stop() {
  if (interval) clearInterval(interval)
  interval = null
  left.value = 0
}

function fmt(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

onUnmounted(stop)
</script>

<template>
  <div class="rest-timer">
    <template v-if="left > 0">
      <span class="timer-value mono" :class="{ urgent: left <= 10 }">{{ fmt(left) }}</span>
      <button class="btn" @click="stop">Stop</button>
    </template>
    <template v-else>
      <button class="btn" @click="start(90)">Repos 1:30</button>
      <button class="btn" @click="start(120)">2:00</button>
      <button class="btn" @click="start(180)">3:00</button>
    </template>
  </div>
</template>

<style scoped>
.rest-timer { display: flex; gap: 8px; align-items: center; }
.timer-value { font-size: 22px; font-weight: 700; color: #EDEFF3; }
.timer-value.urgent { color: #FF4D3D; }
.mono { font-family: 'SF Mono', ui-monospace, Menlo, monospace; }
.btn {
  background: transparent; border: 1px solid #313A4C; color: #B9C0CC;
  border-radius: 8px; padding: 8px 14px; font-size: 13px; cursor: pointer;
}
.btn:active { transform: scale(0.97); }
</style>
