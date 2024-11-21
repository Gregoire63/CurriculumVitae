<template>
  <h3 class="portefolio-title">PorteFolio</h3>
  <div class="portefolio-container">
    <div
      id="portefolio-left-section"
      class="portefolio-left-section"
      style="transform: translateY(-30vh)"
    >
      <article
        v-for="(project, index) in leftProjects"
        :key="index"
        class="project"
        :id="project.name"
      >
        <h4>{{ project.name }}</h4>
        <img
          :src="`${project.path}/logo.webp`"
          :alt="`${project.name}_logo`"
          class="project_logo"
        />
        <section>
          <p style="margin-bottom: 5px; font-weight: 600">
            {{ project.type }} <br />
            {{ project.year }}
          </p>
          <div class="chips">
            <div v-for="tech of project.techno" :key="tech" class="chip" @click="href(tech.url)">
              {{ tech.name }}
            </div>
          </div>
          <button
            @click="project.action == 'redirect' ? href(project.url) : openProject(project)"
            class="contact_button"
          >
            {{ frSelect ? 'Voir plus' : 'See more' }}
          </button>
        </section>
      </article>
    </div>
    <div
      v-show="windowWidth >= 800"
      id="portefolio-right-section"
      class="portefolio-right-section"
      style="transform: translateY(30vh)"
    >
      <article
        v-for="(project, index) in rightProjects"
        :key="index"
        class="project"
        :id="project.name"
      >
        <h4>{{ project.name }}</h4>
        <img
          :src="`${project.path}/logo.webp`"
          :alt="`${project.name}_logo`"
          class="project_logo"
        />
        <section>
          <p style="margin-bottom: 5px; font-weight: 600">
            {{ project.type }} <br />
            {{ project.year }}
          </p>
          <div class="chips">
            <div v-for="tech of project.techno" :key="tech" class="chip" @click="href(tech.url)">
              {{ tech.name }}
            </div>
          </div>
          <button
            @click="project.action == 'redirect' ? href(project.url) : openProject(project)"
            class="contact_button"
          >
            {{ frSelect ? 'Voir plus' : 'See more' }}
          </button>
        </section>
      </article>
    </div>
    <section
      v-if="activeProject && activeProject.pdf"
      class="overlay"
      :style="overlayStyle"
      style="width: 90vw; max-width: 1000px; margin: auto; left: 50vw; transform: translateX(-50%)"
    >
      <svg
        @click="closeProject()"
        class="svg-icon"
        style="top: 25px; right: 5px; color: var(--primary)"
        :class="{ visible: activeProject.visible }"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M810.65984 170.65984q18.3296 0 30.49472 12.16512t12.16512 30.49472q0 18.00192-12.32896 30.33088l-268.67712 268.32896 268.67712 268.32896q12.32896 12.32896 12.32896 30.33088 0 18.3296-12.16512 30.49472t-30.49472 12.16512q-18.00192 0-30.33088-12.32896l-268.32896-268.67712-268.32896 268.67712q-12.32896 12.32896-30.33088 12.32896-18.3296 0-30.49472-12.16512t-12.16512-30.49472q0-18.00192 12.32896-30.33088l268.67712-268.32896-268.67712-268.32896q-12.32896-12.32896-12.32896-30.33088 0-18.3296 12.16512-30.49472t30.49472-12.16512q18.00192 0 30.33088 12.32896l268.32896 268.67712 268.32896-268.67712q12.32896-12.32896 30.33088-12.32896z"
        />
      </svg>
      <PDF :src="activeProject.pdf" class="pdf"></PDF>
    </section>
    <section v-if="activeProject && !activeProject.pdf" class="overlay" :style="overlayStyle">
      <svg
        @click="closeProject()"
        class="svg-icon"
        :class="{ visible: activeProject.visible }"
        viewBox="0 0 1024 1024"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M810.65984 170.65984q18.3296 0 30.49472 12.16512t12.16512 30.49472q0 18.00192-12.32896 30.33088l-268.67712 268.32896 268.67712 268.32896q12.32896 12.32896 12.32896 30.33088 0 18.3296-12.16512 30.49472t-30.49472 12.16512q-18.00192 0-30.33088-12.32896l-268.32896-268.67712-268.32896 268.67712q-12.32896 12.32896-30.33088 12.32896-18.3296 0-30.49472-12.16512t-12.16512-30.49472q0-18.00192 12.32896-30.33088l268.67712-268.32896-268.67712-268.32896q-12.32896-12.32896-12.32896-30.33088 0-18.3296 12.16512-30.49472t30.49472-12.16512q18.00192 0 30.33088 12.32896l268.32896 268.67712 268.32896-268.67712q12.32896-12.32896 30.33088-12.32896z"
        />
      </svg>
      <p class="title" :class="{ visible: activeProject.visible }">{{ activeProject.name }}</p>
      <p class="information" :class="{ visible: activeProject.visible }">
        {{ activeProject.type }} - {{ activeProject.year }}
      </p>
      <svg
        v-if="activeProject.url"
        @click="href(activeProject.url)"
        :class="{ visible: activeProject.visible }"
        class="goto-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        id="share"
      >
        <g>
          <path
            fill="var(--background-color)"
            d="M22,12a1,1,0,0,0-1,1v6a2,2,0,0,1-2,2H5a2,2,0,0,1-2-2V5A2,2,0,0,1,5,3h6a1,1,0,0,0,0-2H5A4,4,0,0,0,1,5V19a4,4,0,0,0,4,4H19a4,4,0,0,0,4-4V13A1,1,0,0,0,22,12Z"
          ></path>
          <path
            fill="var(--background-color)"
            d="M22.922,1.614a.989.989,0,0,0-.186-.278c-.012-.013-.016-.03-.029-.043s-.03-.017-.043-.029A.939.939,0,0,0,22,1H16a1,1,0,0,0,0,2h3.586l-7.293,7.293a1,1,0,1,0,1.414,1.414L21,4.414V8a1,1,0,0,0,2,0V2A.99.99,0,0,0,22.922,1.614Z"
          ></path>
        </g>
      </svg>
      <Carousel v-if="activeProject.imgs" :items="activeProject.imgs" />
      <p
        class="description"
        :class="{ visible: activeProject.visible }"
        v-html="activeProject.description"
      />
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { SiteStore } from '../../stores/Site.js'
import Carousel from '../../components/carousel/carousel.vue'
import PDF from 'pdf-vue3'

