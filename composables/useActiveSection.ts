import { onMounted, onUnmounted } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

/**
 * Composable pour détecter automatiquement quelle section est visible
 * et mettre à jour le store en conséquence
 */
export const useActiveSection = () => {
    const store = usePortfolioStore()
    let observer: IntersectionObserver | null = null

    onMounted(() => {
        // Sections à observer (dans l'ordre d'apparition)
        const sectionIds = ['hero', 'cases', 'projects', 'cv', 'about', 'skills', 'contact']
        const sections = sectionIds
            .map(id => document.getElementById(id))
            .filter((el): el is HTMLElement => el !== null)

        if (sections.length === 0) return

        // Options de l'Intersection Observer
        const options: IntersectionObserverInit = {
            root: null, // viewport
            rootMargin: '-20% 0px -60% 0px', // Détecte quand la section est à ~20% du haut
            threshold: 0, // Déclenche dès que la section est visible
        }

        // Créer l'observer
        observer = new IntersectionObserver((entries) => {
            // Filtrer les sections qui sont visibles
            const visibleSections = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => {
                    // Trier par position verticale (la plus haute en premier)
                    return a.boundingClientRect.top - b.boundingClientRect.top
                })
            // La première section visible devient la section active
            if (visibleSections.length > 0) {
                const activeSection = visibleSections?.[0]?.target.id as any
                
                // Ne mettre à jour que si c'est différent (évite les re-renders inutiles)
                if (store.currentSection !== activeSection) {
                    store.setSection(activeSection)
                }
            }
        }, options)

        // Observer toutes les sections
        sections.forEach(section => observer!.observe(section))
    })

    onUnmounted(() => {
        // Nettoyer l'observer
        if (observer) {
            observer.disconnect()
            observer = null
        }
    })
}