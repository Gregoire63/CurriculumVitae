<template>
  <div class="container" id="container">
    <LangageChoice class="lang" />
    <div class="menu-triangle-top-right"></div>
    <div class="menu-triangle-bottom-left"></div>
    <div id="menu-ripple" class="ripple" ref="waveContainer"></div>
    <div
      id="navigation"
      style="
        display: flex;
        flex-direction: column;
        position: absolute;
        top: 40px;
        padding: 10px 40px;
        font-family: 'Playfair Display', serif;
        font-size: 19px;
      "
    >
      <span class="nav-text" @click="SiteStore().flyTo('presentation')" :style="getBackgroundStep==0?'filter: brightness(70%) !important;':''">
        <b style="font-size: 22px !important">1</b> -
        {{ frSelect ? 'Présentation' : 'Presentation' }}
      </span>
      <span class="nav-text" @click="SiteStore().flyTo('degrees')" :style="getBackgroundStep==2?'filter: brightness(70%) !important;':''">
        <b style="font-size: 22px !important">2</b> - {{ frSelect ? 'Diplômes' : 'Degrees' }}
      </span>
      <span class="nav-text" @click="SiteStore().flyTo('skills')" :style="getBackgroundStep==5?'filter: brightness(70%) !important;':''">
        <b style="font-size: 22px !important">3</b> - {{ frSelect ? 'Compétences' : 'Skills' }}
      </span>
      <span class="nav-text" @click="SiteStore().flyTo('portefolio')" :style="getBackgroundStep==8?'filter: brightness(70%) !important;':''">
        <b style="font-size: 22px !important">4</b> - PorteFolio
      </span>
    </div>
    <div class="form-card" id="form-card">
      <h2 class="title">{{ frSelect ? 'Contactez-moi' : 'Contact Me' }}</h2>
      <form @submit.prevent="submitForm" style="height: 100%">
        <div class="form-group">
          <input
            type="text"
            name="name"
            @blur="handleBlur"
            @focus="handleFocus(false)"
            v-model="email"
            class="question"
            id="nme"
            required
            autocomplete="off"
            :lang="frSelect ? 'fr' : 'en'"
          />
          <label for="email"><span>Email</span></label>
        </div>
        <div class="form-group">
          <textarea
            @blur="handleBlur"
            @focus="handleFocus(true)"
            name="message"
            rows="2"
            v-model="message"
            class="question"
            id="msg"
            required
            autocomplete="off"
            :lang="frSelect ? 'fr' : 'en'"
          ></textarea>
          <label for="msg"><span>Message </span></label>
        </div>
        <button v-if="!playState" type="submit" class="contact_button">
          {{ frSelect ? 'ENVOYER' : 'SEND' }}
        </button>
        <Vue3Lottie
          v-else
          class="send"
          :loop="1"
          :animationData="sendJSON"
          :height="100"
          :width="100"
        />
      </form>
    </div>
    <MagnetButton id="magnet" style="position: absolute; top: 200px" />
  </div>
</template>
<script setup>
import { useRipples } from 'vivid-ripples'
import { onMounted, onUnmounted, ref, watch, computed } from 'vue'
import { Vue3Lottie } from 'vue3-lottie'
import sendJSON from '../../assets/send-contact.json'
import { SiteStore } from '../../stores/Site.js'
import gsap from 'gsap'
import MagnetButton from '../magnets/MagnetButton.vue'
import LangageChoice from '../langageChoice/LangageChoice.vue'

let intervalId = null

const getBackgroundStep = computed(() => {
  return SiteStore().getBackgroundStep
})

const setNewWaves = () => {
  const time = Math.random() * 2000
  setTimeout(() => {
    const x = Math.random() * 400 + 50
    const y = Math.random() * 700 + 50
    ripplesObject.drop(x, y, 10, 0.1)
  }, time)
}
setNewWaves()
intervalId = setInterval(() => {
  setNewWaves()
}, 2000)
const loaded = ref(false)
const playState = ref(false)
const name = ref('')
const email = ref('')
const message = ref('')

