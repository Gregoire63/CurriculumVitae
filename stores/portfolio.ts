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
    imgs?: Array<{ src: string; title?: string; type?: string }>
    pdf?: string
    action?: string
    visible?: boolean
}

export type Section = 'hero' | 'about' | 'cv' | 'skills' | 'portfolio' | 'contact' | 'privacy'

interface PortfolioState {
    currentSection: Section
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
    },

    actions: {
        setSection(section: Section) {
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

        navigateToSection(section: Section) {
            this.setMenuOpen(false)
            const el = document.getElementById(section)
            el?.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
            })
        },
        setPrivacyPolicyOpen(isOpen: boolean) {
            this.isPrivacyPolicyOpen = isOpen
            if (import.meta.client) {
                document.body.style.overflow = isOpen ? 'hidden' : ''
            }
        },
    },
})
