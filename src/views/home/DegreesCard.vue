<template>
  <div class="degrees-container" id="degrees_container">
    <div class="degree-title">{{ frSelect ? 'Diplômes' : 'Degrees' }}</div>
    <div class="degrees">
      <div class="degree">
        <div class="year">2021 - 2023</div>
        <div class="title">MASTER - {{ frSelect? 'Expert en Système d\'Information':'Information System Expert'}}</div>
        <div class="school" @click="openWindow('https://www.ecole-isitech.com/')">ISITECH - Lyon</div>
      </div>
      <div class="degree">
        <div class="year">2020 - 2021</div>
        <div class="title">BACHELOR - {{ frSelect? 'Responsable de Projet Informatique':'IT Project Manager'}}</div>
        <div class="school" @click="openWindow('https://www.ecole-isitech.com/')">ISITECH - Lyon</div>
      </div>
      <div class="degree">
        <div class="year">2017 - 2020</div>
        <div class="title">LICENCE - {{frSelect? 'Licence Informatique':'Computer Science Degree'}}</div>
        <div class="school" @click="openWindow('https://www.uca.fr/')">Université Clermont Auvergne - Clermont-Ferrand</div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { onMounted, computed } from 'vue'
import { SiteStore } from '../../stores/Site.js'

const frSelect = computed(() => {
  return SiteStore().getLangage == 'fr'
})
onMounted(() => {
  if(window.innerWidth<800) return
  const degrees = document.querySelectorAll('.degree')
  const setHoverData = (e, degree) => {
    const rect = degree.getBoundingClientRect()
    const xPercentage = ((e.clientX - rect.left) / rect.width) * 100
    const yPercentage = ((e.clientY - rect.top) / rect.height) * 100

    const rotateX = (yPercentage - 50) / 20
    const rotateY = (50 - xPercentage) / 20

    degree.style.setProperty('--x', `${xPercentage}%`)
    degree.style.setProperty('--y', `${yPercentage}%`)
    degree.style.setProperty('--rotate-x', `${rotateX}deg`)
    degree.style.setProperty('--rotate-y', `${rotateY}deg`)
  }
  // Try disable transition on hover with delay
  degrees.forEach((degree) => {
    degree.addEventListener('mouseenter', (e) => {
      setHoverData(e, degree)
    })

    degree.addEventListener('mousemove', (e) => {
      setHoverData(e, degree)
    })
  })
})
const openWindow = (name) => {
  window.open(name, '_blank')
}
</script>
<style scoped>
.degrees-container {
  height: 100%;
  position: absolute;
  top: 0;
  right: 55vw;
  opacity: 0;
  transform: translateX(50%);
  padding: 20px;
  box-sizing: border-box;
  width: 100vw;
  justify-content: center;
  align-items: center;
  color: var(--gray);
  display: flex;
  flex-direction: column;
  transition: opacity .5s ease;
  transition-delay: .5s;
}
.degree-title {
  font-size: 30px;
  font-weight: 600;
}
.degrees {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}

.degree {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 20px;
  width: 260px;
  height: 260px;
  margin: 20px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.19);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4.3px);
  -webkit-backdrop-filter: blur(4.3px);
  background: none;
  border-radius: 10px;
}
.degree:hover {
  background: radial-gradient(
    circle at var(--x) var(--y),
    var(--secondary),
    rgba(125, 97, 103, 0.01) 70px
  ) !important;
  transform: perspective(500px) rotateX(var(--rotate-x)) rotateY(var(--rotate-y)) !important;
}
.year {
  font-size: 20px;
  font-weight: bold;
  margin-bottom: 10px;
  pointer-events: none;
}

.title {
  font-size: 22px;
  margin-bottom: 10px;
  pointer-events: none;
}

.school {
  font-size: 16px;
  color: #fff1f1;
  cursor: pointer;
}

@media (max-width: 1024px) {
  .degree {
    width: 220px;
    height: 220px;
  }
}
  @media (max-width: 768px) {
  .degree {
    width: 200px;
    height: 200px;
  }
}
@media (max-width: 606px) {
  .degree {
    width: 210px;
    height: 130px;
  }
  .year{
    font-size: 18px;
  }
  .title {
    font-size: 19px;
    margin-inline: 10px;
  }
}
@media (max-width: 480px) {
  .degree {
    width: 220px;
    height: 100px;
    flex-direction: row;
  }
  .year{
    font-size: 16px;
  }
  .title {
    font-size: 18px;
    margin-inline: 10px;
  }
}
</style>