const frSelect = computed(() => {
  return SiteStore().getLangage == 'fr'
})
const menuIsOpen = computed(() => {
  return SiteStore().menuIsOpen
})
const handleBlur = () => {
  console.log(
    message.value.length && email.value.length,
    message.value.length || email.value.length
  )
  document.getElementsByClassName('open')[0].style.height =
    message.value.length && email.value.length
      ? '570px'
      : message.value.length || email.value.length
        ? '550px'
        : '300px'
}
const handleFocus = (isQuestion = false) => {
  if (isQuestion) {
    console.log(email.value, email.value.length)
    document.getElementsByClassName('open')[0].style.height = email.value.length ? '570px' : '550px'
  } else {
    document.getElementsByClassName('open')[0].style.height = message.value.length
      ? '570px'
      : '550px'
  }
}
const submitForm = () => {
  playState.value = true
  const x = Math.random() * 400 + 50
  const y = Math.random() * 700 + 50
  ripplesObject.drop(x, y, 20, 0.2)
  // Vous pouvez ajouter ici la logique pour envoyer le formulaire (par exemple, via une requête HTTP)
  console.log('Nom:', name.value)
  console.log('Email:', email.value)
  console.log('Message:', message.value)
  // Réinitialiser le formulaire après l'envoi
  setTimeout(() => {
    name.value = ''
    email.value = ''
    message.value = ''
    document.getElementsByClassName('open')[0].style.height = '380px'
    playState.value = false
  }, 2000)
}

let ripplesObject

onMounted(() => {
  loaded.value = true
  setTimeout(() => {
    const card = document.getElementById('form-card')
    gsap.to(card, {
      delay: 1.5,
      opacity: 1,
      duration: 1
    })
    ripplesObject = useRipples(document.getElementById('menu-ripple'), {
      resolution: 512,
      dropRadius: 20,
      perturbance: 0.04
    })
  }, 10)
})
onUnmounted(() => {
  clearInterval(intervalId)
  ripplesObject.destroy()
})

watch(
  () => menuIsOpen.value,
  (val) => {
    if (val) {
      gsap.to('.nav-text', {
        delay: 0.1,
        duration: 0.5,
        x: 0,
        stagger: {
          each: 0.1
        }
      })
      gsap.to('#magnet', {
        delay: 0.45,
        opacity: 1,
        duration: 1
      })
      gsap.to('#form-card', {
        delay: 0.5,
        y: 0,
        duration: 0.5
      })
      gsap.to('.menu-triangle-top-right', {
        delay: 0.1,
        y: 0,
        x: 0,
        duration: 0.5
      })
      gsap.to('.menu-triangle-bottom-left', {
        delay: 0.12,
        x: 0,
        y: 0,
        duration: 0.5
      })
    } else {
      gsap.to('.nav-text', {
        duration: 0.5,
        x: '-250%'
      })
      gsap.to('#magnet', {
        opacity: 0,
        duration: 0.5
      })
      gsap.to('#form-card', {
        y: 300,
        duration: 0.5
      })
      gsap.to('.menu-triangle-top-right', {
        delay: 0.1,
        y: -200,
        x: 200,
        duration: 0.5
      })
      gsap.to('.menu-triangle-bottom-left', {
        delay: 0.12,
        x: -200,
        y: 200,
        duration: 0.5
      })
    }
  }
)
</script>
<style scoped>
.container {
  overflow: hidden !important;
  position: relative;
  width: 100%;
  height: 100%;
  top: 0;
  background-color: var(--secondary);
  right: 0;
}
.ripple {
  z-index: 1;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  transition: background-color 0.5s ease-out;
}
.title {
  font-size: calc(10px + 1vw);
  margin-bottom: 5px;
  color: var(--primary);
  margin-top: 0;
  text-align: start;
}

.send {
  /* position: relative; */
  bottom: 0px;
}

.form-card {
  pointer-events: none;
  font-family: 'Playfair Display', serif;
  font-optical-sizing: auto;
  font-style: normal;
  position: absolute;
  padding: 10px 30px;
  text-align: center;
  bottom: 0;
  width: -webkit-fill-available;
  opacity: 0;
  min-height: 200px;
  z-index: 100;
  display: inline-grid;
  justify-items: center;
  transition: height 0.3s ease-out;
}
.pointer.hide {
  opacity: 0;
  transform: scale(0);
}
.particle {
  z-index: 19000;
  position: absolute;
  /* position:fixed; */
  top: 0;
  left: 0;
  opacity: 0;
  pointer-events: none;
  background-repeat: no-repeat;
  background-size: contain;
}

.form-group {
  margin-bottom: 5px;
  margin-top: 5px;
  overflow: hidden;
  pointer-events: all !important;
}

