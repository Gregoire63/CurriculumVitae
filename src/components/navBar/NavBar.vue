<template>
  <div class="navBar">
    <svg
      class="logo"
      version="1.0"
      xmlns="http://www.w3.org/2000/svg"
      width="240.000000pt"
      height="219.000000pt"
      viewBox="0 0 240.000000 219.000000"
      preserveAspectRatio="xMidYMid meet"
      @click="gotToHome"
    >
      <g
        transform="translate(0.000000,219.000000) scale(0.100000,-0.100000)"
        :fill="getSVGColor"
        stroke="none"
      >
        <path
          d="M5 2178 c-3 -7 -4 -497 -3 -1088 l3 -1075 79 -3 79 -3 625 623 c344
      343 668 667 721 721 l95 98 -54 54 -54 55 -438 0 -439 0 3 -147 3 -148 173 -3
      c129 -2 172 -6 172 -15 0 -12 -632 -638 -651 -645 -5 -2 -8 261 -7 635 l3 638
      418 1 c230 1 421 4 424 8 4 4 -60 74 -142 156 l-150 150 -428 0 c-333 0 -429
      -3 -432 -12z"
        />
        <path
          d="M1330 2183 c0 -5 162 -170 361 -369 316 -316 360 -364 351 -380 -6
      -11 -324 -331 -706 -713 -383 -381 -693 -697 -690 -702 3 -5 93 -9 200 -9 188
      1 195 2 221 24 16 13 138 135 273 271 135 135 253 251 264 257 16 9 56 -27
      300 -271 l282 -282 99 3 100 3 3 110 2 110 -275 275 c-151 151 -275 280 -275
      285 0 6 124 134 275 285 l275 274 0 96 0 95 -323 323 -322 322 -208 0 c-114 0
      -207 -3 -207 -7z"
        />
      </g>
    </svg>
    <div style="position: absolute; right: 10px; top: 10px; z-index: 11">
      <input type="checkbox" id="checkbox" v-model="menuOpen" />
      <label for="checkbox" class="toggle">
        <div class="bars" id="bar1"></div>
        <div class="bars" id="bar2"></div>
        <div class="bars" id="bar3"></div>
      </label>
    </div>
    <div class="menu" :class="{ open: menuOpen }">
      <MenuContact />
    </div>
    <div id="overlay" @click="menuOpen ? (menuOpen = false) : null"></div>
  </div>
</template>
<style scoped>
.navBar {
  position: fixed;
  top: 0;
  background-color: transparent;
  width: 100%;
  z-index: 10;
}
.logo {
  position: absolute;
  top: 10px;
  left: 15px;
  width: 70px;
  height: 70px;
  cursor: pointer;
  z-index: 11;
}
.textContainer {
  opacity: 0;
  position: absolute;
  font-size: 20px;
  top: 17px;
  left: 70px;
  font-weight: 400;
  transition:
    opacity 0.4s,
    transform 0.4s;
  transform: translateX(-100%);
}

.showText {
  opacity: 1;
  transform: translateX(0);
}
.hideText {
  opacity: 0;
  transform: translateX(100%);
}
.bounce-animation {
  animation: bounce 0.7s linear;
  animation-fill-mode: both;
}
@keyframes bounce {
  0% {
    transform: translateX(-650px);
  }
  60% {
    transform: translateX(40px);
  }
  70% {
    transform: translateX(-30px);
  }
  80% {
    transform: translateX(10px);
  }
  100% {
    transform: translateX(0);
  }
}
.contact {
  font-family: 'Tilt Wrap';
  text-align: center;
  position: fixed;
  right: 10px;
  top: 10px;
  z-index: 3;
  cursor: pointer;
  transition: color linear 1s;
}

#checkbox {
  display: none;
  position: inherit;
  z-index: 11;
}

.toggle {
  position: relative;
  width: 40px;
  height: 40px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition-duration: 0.5s;
  z-index: 11;
}

.bars {
  width: 100%;
  height: 4px;
  background-color: var(--secondary);
  border-radius: 4px;
}

#bar2 {
  transition-duration: 0.8s;
}

#bar1,
#bar3 {
  width: 70%;
}

#checkbox:checked + .toggle .bars {
  position: absolute;
  transition-duration: 0.5s;
}

#checkbox:checked + .toggle #bar2 {
  transform: scaleX(0);
  transition-duration: 0.5s;
}

#checkbox:checked + .toggle #bar1 {
  width: 100%;
  transform: rotate(45deg);
  transition-duration: 0.5s;
}

#checkbox:checked + .toggle #bar3 {
  width: 100%;
  transform: rotate(-45deg);
  transition-duration: 0.5s;
}

#checkbox:checked + .toggle {
  transition-duration: 0.5s;
  transform: rotate(180deg);
}
.menu {
  z-index: 2;
  width: 0px;
  height: 0px;
  min-height: 0px;
  right: 0;
  top: 0;
  position: absolute;
  transition:
    width 0.4s ease-out,
    height 0.4s ease-out;
  max-width: 80%;
  overflow: hidden;
  background-color: var(--background-color);
}
.open {
  width: 400px;
  height: 535px;
  min-height: 535px;
  max-height: 90vh;
}
#overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(26, 26, 29, 0);
  user-select: none;
  pointer-events: none;
  z-index: 1;
}
</style>
<script setup>
import { gsap } from 'gsap'
import { computed, watch } from 'vue'
import { SiteStore } from '../../stores/Site'
import MenuContact from '../menu/MenuContact.vue'

const getBackgroundStep = computed(() => {
  return SiteStore().getBackgroundStep
})

const menuOpen = computed({
  get() {
    return SiteStore().menuIsOpen
  },
  set(v) {
    SiteStore().setMenuOpen(v)
  }
})

const getSVGColor = computed(() => {
  return getBackgroundStep.value == 2 ? 'var(--secondary)' : 'var(--primary)'
})

const gotToHome = () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  })
}
var keys = { 37: 1, 38: 1, 39: 1, 40: 1 }
const preventDefault = (e) => {
  try {
    e.preventDefault()
  } catch (_) {
    _
  }
}
const preventDefaultForScrollKeys = (e) => {
  try {
    if (keys[e.keyCode]) {
      preventDefault(e)
      return false
    }
  } catch (_) {
    _
  }
}
watch(
  () => menuOpen.value,
  (val) => {
    if (val) {
      gsap.to(document.getElementById('overlay'), {
        backgroundColor: 'rgba(26, 26, 29, 0.5)',
        pointerEvents: 'all',
        duration: 0.2
      })
      SiteStore().preventScrollEvent()
    } else {
      SiteStore().stopPreventScrollEvent()
      gsap.to(document.getElementById('overlay'), {
        backgroundColor: 'rgba(26, 26, 29, 0)',
        pointerEvents: 'none',
        duration: 0.2
      })
    }
  }
)
</script>
