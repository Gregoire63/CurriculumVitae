<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const { isMobile } = useDevice()
const cursorDot = ref<HTMLElement | null>(null)
const cursorOutline = ref<HTMLElement | null>(null)

const mouseX = ref(0)
const mouseY = ref(0)
const outlineX = ref(0)
const outlineY = ref(0)

// Vélocité pour l'effet d'inertie
const velocityX = ref(0)
const velocityY = ref(0)
const prevMouseX = ref(0)
const prevMouseY = ref(0)

const isHovering = ref(false)
const isClicking = ref(false)
const isText = ref(false)

let animationFrameId: number

// Suivre la position de la souris
const handleMouseMove = (e: MouseEvent) => {
    mouseX.value = e.clientX
    mouseY.value = e.clientY
}

// Détecter le hover sur les éléments interactifs
const handleMouseOver = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    const isInteractive = target.closest('a, button, input, textarea, select, [role="button"]')
    const isTextElement = target.closest(
        'p, span, h1, h2, h3, h4, h5, h6, li, strong, em, b, i, small, label, .skills-wrapper'
    )
    isHovering.value = !!isInteractive
    const computedCursor = window.getComputedStyle(target).cursor
    isText.value =
        !isInteractive &&
        (!!isTextElement || computedCursor === 'text')
}

// Détecter le clic
const handleMouseDown = () => {
    isClicking.value = true
}

const handleMouseUp = () => {
    isClicking.value = false
}

onMounted(() => {
    if(isMobile) return
    // Initialiser au centre de l'écran
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    
    mouseX.value = centerX
    mouseY.value = centerY
    outlineX.value = centerX
    outlineY.value = centerY
    prevMouseX.value = centerX
    prevMouseY.value = centerY

    // Animation avec effet d'inertie et flottement
    const animate = () => {
        // Calculer la vélocité (direction et vitesse du mouvement)
        velocityX.value = (mouseX.value - prevMouseX.value) * 0.2
        velocityY.value = (mouseY.value - prevMouseY.value) * 0.2
        
        prevMouseX.value = mouseX.value - 8
        prevMouseY.value = mouseY.value - 8

        // Lerp pour un mouvement smooth de base
        const lerpSpeed = 0.15
        
        // Position de base du outline (suit la souris)
        let targetX = mouseX.value
        let targetY = mouseY.value
        
        // Ajouter un offset basé sur la vélocité pour l'effet "flottant"
        // Le cercle "flotte" dans la direction opposée au mouvement
        const inertiaMultiplier = 1.2
        targetX -= velocityX.value * inertiaMultiplier
        targetY -= velocityY.value * inertiaMultiplier
        
        // ✨ Effet de vibration subtile quand on hover un élément
        if (isHovering.value) {
            const time = Date.now() * 0.005 // Vitesse de vibration
            const vibrateX = Math.sin(time) * 5 // Amplitude horizontale (±2px)
            const vibrateY = Math.cos(time) * 5 // Amplitude verticale (légèrement décalée)
            
            targetX += vibrateX
            targetY += vibrateY
        }
        
        // Smooth lerp vers la position cible
        outlineX.value += (targetX - outlineX.value) * lerpSpeed
        outlineY.value += (targetY - outlineY.value) * lerpSpeed

        // Appliquer les transformations
        if (cursorDot.value) {
            cursorDot.value.style.transform = `translate(${mouseX.value}px, ${mouseY.value}px)`
        }

        if (cursorOutline.value) {
            cursorOutline.value.style.transform = `translate(${outlineX.value}px, ${outlineY.value}px)`
        }

        animationFrameId = requestAnimationFrame(animate)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseover', handleMouseOver)
    window.addEventListener('mousedown', handleMouseDown)
    window.addEventListener('mouseup', handleMouseUp)

    // Démarrer l'animation
    animate()
})

onUnmounted(() => {
    if(isMobile) return
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseover', handleMouseOver)
    window.removeEventListener('mousedown', handleMouseDown)
    window.removeEventListener('mouseup', handleMouseUp)
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
    }
})
</script>

<template>
    <!-- Curseur custom (seulement sur desktop) -->
    <ClientOnly>
        <div class="custom-cursor">
            <!-- Outline (suit avec effet d'inertie) - EN PREMIER pour être derrière -->
            <div
                ref="cursorOutline"
                class="cursor-outline"
                :class="{ hover: isHovering, clicking: isClicking,
  text: isText }"
            ></div>

            <!-- Dot central (suit exactement la souris) - EN SECOND pour être devant -->
            <div
                ref="cursorDot"
                class="cursor-dot"
                :class="{ hover: isHovering, clicking: isClicking,
  text: isText }"
            ></div>
        </div>
    </ClientOnly>
</template>

<style scoped>
.custom-cursor {
    /* Cacher sur mobile et tablette */
    display: none;
    pointer-events: none;
    z-index: 9999;
}

/* Afficher uniquement sur desktop */
@media (min-width: 1024px) and (hover: hover) and (pointer: fine) {
    .custom-cursor {
        display: block;
    }

    /* Cacher le curseur par défaut */
    :deep(body) {
        cursor: none;
    }

    /* Garder le curseur par défaut sur les éléments de formulaire */
    :deep(input),
    :deep(textarea),
    :deep(select) {
        cursor: text !important;
    }
}

/* Outline (cercle qui suit avec effet flottant) */
.cursor-outline {
    position: fixed;
    top: 0;
    left: 0;
    width: 36px;
    height: 36px;
    border: 2px solid var(--accent-primary);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    /* Pas de transition CSS car on anime avec JS */
    z-index: 9998;
    pointer-events: none;
    opacity: 0.6;
}

/* Dot central */
.cursor-dot {
    position: fixed;
    top: 0;
    left: 0;
    width: 16px;
    height: 16px;
    background: var(--accent-primary);
    border-radius: 50%;
    transform: translate(-50%, -50%);
    /* Pas de transition sur transform (géré par JS) */
    transition: 
        width 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
        height 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.2s ease;
    z-index: 9999;
    pointer-events: none;
}

/* État hover (sur éléments interactifs) */
.cursor-dot.hover {
    width: 24px;
    height: 24px;
    border: 2px solid var(--accent-primary);
    mix-blend-mode: difference;
}

.cursor-outline.hover {
    width: 34px;
    height: 34px;
    border-width: 2px;
    opacity: 0.8;
    transition: 
        width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        height 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 0.3s ease;
}

/* État clic */
.cursor-dot.clicking {
    width: 6px;
    height: 6px;
}

.cursor-outline.clicking {
    width: 32px;
    height: 32px;
    opacity: 0.9;
    transition: 
        width 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
        height 0.15s cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 0.15s ease;

}
.cursor-dot.text {
    mix-blend-mode: difference;
}
.cursor-outline.text {
    mix-blend-mode: difference;
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
    .cursor-dot,
    .cursor-outline {
        transition: none !important;
    }
    
    /* Pas d'animation JS en mode reduced motion */
    .cursor-outline {
        transition: transform 0.01ms !important;
    }
}
</style>