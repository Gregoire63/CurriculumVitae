<script setup>
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { SiteStore } from '../../stores/Site'

const darkActive = computed(() => SiteStore().getDarkTheme)
const delay = ref(false)
const mouseMove = (e) => {
  if (delay.value) return
  delay.value = true
  const btn = e.target
  const rect = btn.getBoundingClientRect()
  const h = rect.width / 2

  const x = e.clientX - rect.left - h
  const y = e.clientY - rect.top - h

  const r1 = Math.sqrt(x * x + y * y)
  const r2 = (1 - r1 / h) * r1

  const angle = Math.atan2(y, x)
  const tx = Math.round(Math.cos(angle) * r2 * 100) / 100
  const ty = Math.round(Math.sin(angle) * r2 * 100) / 100

  const op = r2 / r1 + 0.4
  btn.style.setProperty('--tx', `${tx}px`)
  btn.style.setProperty('--ty', `${ty}px`)
  btn.style.setProperty('--opacity', `${op}`)
  setTimeout(() => (delay.value = false), 100)
}
const mouseLeave = (e) => {
  const btn = e.target
  btn.style.setProperty('--tx', '0px')
  btn.style.setProperty('--ty', '0px')
  btn.style.setProperty('--opacity', `${0.4}`)
}
onMounted(() => {
  document.querySelectorAll('.gravityButton').forEach((btn) => {
    btn.addEventListener('mousemove', mouseMove)
    btn.addEventListener('mouseleave', mouseLeave)
  })
})
onUnmounted(() => {
  document.querySelectorAll('.gravityButton').forEach((btn) => {
    btn.removeEventListener('mousemove', mouseMove)
    btn.removeEventListener('mouseleave', mouseLeave)
  })
})
</script>
<template>
  <div style="display: flex; justify-content: center; width: 100%">
    <div class="gravityButton" aria-labelledby="GitHub">
      <button style="--color: var(--primary); --_fill: var(--primary)">
        <a target="_blank" href="https://github.com/Gregoire63" aria-label="GitHub">
          <svg
            class="buttonIcon"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
            />
          </svg>
        </a>
      </button>
    </div>
    <div class="gravityButton">
      <button style="--color: var(--primary); --_fill: var(--primary)" aria-labelledby="Linkedin">
        <a target="_blank" href="https://www.linkedin.com/in/gr%C3%A9goire-raturat-b671091aa/" aria-label="Linkedin">
          <svg
            class="buttonIcon"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
          >
            <path
              d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
            />
          </svg>
        </a>
      </button>
    </div>
    <div class="gravityButton">
      <button style="--color: var(--primary); --_fill: var(--primary)" aria-labelledby="CV">
        <a href="/cv/CV_Gregoire_Raturat.pdf" download="CV_Gregoire_Raturat.pdf" aria-label="CV">
          <svg
            class="buttonIcon"
            style="width: 60%; height: 60%; margin-top: 3px"
            width="9"
            height="22"
            xmlns="http://www.w3.org/2000/svg"
            fill-rule="evenodd"
            clip-rule="evenodd"
          >
            <path
              d="M3 24h19v-23h-1v22h-18v1zm17-24h-18v22h18v-22zm-3 17h-12v1h12v-1zm0-3h-12v1h12v-1zm0-3h-12v1h12v-1zm-7.348-3.863l.948.3c-.145.529-.387.922-.725 1.178-.338.257-.767.385-1.287.385-.643 0-1.171-.22-1.585-.659-.414-.439-.621-1.04-.621-1.802 0-.806.208-1.432.624-1.878.416-.446.963-.669 1.642-.669.592 0 1.073.175 1.443.525.221.207.386.505.496.892l-.968.231c-.057-.251-.177-.449-.358-.594-.182-.146-.403-.218-.663-.218-.359 0-.65.129-.874.386-.223.258-.335.675-.335 1.252 0 .613.11 1.049.331 1.308.22.26.506.39.858.39.26 0 .484-.082.671-.248.187-.165.322-.425.403-.779zm3.023 1.78l-1.731-4.842h1.06l1.226 3.584 1.186-3.584h1.037l-1.734 4.842h-1.044z"
            />
          </svg>
        </a>
      </button>
    </div>
  </div>
</template>
<style scoped>
.gravityButton {
  display: grid;
  place-items: center;
  padding: 10px 15px;
  width: 33%;
  aspect-ratio: 1;
  border-radius: 50%;
  margin: 5px !important;
  z-index: 9;
}
.gravityButton > button {
  font: inherit;
  width: 48px;
  aspect-ratio: 1;
  background: none;
  padding: 5px !important;
  border-radius: 50%;
  border: 2px solid var(--_fill, #fff);
  transform: translate(var(--tx, 0), var(--ty, 0)) !important;
  opacity: var(--opacity, 0.4) !important;
  cursor: pointer;
  transition: all 0.2s ease-out;
}
.gravityButton > button:hover {
  opacity: 1 !important;
}
.gravityButton[style*='--tx'] > button {
  --tx: inherit !important;
}

.gravityButton[style*='--ty'] > button {
  --ty: inherit !important;
}

.gravityButton[style*='--opacity'] > button {
  --opacity: inherit !important;
}
.gravityButton > button:hover,
.gravityButton > button:focus-visible {
  --_fill: var(--color, #fff);
}
.gravityButton > button:focus-visible {
  outline: 2px solid #fff;
  outline-offset: 2px;
  opacity: 1;
}
.buttonIcon {
  width: 70%;
  height: 70%;
  fill: var(--_fill, #fff);
  transition: fill 0.3s;
}
</style>
