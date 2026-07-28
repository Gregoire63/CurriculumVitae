import { defineStore } from 'pinia'

export interface Project {
    name: string
    description: string
    year: string
    type: string
    url?: string
    techno: Array<{ name: string; url: string }>
    path: string
    color?: string
    imgs?: Array<{ src: string; title?: string; type?: string; poster?: string }>
    pdf?: string
    action?: string
    visible?: boolean
    mobile?: boolean
    logo?: string
}

export type SectionName =
    | 'hero'
    | 'cases'
    | 'projects'
    | 'cv'
    | 'about'
    | 'skills'
    | 'contact'
export type Section = {
    id: SectionName
    number?: string
    label: string
}

interface PortfolioState {
    currentSection: SectionName
    isMenuOpen: boolean
    language: 'fr' | 'en'
    scrollProgress: number
    activeProject: Project | null
    isScrollLocked: boolean
    isPrivacyPolicyOpen: boolean
}

export const usePortfolioStore = defineStore('portfolio', {
    state: (): PortfolioState => ({
        currentSection: 'hero',
        isMenuOpen: false,
        language: 'fr',
        scrollProgress: 0,
        activeProject: null,
        isScrollLocked: false,
        isPrivacyPolicyOpen: false,
    }),

    getters: {
        isFrench: (state) => state.language === 'fr',
        sections(state):Section[]{
            const fr = state.language === 'fr'
            return [
                { id: 'hero', number: '01', label: fr ? 'Accueil' : 'Home' },
                { id: 'cases', number: '02', label: fr ? 'Réalisations' : 'Selected work' },
                { id: 'projects', number: '03', label: fr ? 'Projets' : 'Projects' },
                { id: 'cv', number: '04', label: fr ? 'Parcours' : 'Career' },
                { id: 'about', number: '05', label: fr ? 'Formation' : 'Education' },
                { id: 'skills', number: '06', label: fr ? 'Compétences' : 'Skills' },
                { id: 'contact', number: '07', label: 'Contact' },
            ]
        },
        // Barre de navigation desktop (le menu plein écran liste tout).
        // « Projets » pointe vers les études de cas et chapeaute toute la zone projets.
        navSections(): Section[] {
            const fr = this.isFrench
            return [
                { id: 'hero', number: '01', label: fr ? 'Accueil' : 'Home' },
                { id: 'cases', number: '02', label: fr ? 'Projets' : 'Projects' },
                { id: 'cv', number: '04', label: fr ? 'Parcours' : 'Career' },
                { id: 'contact', number: '07', label: 'Contact' },
            ]
        },
        // Un item de nav peut rester actif sur plusieurs sections de la page :
        // « Projets » couvre les études de cas + les autres projets, « Parcours » couvre l'expérience + la formation.
        navActiveGroups(): Partial<Record<SectionName, SectionName>> {
            return {
                projects: 'cases',
                about: 'cv',
                skills: 'cv',
            }
        },
    },

    actions: {

        setSection(section: SectionName) {
            this.currentSection = section
        },

        toggleMenu() {
            this.isMenuOpen = !this.isMenuOpen
            if (this.isMenuOpen) {
                this.lockScroll()
            } else {
                this.unlockScroll()
            }
        },

        setMenuOpen(open: boolean) {
            this.isMenuOpen = open
            if (open) {
                this.lockScroll()
            } else {
                this.unlockScroll()
            }
        },

        setLanguage(lang: 'fr' | 'en') {
            this.language = lang
            if (import.meta.client) {
                localStorage.setItem('portfolio-lang', lang)
                document.documentElement.setAttribute('lang', lang)
            }
        },

        toggleLanguage() {
            this.setLanguage(this.language === 'fr' ? 'en' : 'fr')
        },

        setScrollProgress(progress: number) {
            this.scrollProgress = Math.max(0, Math.min(100, progress))
        },

        setActiveProject(project: Project | null) {
            this.activeProject = project
            if (project && !project.pdf) {
                // Désactiver temporairement le smooth scroll
                if (import.meta.client) {
                    document.documentElement.style.scrollBehavior = 'auto'
                }
                this.lockScroll()
            } else {
                this.unlockScroll()
                // Réactiver le smooth scroll après la fermeture
                if (import.meta.client) {
                    setTimeout(() => {
                        document.documentElement.style.scrollBehavior = 'smooth'
                    }, 100)
                }
            }
        },
        lockScroll() {
            if (import.meta.client && !this.isScrollLocked) {
                // Sauvegarder la position AVANT de bloquer
                const scrollY = window.scrollY

                this.isScrollLocked = true
                const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth

                // Appliquer les styles sans changer la position visuelle
                document.body.style.position = 'fixed'
                document.body.style.top = `-${scrollY}px`
                document.body.style.left = '0'
                document.body.style.right = '0'
                document.body.style.paddingRight = `${scrollbarWidth}px`
                document.body.classList.add('no-scroll')
            }
        },

        unlockScroll() {
            if (import.meta.client && this.isScrollLocked) {
                // Récupérer la position sauvegardée
                const scrollY = document.body.style.top

                this.isScrollLocked = false

                // Retirer tous les styles en une fois
                document.body.style.position = ''
                document.body.style.top = ''
                document.body.style.left = ''
                document.body.style.right = ''
                document.body.style.paddingRight = ''
                document.body.classList.remove('no-scroll')

                // Restaurer la position IMMÉDIATEMENT sans animation
                if (scrollY) {
                    const scrollPosition = Number.parseInt(scrollY || '0') * -1
                    // Utiliser scrollTo sans smooth pour éviter l'animation
                    window.scrollTo({
                        top: scrollPosition,
                        behavior: 'instant' as ScrollBehavior,
                    })
                }
            }
        },

        navigateToSection(section: SectionName){
            // 1. Fermer le menu
            this.setMenuOpen(false)
            
            setTimeout(() => {
                document.getElementById(section)?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                })
            }, 300)
        },
        setPrivacyPolicyOpen(isOpen: boolean) {
            this.isPrivacyPolicyOpen = isOpen
            if (import.meta.client) {
                document.body.style.overflow = isOpen ? 'hidden' : ''
            }
        },
    },
})
