<template>
  <object id="pointerBoat" :data="boatSVG" :class="{ hide: !isHover }" class="pointer"></object>
  <div
    id="ripple"
    class="ripple-container"
    @mouseover="isHover = true"
    @mouseleave="isHover = false"
  ></div>
</template>

<script setup>
import { useRipples } from 'vivid-ripples'
import boatSVG from '../../assets/boat.svg'
import { ref, onMounted, onUnmounted, watch } from 'vue'

const isHover = ref(false)
watch(isHover, (val) => {
  const background = document.getElementById('ripple')
  if (val) background.style.backgroundColor = 'rgb(71, 165, 202)'
  else {
    background.style.backgroundColor = 'rgb(11, 129, 11)'
    // if(window.scrollY< window.innerHeight*3 +80) background.style.backgroundColor = "rgb(71, 165, 202)"
    // else background.style.backgroundColor = "rgb(11, 129, 11)"
  }
})
let prevMouseX = 0
let prevMouseY = 0
const movePointer = (e) => {
  const pointer = document.getElementById('pointerBoat')
  const mouseX = e.clientX
  const mouseY = e.clientY
  const deltaX = mouseX - prevMouseX
  const deltaY = mouseY - prevMouseY
  let transform
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    if (deltaX > 2) {
      transform = 'scale(1) rotate(0deg)'
    }
    if (deltaX < -2) {
      transform = 'scale(-1,1) rotate(0deg)'
    }
  } else {
    if (deltaY > 2) {
      transform = 'scale(1) rotate(80deg)'
    }
    if (deltaY < -2) {
      transform = 'scale(1) rotate(-80deg)'
    }
  }
  if (transform) pointer.style.transform = transform
  prevMouseX = mouseX
  prevMouseY = mouseY

  pointer.style.left = `${mouseX - 30}px`
  pointer.style.top = `${mouseY + window.scrollY - 40}px`
}

onMounted(() => {
  useRipples(document.getElementById('ripple'), {
    resolution: 512,
    dropRadius: 20,
    perturbance: 0.04
  })
  document.getElementById('ripple').addEventListener('mousemove', movePointer)
})
onUnmounted(() => {
  document.getElementById('ripple').removeEventListener('mousemove', movePointer)
})
</script>

<style scoped>
.ripple-container {
  overflow: hidden;
  height: 100%;
  width: 100%;
  background-color: rgb(11, 129, 11);
}
.ripple-container:hover {
  cursor: none;
}

.pointer {
  user-select: none;
  position: absolute;
  z-index: 99;
  top: 10px;
  left: 1400px;
  width: 50px;
  height: 50px;
  opacity: 1;
  transform: scale(1);
  pointer-events: none;
  transition:
    opacity 0.2s ease-out,
    transform 0.2s ease-out;
}
.pointer.hide {
  opacity: 0;
  transform: scale(0);
}
</style>