input,
span,
label,
textarea {
  display: block;
  margin: 10px;
  padding: 5px;
  border: none;
  font-size: 15px;
  color: #1a1a1d;
  min-width: 50px;
  transition: height 0.8s ease;
  -webkit-transition: height 0.8s ease;
}
textarea {
  max-width: 100%;
  width: 350px;
  -webkit-box-sizing: border-box;
  -moz-box-sizing: border-box;
  box-sizing: border-box;
}
/* textarea:focus,
textarea:valid {
  height: 150px;
} */

textarea:focus,
input:focus {
  outline: 0;
}
/* Question */

input.question,
textarea.question {
  font-size: 20px;
  font-weight: 300;
  border-radius: 2px;
  margin: 0;
  border: none;
  background: rgba(104, 124, 235, 0);
  transition:
    padding-top 0.2s ease,
    margin-top 0.2s ease;
  overflow-x: hidden; /* Hack to make "rows" attribute apply in Firefox. */
}
/* Underline and Placeholder */

input.question + label,
textarea.question + label {
  display: block;
  position: relative;
  white-space: nowrap;
  padding: 0;
  margin: 0;
  width: 10%;
  border-top: 1px solid var(--primary);
  -webkit-transition: width 0.4s ease;
  transition: width 0.4s ease;
  height: 0px;
}

input.question:focus + label,
textarea.question:focus + label {
  width: 80%;
}

input.question:focus,
input.question:valid {
  padding-top: 45px;
}

textarea.question:valid,
textarea.question:focus {
  margin-top: 40px;
}

input.question:focus + label > span,
input.question:valid + label > span {
  top: -60px;
  font-size: 18px;
  color: var(--primary);
}

textarea.question:focus + label > span,
textarea.question:valid + label > span {
  top: -80px;
  font-size: 18px;
  color: var(--primary);
}

input.question:invalid,
textarea.question:invalid {
  box-shadow: none;
}

input.question + label > span,
textarea.question + label > span {
  font-weight: 300;
  margin: 0;
  position: absolute;
  color: #1a1a1d;
  font-size: 20px;
  top: -40px;
  left: 0px;
  z-index: -1;
  -webkit-transition:
    top 0.5s ease,
    font-size 0.5s ease,
    color 0.5s ease;
  transition:
    top 0.5s ease,
    font-size 0.5s ease,
    color 0.5s ease;
}

input[type='submit'] {
  -webkit-transition:
    opacity 0.2s ease,
    background 0.2s ease;
  transition:
    opacity 0.2s ease,
    background 0.2s ease;
  display: block;
  opacity: 0;
  margin: 10px 0 0 0;
  padding: 10px;
  cursor: pointer;
}

input[type='submit']:hover {
  background: #eee;
}

input[type='submit']:active {
  background: #999;
}

input.question:valid ~ input[type='submit'],
textarea.question:valid ~ input[type='submit'] {
  -webkit-animation: appear 1s forwards;
  animation: appear 1s forwards;
}

input.question:invalid ~ input[type='submit'],
textarea.question:invalid ~ input[type='submit'] {
  display: none;
}

@-webkit-keyframes appear {
  100% {
    opacity: 1;
  }
}

@keyframes appear {
  100% {
    opacity: 1;
  }
}
@media (max-width: 768px) {
  textarea {
    min-width: 300px;
  }
  @media (max-width: 400px) {
    textarea {
      min-width: 250px;
    }
  }
}

.nav-text {
  margin: 0;
  font-size: 18px !important;
  font-weight: bold;
  color: var(--primary);
  cursor: pointer;
  z-index: 110;
  pointer-events: all;
  transform: translateX(-250%);
  transition: all 0.4s ease;
}
.nav-text:hover {
  filter: brightness(70%);
}
.menu-triangle-top-right {
  position: absolute;
  top: 0;
  right: 0;
  width: 0;
  z-index: 0;
  height: 0;
  border-bottom: 20vh solid transparent;
  border-right: 15vh solid var(--primary);
  opacity: 0.7;
}
.menu-triangle-bottom-left {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  z-index: 0;
  height: 0;
  border-top: 15vh solid transparent;
  border-left: 20vh solid var(--gray);
  opacity: 0.7;
}

.lang {
  font-family: 'Tilt Wrap';
  text-align: center;
  position: absolute;
  transition: all 0.3s ease-out;
  top: 5px;
  opacity: 0.6;
  right: 370px;
  z-index: 3;
  cursor: pointer;
}
.lang:hover {
  opacity: 0.9;
}
</style>