const frSelect = computed(() => {
  return SiteStore().getLangage == 'fr'
})
const projects = [
  {
    name: 'NextMusic',
    description: frSelect.value
      ? "Développement d'une application de musique avec Next.js, Tailwind CSS et Material UI, inspirée d'une maquette Dribbble. L'application permet aux utilisateurs de parcourir et de gérer leur bibliothèque musicale dans une interface moderne et réactive. <br/><small>Identifiants de démo : ID : WeeSii, MOT DE PASSE : 1234.</small>"
      : 'Development of a music application using Next.js, Tailwind CSS, and Material UI, inspired by a Dribbble mockup. The application allows users to browse and manage their music library in a modern and responsive interface. <br/><small>Demo credentials: ID: WeeSii, PASSWORD: 1234.</small>',
    year: '2022',
    type: frSelect.value ? 'Projet scolaire' : 'School project',
    url: 'https://next-music.netlify.app/bibliotheque',
    techno: [
      { name: 'NextJS', url: 'https://nextjs.org/' },
      { name: 'Tailwind', url: 'https://tailwindcss.com/' }
    ],
    path: '/projects/nextmusic',
    color: '18, 18, 18',
    imgs: [
      {
        src: '/projects/nextmusic/next-music-homescreen.webp',
        title: frSelect ? 'Acceuil' : 'Home page'
      },
      {
        src: '/projects/nextmusic/next-music-biblioscreen.webp',
        title: frSelect ? 'Bibliothèque' : 'Library'
      },
      {
        src: '/projects/nextmusic/next-music-search.webp',
        title: frSelect ? 'Recherche' : 'Search'
      },
      {
        src: '/projects/nextmusic/next-music-favoritescreen.webp',
        title: frSelect ? 'Favoris' : 'Favorite'
      }
    ]
  },
  {
    name: 'Alternance',
    description: frSelect.value
      ? "Rapport de projet d'alternance, incluant des études de cas et des contributions à des projets réels en entreprise."
      : 'Work-study project report, including case studies and contributions to real company projects.',
    year: '2023',
    type: frSelect.value ? 'Projet scolaire' : 'School project',
    pdf: '/projects/alternance/Mémoire.pdf',
    techno: [
      { name: 'Python', url: 'https://www.python.org/' },
      { name: 'PostgreSQL', url: 'https://www.postgresql.org/' }
    ],
    path: '/projects/alternance',
    color: '69, 73, 103'
  },
  {
    name: 'CityZen',
    description: frSelect.value
      ? 'Site web inspiré de designs primés sur Awwwards, permettant aux utilisateurs de se connecter et de modifier le contenu. Développé avec Vue.js pour une interface intuitive et réactive, et utilisant Firebase pour la gestion des données.'
      : 'Website inspired by award-winning designs on Awwwards, allowing users to log in and edit content. Developed with Vue.js for an intuitive and responsive interface, and using Firebase for data management.',
    year: '2023',
    type: frSelect.value ? 'Auto-Entrepreneur' : 'self-employed',
    techno: [
      { name: 'VueJS', url: 'https://vuejs.org/' },
      { name: 'FireBase', url: 'https://firebase.google.com/' }
    ],
    url: 'https://cityzen-coiffure.fr/',
    path: '/projects/cityzen',
    color: '148, 139, 115',
    imgs: [
      {
        src: '/projects/cityzen/cityzen_2.mp4',
        type: 'video',
        title: frSelect ? 'Acceuil' : 'Home page'
      },
      {
        src: '/projects/cityzen/cityzen_1.mp4',
        type: 'video',
        title: frSelect ? 'Gallerie' : 'Gallery'
      },
      { src: '/projects/cityzen/avis.webp', title: frSelect ? 'Avis' : 'Avis' },
      { src: '/projects/cityzen/contact.webp', title: frSelect ? 'Contact' : 'Contact' },
      { src: '/projects/cityzen/menu.webp', title: frSelect ? 'Menu' : 'Menu' },

      {
        src: '/projects/cityzen/admin-login.webp',
        title: frSelect ? "Connexion à l'administration" : 'Admin login'
      },
      { src: '/projects/cityzen/admin_1.webp', title: frSelect ? 'Administration' : 'Admin' }
    ]
  },
  {
    name: 'CutWait',
    description: frSelect.value
      ? "Application mobile transformant les files d’attente en service rentable, permettant aux utilisateurs de payer pour qu'une autre personne garde leur place. Développée en Flutter, avec Docker et MongoDB pour la gestion de l'infrastructure backend."
      : 'Mobile application transforming waiting lines into a profitable service, allowing users to pay someone else to hold their place. Developed in Flutter, with Docker and MongoDB for backend infrastructure management.',
    year: '2021',
    type: frSelect.value ? 'Projet scolaire' : 'School project',
    techno: [
      { name: 'Flutter', url: 'https://flutter.dev/' },
      { name: 'Docker', url: 'https://www.docker.com/' },
      { name: 'MongoDB', url: 'https://www.mongodb.com/fr-fr' }
    ],
    path: '/projects/cutwait',
    color: '7, 26, 24',
    imgs: [
      {
        src: '/projects/cutwait/dashboard.webp',
        title: frSelect ? 'Tableau de bord' : 'Dashboard'
      },
      { src: '/projects/cutwait/map.webp', title: frSelect ? 'Carte' : 'Map' },
      { src: '/projects/cutwait/profile.webp', title: frSelect ? 'Profil' : 'Profile' }
    ]
  },
  {
    name: 'HapartEnVille',
    year: '2023',
    type: frSelect.value ? 'Auto-Entrepreneur' : 'self-employed',
    url: 'https://hapartenville.fr/',
    techno: [
      { name: 'VueJS', url: 'https://vuejs.org/' },
      { name: 'TypeScript', url: 'https://www.typescriptlang.org/' }
    ],
    path: '/projects/happartenville',
    action: 'redirect'
  },
  {
    name: 'Model Viewer',
    description: frSelect.value
      ? "Documentation sur la recherche et l'implémentation de composants 3D interactifs dans une application, en utilisant Vue.js et le composant ModelViewer."
      : 'Documentation on the research and implementation of interactive 3D components in an application, using Vue.js and the ModelViewer component.',
    year: '2023',
    type: 'Documentation',
    url: 'https://vue-and-modelviewer.netlify.app/',
    techno: [
      { name: 'VueJS', url: 'https://vuejs.org/' },
      { name: 'ThreeJS', url: 'https://threejs.org/' },
      { name: 'ModelViewer', url: 'https://modelviewer.dev/' }
    ],
    path: '/projects/modelviewer',
    imgs: [
      { src: '/projects/modelviewer/vue_modelviewer.mp4', type: 'video' },
      { src: '/projects/modelviewer/vue_modelviewer.webp' },
      { src: '/projects/modelviewer/init.webp' }
    ]
  }
]

