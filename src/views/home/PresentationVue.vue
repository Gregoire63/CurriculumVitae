<template>
  <div class="container">
    <div class="left-section">
      <h1 class="slogan">{{ frSelect ? "Je m'appelle " : 'My name is ' }}Grégoire Raturat</h1>
      <span>{{
        frSelect ? 'Je suis un développeur full-stack ' : 'I am a full-stack developer'
      }}</span>
    </div>
    <img src="../../assets/photoCV.png" class="photo" />
  </div>
</template>
<script setup>
import { computed } from 'vue'
import { SiteStore } from '../../stores/Site.js'

const darkActive = computed(() => SiteStore().getDarkTheme)
const frSelect = computed(() => {
  return SiteStore().getLangage == 'fr'
})
</script>
<style scoped>
.container {
  display: flex;
  height: 100vh;
  justify-content: center;
}
.photo {
  user-select: none;
  pointer-events: none;
  position: absolute;
  width: 190px;
  z-index: 4;
  opacity: 0.9;
  top: 18.2vh;
  left: 12.5vw;
  transform: translateX(-50%);
}
.left-section,
.right-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 60%;
}

.right-section {
  width: 40%;
}

.slogan {
  font-family: 'Tilt Wrap';
  text-align: center;
}

.profile {
  width: 100%;
  max-width: 400px;
  display: flex;
  justify-content: center;
}
@media (max-width: 1024px) {
  .photo{
    width: 130px;
    left: 0px;
    top: -80px;
  }
  .presentation{
    top: 65vh;
  }
}


/* @media (max-width: 768px) {
  .container {
    flex-direction: column;
  }

  .left-section,
  .right-section {
    width: 100%;
  }

  .slogan {
    width: 80%;
  }

  .right-section {
    order: -1;
  }
} */
</style>
