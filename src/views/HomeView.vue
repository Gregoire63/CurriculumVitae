<template>
  <div style="height: 450vh" id="app_container">
    <div style="position: fixed; top: 0; right: 0; width: 100vw; height: 100vh; overflow: hidden">
      <div class="presentation">
        <img rel="preload" src="../assets/photoCV.webp" class="photo" alt="photo cv"  type="image/webp" />
        <div class="text">
          <h1 class="slogan">
            Grégoire Raturat - {{ frSelect ? 'Développeur FullStack' : 'FullStack Developer' }}
          </h1>
          <div style="margin: 20px">
            {{
              frSelect
                ? "Ingénieur Informatique chez Systra, motivé par l'innovation, je m'épanouis dans des environnements où l’apprentissage continu et le travail en équipe sont valorisés."
                : 'IT engineer at Systra, driven by innovation, I thrive in environments that value continuous learning and teamwork.'
            }}
          </div>
        </div>
        <button
          class="contact_button contact_btn"
          @click="SiteStore().setMenuOpen(true)"
          style="margin-block: 20px"
        >
          {{ frSelect ? 'ME CONTACTER' : 'CONTACT ME' }}
        </button>
      </div>
      <div id="triangle-top-right" class="triangle-top-right">
        <DegreesCard />
      </div>
      <div id="triangle-top-left" class="triangle-top-left">
        <SkillsCard />
      </div>
      <div id="left-border" class="left-border">
        <PorteFolio />
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, watch, computed } from 'vue'
import { SiteStore } from '../stores/Site.js'
import DegreesCard from './home/DegreesCard.vue'
import SkillsCard from './home/SkillsCard.vue'
import PorteFolio from './home/PorteFolio.vue'

const frSelect = computed(() => {
  return SiteStore().getLangage == 'fr'
})
const getScrollYPosition = computed(() => {
  return SiteStore().getScrollYPosition
})

const innerHeight = window.innerHeight
const lastScrollPosition = ref(null)