const windowWidth = ref(window.innerWidth)
onMounted(() => {
  window.addEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
})
onUnmounted(() => {
  window.removeEventListener('resize', () => {
    windowWidth.value = window.innerWidth
  })
})
const leftProjects = computed(() =>
  windowWidth.value < 800 ? projects : projects.filter((_, index) => index % 2 === 0)
)
const rightProjects = computed(() =>
  windowWidth.value < 800 ? [] : projects.filter((_, index) => index % 2 !== 0)
)

const href = (url) => {
  if (url) window.open(url, '_blank')
}

const activeProject = computed({
  get() {
    return SiteStore().getActiveProject
  },
  set(v) {
    SiteStore().setActiveProject(v)
  }
})
const overlayStyle = ref({})

const openProject = (project) => {
  if (!project.pdf) SiteStore().preventScrollEvent()
  activeProject.value = project
  const projectElement = document.getElementById(project.name)
  const rect = projectElement.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  overlayStyle.value = {
    '--x': `${centerX}px`,
    '--y': `${centerY}px`,
    width: '0',
    height: '0',
    left: `${centerX}px`,
    top: `${centerY}px`,
    backgroundColor: `rgba(${project.color || '0, 0, 0'},${project.pdf ? '0' : '1'})`
  }

  setTimeout(() => {
    overlayStyle.value = {
      width: '90vw',
      height: '90vh',
      left: '5vw',
      top: '5vh',
      borderRadius: '15px',
      backgroundColor: `rgba(${project.color || '0, 0, 0'},${project.pdf ? '0' : '1'})`
    }
  }, 0)
  setTimeout(() => {
    activeProject.value.visible = true
  }, 500)
}

