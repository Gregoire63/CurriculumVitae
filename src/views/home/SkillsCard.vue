<template>
  <section class="skills-container">
    <h3 class="title">
      {{ frSelect ? 'Compétences techniques' : 'Technical skills' }}
    </h3>
    <div class="skills-category">
      <article class="skill-group">
        <h4 class="skill-title">Backend</h4>
        <ul class="skill-list">
          <li>Node.js (ExpressJS)</li>
          <li>REST API (PostgreSQL, MongoDB)</li>
        </ul>
      </article>
      <article class="skill-group">
        <h4 class="skill-title">Frontend</h4>
        <ul class="skill-list">
          <li>VueJS - Vite</li>
          <li>HTML, CSS, JavaScript, TypeScript</li>
          <li>OpenLayers</li>
        </ul>
      </article>
      <article class="skill-group">
        <h4 class="skill-title">
          {{ frSelect ? 'Teste' : 'Testing' }}
        </h4>
        <ul class="skill-list">
          <li>
            Jest ({{ frSelect ? "tests unitaires, d'intégration" : 'unit testing, integration' }})
          </li>
          <li>Cypress (end-to-end)</li>
        </ul>
      </article>
      <article class="skill-group">
        <h4 class="skill-title">
          {{ frSelect ? 'Développement opérationnel & outils' : 'DevOps & Tools' }}
        </h4>
        <ul class="skill-list">
          <li>Git</li>
          <li>
            CI/CD ({{
              frSelect ? 'Intégration, déploiement continu' : 'Continuous integration, deployment'
            }})
          </li>
          <li>{{ frSelect ? 'Conteneurisation' : 'Containerization' }} (Docker)</li>
          <li>Nginx ({{ frSelect ? 'serveur proxy' : 'proxy server' }})</li>
        </ul>
      </article>
      <article class="skill-group">
        <h4 class="skill-title">
          {{ frSelect ? 'Compétences supplémentaires' : 'Additional Skills' }}
        </h4>
        <ul class="skill-list">
          <li>{{ frSelect ? 'Méthode Agile' : 'Agile method' }}</li>
          <li>{{ frSelect ? 'Automatisation ' : 'Automation' }} (Python, shell, cron)</li>
          <li>SEO {{ frSelect ? '(Référencement)' : '' }}</li>
          <li>Linux</li>
        </ul>
      </article>
      <article class="skill-group">
        <h4 class="skill-title">
          {{ frSelect ? 'Compétences interpersonnelles' : 'Soft Skills' }}
        </h4>
        <ul class="skill-list">
          <li>{{ frSelect ? 'Travail en équipe' : 'Teamwork' }}</li>
          <li>{{ frSelect ? 'Communication efficace' : 'Effective Communication' }}</li>
          <li>{{ frSelect ? 'Résolution de problèmes' : 'Problem-Solving' }}</li>
          <li>{{ frSelect ? 'Gestion du temps' : 'Time Management' }}</li>
          <li>{{ frSelect ? 'Adaptabilité' : 'Adaptability' }}</li>
        </ul>
      </article>
    </div>
  </section>
</template>
<script setup>
import { SiteStore } from '../../stores/Site.js'
import { computed, ref } from 'vue'

const frSelect = computed(() => {
  return SiteStore().getLangage == 'fr'
})
</script>
<style scoped>
.skills-container {
  height: 100vh;
  position: absolute;
  top: 0;
  left: 0;
  padding: 20px;
  box-sizing: border-box;
  width: 100vw;
  justify-content: center;
  align-items: center;
  color: var(--primary);
  display: flex;
  flex-direction: column;
}
.skills-container.title {
  font-size: 30px;
  font-weight: 600;
}
.title {
  font-size: 24px;
  margin-bottom: 20px;
  text-align: center;
}
.skills-category {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.skill-group {
  opacity: 0;
  transition: all 0.5s ease;
  flex: 1;
  text-align: center;
  padding: 20px;
}

.skill-title {
  font-size: 20px;
  margin-bottom: 10px;
  transition: transform 0.4s ease;
}
.skill-title:hover {
  transform: scale(1.2);
}
.skill-list {
  list-style-type: none;
  padding-left: 0;
}

.skill-list li {
  margin-bottom: 5px;
}
@media (max-width: 768px) {
  .skill-title {
    font-size: 16px;
  }
  .skill-list li {
    font-size: 14Zpx;
  }
}
@media (max-width: 465px) {
  .skill-group {
    padding: 0px;
  }
}
</style>
