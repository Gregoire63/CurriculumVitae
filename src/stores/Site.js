import { defineStore } from 'pinia'

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

export const SiteStore = defineStore('SiteStore', {
  state: () => ({
    finishLoading: false,
    nextPage: null,
    scrollYPosition: 0,
    menuOpen: false,
    darkTheme: false,
    activeProject: null,
    backgroundStep: 0,
    langage: localStorage.getItem('langage') || 'fr'
  }),
  actions: {
    setActiveProject(data) {
      this.activeProject = data
    },
    loadingEnded() {
      this.finishLoading = true
    },
    setBackgroundStep(v) {
      this.backgroundStep = v
    },
    setNextPage(nextPage) {
      this.nextPage = nextPage
      switch (nextPage) {
        case 'contact':
          this.darkTheme = true
          break
        case 'home':
          this.darkTheme = false
          break
      }
    },
    setDarkMode(data) {
      this.darkTheme = data
      document.documentElement.style.setProperty('--background-color', data ? '#1A1A1D' : '#FFF9F9')
      document.documentElement.style.setProperty('--text', data ? '#FFF9F9' : '#1A1A1D')
    },
    setScrollY(data) {
      // if (data && data > 100) this.darkTheme = true
      // else this.darkTheme = false
      this.scrollYPosition = data
    },
    setLangage(data) {
      this.langage = data
      document.documentElement.setAttribute('lang', data)
      localStorage.setItem('langage', data)
    },
    setMenuOpen(open) {
      this.menuOpen = open
    },
    flyTo(name) {
      this.menuOpen = false
      switch (name) {
        case 'presentation':
          window.scrollTo({
            top: 10,
            behavior: 'smooth'
          })
          break
        case 'degrees':
          window.scrollTo({
            top: (60 * window.innerHeight) / 100,
            behavior: 'smooth'
          })
          break
        case 'skills':
          window.scrollTo({
            top: (160 * window.innerHeight) / 100,
            behavior: 'smooth'
          })
          break
        case 'portefolio':
          window.scrollTo({
            top: (270 * window.innerHeight) / 100,
            behavior: 'smooth'
          })
          break
      }
    },
    preventScrollEvent() {
      window.addEventListener('DOMMouseScroll', preventDefault, false)
      window.addEventListener('wheel', preventDefault, { passive: false })
      window.addEventListener('touchmove', preventDefault, { passive: false })
      window.addEventListener('keydown', preventDefaultForScrollKeys, false)
    },
    stopPreventScrollEvent() {
      window.removeEventListener('DOMMouseScroll', preventDefault, false)
      window.removeEventListener('wheel', preventDefault, { passive: false })
      window.removeEventListener('touchmove', preventDefault, { passive: false })
      window.removeEventListener('keydown', preventDefaultForScrollKeys, false)
    }
  },
  getters: {
    getActiveProject() {
      return this.activeProject
    },
    menuIsOpen() {
      return this.menuOpen
    },
    getBackgroundStep() {
      return this.backgroundStep
    },
    getNextPage() {
      return this.nextPage
    },
    getLangage() {
      return this.langage
    },
    getScrollYPosition() {
      return this.scrollYPosition
    },
    getDarkTheme() {
      return this.darkTheme
    },
    getFinishLoading() {
      return this.finishLoading
    }
  }
})