watch(
  () => getScrollYPosition.value,
  (y) => {
    const y_position = (y * 100) / innerHeight
    if(y_position<1 && lastScrollPosition.value && lastScrollPosition.value<1)
      window.scrollTo({ top: 350 * innerHeight / 100 })
    if (y_position < 10) {
      SiteStore().setBackgroundStep(0)
      const bars = document.getElementsByClassName('bars')
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.backgroundColor = 'var(--secondary)'
      }
      document.getElementById('triangle-top-right').classList.remove('expanded')
      document.getElementById('triangle-top-left').classList.remove('expanded')
      document.getElementById('left-border').classList.remove('expanded')

      document.getElementById('triangle-top-right').classList.remove('hide')
      document.getElementById('triangle-top-left').classList.remove('hide')
      document.getElementById('left-border').classList.remove('hide')
      lastScrollPosition.value = y_position
      return 
    }
    if (y_position < 20) {
      SiteStore().setBackgroundStep(1)
      document.getElementById('degrees_container').style.opacity = 0
      document.getElementById('triangle-top-right').classList.remove('expanded')
      document.getElementById('triangle-top-left').classList.remove('expanded')
      document.getElementById('left-border').classList.remove('expanded')

      document.getElementById('triangle-top-right').classList.remove('hide')
      document.getElementById('triangle-top-left').classList.add('hide')
      document.getElementById('left-border').classList.add('hide')
      lastScrollPosition.value = y_position
      return 
    }
    if (y_position < 100) {
      SiteStore().setBackgroundStep(2)
      document.getElementById('degrees_container').style.opacity = 1
      document.getElementById('triangle-top-right').classList.add('expanded')
      document.getElementById('triangle-top-left').classList.remove('expanded')
      document.getElementById('left-border').classList.remove('expanded')

      document.getElementById('triangle-top-right').classList.remove('hide')
      document.getElementById('triangle-top-left').classList.add('hide')
      document.getElementById('left-border').classList.add('hide')
      lastScrollPosition.value = y_position
      return 
    }
    if (y_position < 120) {
      SiteStore().setBackgroundStep(3)
      document.getElementById('degrees_container').style.opacity = 0
      document.getElementById('triangle-top-right').classList.remove('expanded')
      document.getElementById('triangle-top-left').classList.remove('expanded')
      document.getElementById('left-border').classList.remove('expanded')

      document.getElementById('triangle-top-right').classList.remove('hide')
      document.getElementById('triangle-top-left').classList.remove('hide')
      document.getElementById('left-border').classList.remove('hide')
      lastScrollPosition.value = y_position
      return 
    }
    if (y_position < 135) {
      SiteStore().setBackgroundStep(4)
      const bars = document.getElementsByClassName('bars')
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.backgroundColor = 'var(--secondary)'
      }
      const skills = document.getElementsByClassName("skill-group")
      for (let i = 0; i < skills.length; i++) {
        skills[i].style.opacity = 0
      }
      document.getElementById('triangle-top-right').classList.remove('expanded')
      document.getElementById('triangle-top-left').classList.remove('expanded')
      document.getElementById('left-border').classList.remove('expanded')

      document.getElementById('triangle-top-right').classList.add('hide')
      document.getElementById('triangle-top-left').classList.remove('hide')
      document.getElementById('left-border').classList.add('hide')
      lastScrollPosition.value = y_position
      return 
    }
    if (y_position < 190) {
      SiteStore().setBackgroundStep(5)
      const bars = document.getElementsByClassName('bars')
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.backgroundColor = 'var(--primary)'
      }
      const skills = document.getElementsByClassName("skill-group")
      for (let i = 0; i < skills.length; i++) {
        setTimeout(() => {
          skills[i].style.opacity = 1
        }, (i * 100)+500);
      }
      document.getElementById('triangle-top-right').classList.remove('expanded')
      document.getElementById('triangle-top-left').classList.add('expanded')
      document.getElementById('left-border').classList.remove('expanded')

      document.getElementById('triangle-top-right').classList.add('hide')
      document.getElementById('triangle-top-left').classList.remove('hide')
      document.getElementById('left-border').classList.add('hide')
      lastScrollPosition.value = y_position
      return 
    }
    if (y_position < 205) {
      SiteStore().setBackgroundStep(6)
      const bars = document.getElementsByClassName('bars')
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.backgroundColor = 'var(--secondary)'
      }
      const skills = document.getElementsByClassName("skill-group")
      for (let i = 0; i < skills.length; i++) {
        skills[i].style.opacity = 0
      }
      document.getElementById('triangle-top-right').classList.remove('expanded')
      document.getElementById('triangle-top-left').classList.remove('expanded')
      document.getElementById('left-border').classList.remove('expanded')

      document.getElementById('triangle-top-right').classList.remove('hide')
      document.getElementById('triangle-top-left').classList.remove('hide')
      document.getElementById('left-border').classList.remove('hide')
      lastScrollPosition.value = y_position
      return 
    }
    if (y_position < 220) {
      SiteStore().setBackgroundStep(7)
      const bars = document.getElementsByClassName('bars')
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.backgroundColor = 'var(--secondary)'
      }
      document.getElementById('triangle-top-right').classList.remove('expanded')
      document.getElementById('triangle-top-left').classList.remove('expanded')
      document.getElementById('left-border').classList.remove('expanded')

      document.getElementById('triangle-top-right').classList.add('hide')
      document.getElementById('triangle-top-left').classList.add('hide')
      document.getElementById('left-border').classList.remove('hide')
      if(window.innerWidth>=800)
        document.getElementById("portefolio-right-section").style.opacity = 0
      document.getElementById("portefolio-left-section").style.opacity = 0
      lastScrollPosition.value = y_position
      return 
    }
    if (y_position < 320) {
      SiteStore().setBackgroundStep(8)
      if(window.innerWidth>=800)
        document.getElementById("portefolio-right-section").style.opacity = 1
      document.getElementById("portefolio-left-section").style.opacity = 1
      const bars = document.getElementsByClassName('bars')
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.backgroundColor = 'var(--primary)'
      }
      document.getElementById('triangle-top-right').classList.remove('expanded')
      document.getElementById('triangle-top-left').classList.remove('expanded')
      document.getElementById('left-border').classList.add('expanded')

      document.getElementById('triangle-top-right').classList.add('hide')
      document.getElementById('triangle-top-left').classList.add('hide')
      document.getElementById('left-border').classList.remove('hide')
      const translateY = ((y_position - 220) / 99)*60;
      if(window.innerWidth>=800)
        document.getElementById("portefolio-right-section").style.transform = `translateY(${30-translateY}vh)`
      document.getElementById("portefolio-left-section").style.transform = `translateY(${-30+translateY}vh)`
      lastScrollPosition.value = y_position
      return 
    } 
    if (y_position < 350) {
      document.getElementById('degrees_container').style.opacity = 0
      if(window.innerWidth>=800)
        document.getElementById("portefolio-right-section").style.opacity = 0
      document.getElementById("portefolio-left-section").style.opacity = 0
      SiteStore().setBackgroundStep(9)
      const bars = document.getElementsByClassName('bars')
      for (let i = 0; i < bars.length; i++) {
        bars[i].style.backgroundColor = 'var(--secondary)'
      }
      document.getElementById('triangle-top-right').classList.remove('expanded')
      document.getElementById('triangle-top-left').classList.remove('expanded')
      document.getElementById('left-border').classList.remove('expanded')

      document.getElementById('triangle-top-right').classList.remove('hide')
      document.getElementById('triangle-top-left').classList.remove('hide')
      document.getElementById('left-border').classList.remove('hide')
      lastScrollPosition.value = y_position
      return 
    }
    else if(lastScrollPosition.value && lastScrollPosition.value>10)
        window.scrollTo({ top: 0 })
  }
)
const startScrolling = ref(false)
watch(
  () => SiteStore().darkActive,
  (val) => {
    if (val) {
      startScrolling.value = true
      document.getElementById('scrollHelp').style.opacity = 0
    } else {
      startScrolling.value = false
      document.getElementById('scrollHelp').style.opacity = 1
    }
  }
)
</script>
<style scoped>
.presentation {
  position: fixed;
  top: 50vh;
  left: calc(25vw + 75vw / 2);
  transform: translateY(-50%) translateX(-60%);
  width: fit-content;
  height: fit-content;
  justify-content: center;
  display: flex;
  flex-direction: column;
}
.presentation .text {
  color: var(--primary);
  text-align: center;
}
.presentation .slogan {
  font-family: 'Tilt Wrap';
  text-align: center;
}
.presentation .photo {
  user-select: none;
  pointer-events: none;
  position: absolute;
  width: 190px;
  opacity: 0.9;
  left: -200px;
  bottom: -170px;
  transform: translateY(-50%);
  border-bottom: 3px solid var(--primary);
  border-radius: 15px;
}
.triangle-top-right {
  position: absolute;
  top: 80px;
  right: -5vw;
  width: 130vw;
  background-color: var(--primary);
  transform: rotate(12deg) translateY(-100%);
  z-index: 3;
  height: 100vh;
  transition: all 0.8s;
}
.triangle-top-right.expanded {
  top: 0px;
  transform: unset;
}
.triangle-top-right.hide {
  top: 0;
  transform: rotate(0deg) translateY(-100%);
}
.triangle-top-left {
  position: absolute;
  top: 0;
  left: 0;
  width: 150vw;
  transition: all 0.8s;
  height: 130vh;
  background-color: var(--secondary);
  transform: rotate(-37deg) translateX(-30%) translateY(-117.6%);
  z-index: 2;
}
.triangle-top-left.expanded {
  transform: unset;
}
.triangle-top-left.hide {
  transform: rotate(0deg) translateX(-30%) translateY(-117.6%);
}
.left-border {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1;
  width: 25vw;
  height: 100vh;
  background-color: var(--secondary_1);
  transition: all 0.8s;
}
.left-border.expanded {
  width: 100vw;
}
.left-border.hide {
  width: 0vw;
}

@media (max-width: 1024px) {
  .presentation {
    top: 65vh;
  }
  .triangle-top-right {
    transform: rotate(15deg) translateY(-100%);
  }
  .triangle-top-left {
    transform: rotate(-37deg) translateX(-30%) translateY(-100%);
  }
}

@media (max-width: 768px) {
  .presentation .photo {
    width: 140px;
    left: 0px;
    top: -80px;
  }
  .presentation {
    top: 70vh;
  }
  .triangle-top-right {
    top: 20px;
    transform: rotate(14deg) translateY(-100%);
  }
  .triangle-top-left {
    transform: rotate(-25deg) translateX(-20%) translateY(-100%);
  }
}
@media (max-width: 465px) {
  .triangle-top-left {
    transform: rotate(-40deg) translateX(30%) translateY(-90%);
  }
  .presentation .slogan{
    font-size: 22px;
  }
  .presentation .text {
    font-size: 13px;
  }
  .presentation {
    width: 60%;
  }
}
</style>