const closeProject = () => {
  SiteStore().stopPreventScrollEvent()
  activeProject.value.visible = false
  const projectElement = document.getElementById(activeProject.value.name)
  const rect = projectElement.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  // overlayStyle.value = {
  //   width: '100vw',
  //   height: '100vh',
  //   left: '0',
  //   top: '0',
  // };

  setTimeout(() => {
    overlayStyle.value = {
      '--x': `${centerX}px`,
      '--y': `${centerY}px`,
      width: '0',
      height: '0',
      borderRadius: '15px',
      left: `${centerX}px`,
      top: `${centerY}px`,
      backgroundColor: `rgba(${activeProject.value.color || '0, 0, 0'},${activeProject.value.pdf ? '0' : '1'})`
    }

    setTimeout(() => {
      activeProject.value = null
    }, 300) // Duration of the transition
  }, 0)
}
</script>

<style scoped>
.portefolio-container {
  height: 100vh;
  width: 70vw;
  position: absolute;
  top: 0;
  right: 15vw;
  padding: 20px;
  box-sizing: border-box;
  justify-content: center;
  align-items: center;
  color: var(--primary);
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

.portefolio-right-section,
.portefolio-left-section {
  height: 100%;
  width: 45%;
  display: flex;
  flex-direction: column;
  transition: opacity 0.5s ease;
  transition-delay: 0.5s;
  opacity: 0;
  justify-content: center;
  overflow: visible;
}

.portefolio-right-section {
  margin-left: 5%;
}

.portefolio-left-section {
  margin-right: 5%;
}

.portefolio-title {
  position: absolute;
  right: 50vw;
  transform: translateX(50%) translateY(-50%);
  top: 50vh;
  font-size: 30px;
  font-weight: 600;
  color: var(--primary);
}

.project {
  border: 1px solid #ccc;
  border-radius: 5px;
  padding: 20px;
  width: 180px;
  height: 180px;
  margin: 20px;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
  border: 2px solid rgba(255, 255, 255, 0.19);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(4.3px);
  -webkit-backdrop-filter: blur(4.3px);
  background: none;
  border-radius: 10px;
  margin: 10px auto;
  transition: all 0.4s ease;
  overflow: hidden;
}
.project:hover {
  width: 210px;
  height: 210px;
}
.project_logo {
  width: 60%;
  aspect-ratio: 1;
  position: absolute;
  top: 65%;
  left: 50%;
  transform: translateX(-50%) translateY(-50%);
  transition: all 0.5s ease;
}
.project:hover .project_logo {
  transform: unset;
  width: 60px;
  height: 60px;
  top: 5px;
  left: 5px;
  z-index: 1;
}
.project h4 {
  transition: all 0.5s ease;
  font-size: 23px;
  font-weight: 600;
  z-index: 3;
}
.project:hover h4 {
  margin-top: 2px;
  margin-left: 30px;
}
.project section {
  transform: translateY(120%);
  transition: all 0.5s ease;
}
.project:hover section {
  transform: translateY(0%);
}
.chips {
  display: flex;
  margin-block: 15px;
}
.chip {
  color: var(--primary);
  font-size: 14px;
  background-color: var(--secondary);
  border-radius: 15px;
  margin: 5px 2px;
  padding: 5px 10px;
  width: fit-content;
  transition:
    color 0.5s ease,
    background-color 0.5s ease;
  cursor: pointer;
}
.chip:hover {
  color: var(--secondary_1);
  background-color: #8a8082;
}

.overlay {
  position: fixed;
  display: flex;
  flex-direction: column;
  justify-content: center;
  width: var(--width, 0);
  height: var(--height, 0);
  left: var(--x, 0);
  top: var(--y, 0);
  background-color: rgba(0, 0, 0, 0.8);
  border-radius: 5px;
  transition:
    width 0.5s ease,
    height 0.5s ease,
    left 0.5s ease,
    top 0.5s ease;
  color: var(--background-color);
  z-index: 9999;
}
.overlay .title {
  opacity: 0;
  font-weight: 600;
  font-size: 28px;
  margin: 5px;
  text-align: center;
  transition: opacity 0.3s ease;
}
.overlay .information {
  opacity: 0;
  margin: 0;
  font-size: 12px;
  text-align: center;
  transition: opacity 0.3s ease;
}
.overlay .description {
  opacity: 0;
  margin-inline: 50px;
  text-align: justify;
  transition: opacity 0.3s ease;
}
.svg-icon {
  opacity: 0;
  color: var(--background-color);
  position: absolute;
  top: 35px;
  right: -5px;
  z-index: 2;
  width: 40px;
  height: 40px;
  vertical-align: middle;
  fill: currentColor;
  overflow: hidden;
  transition: all 0.3s ease;
  transform: translateX(-50%) translateY(-50%);
}
.svg-icon:hover {
  transform: translateX(-50%) translateY(-50%) rotate(90deg);
  cursor: pointer;
}
.goto-svg {
  opacity: 0;
  color: var(--background-color);
  position: absolute;
  top: 35px;
  right: 50px;
  width: 32px;
  height: 32px;
  vertical-align: middle;
  fill: currentColor;
  overflow: hidden;
  transition: all 0.3s ease;
  transform: translateX(-50%) translateY(-50%);
}
.goto-svg:hover {
  cursor: pointer;
  transform: translateX(-50%) translateY(-50%) scale(1.2);
}
.visible {
  opacity: 1 !important;
}
.pdf {
  margin: auto;
  min-width: 100%;
}
@media (max-width: 800px) {
  .portefolio-left-section {
    height: unset;
    width: unset;
  }
  .portefolio-left-section h4 {
    font-size: 19px;
  }
  .portefolio-left-section img {
    width: 50%;
  }
  .project {
    height: 130px;
  }
  .portefolio-left-section h4 {
    font-size: 22px;
    padding-bottom: 10px;
    margin-top: 2px;
  }
  .overlay .description {
    font-size: 14px;
  }
}
@media (max-width: 600px) {
  .project {
    height: 100px;
  }
  .portefolio-left-section h4 {
    font-size: 20px;
    padding-bottom: 10px;
    margin-top: 2px;
  }
  .portefolio-left-section img {
    width: 40%;
  }
}
</style>
