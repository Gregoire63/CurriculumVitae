<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const currentImageIndex = ref(0)
const modalPanel = ref<HTMLElement>()

const project = computed(() => store.activeProject)

watch(
    () => project.value,
    async (newProject) => {
        if (newProject) {
            currentImageIndex.value = 0
            await nextTick()
            if (modalPanel.value) {
                modalPanel.value.scrollTop = 0
            }
        }
    },
)

const closeModal = () => {
    if (project.value) {
        project.value.visible = false
    }
    setTimeout(() => {
        store.setActiveProject(null)
    }, 300)
}

const nextImage = () => {
    if (project.value?.imgs) {
        currentImageIndex.value = (currentImageIndex.value + 1) % project.value.imgs.length
    }
}

const prevImage = () => {
    if (project.value?.imgs) {
        currentImageIndex.value = (currentImageIndex.value - 1 + project.value.imgs.length) % project.value.imgs.length
    }
}

const goToImage = (index: number) => {
    currentImageIndex.value = index
}
</script>

<template>
    <Transition name="modal">
        <div v-if="project" class="modal-overlay" :class="{ visible: project.visible }" @click="closeModal">
            <div
                ref="modalPanel"
                class="modal-panel"
                :style="{ '--color': project.color || '139, 111, 92' }"
                @click.stop
            >
                <!-- Modal Header -->
                <div class="modal-header">
                    <div class="project-meta">
                        <h2 class="project-title">{{ project.name }}</h2>
                        <div class="project-info">
                            <span>{{ project.year }}</span>
                            <span class="dot">•</span>
                            <span>{{ project.type }}</span>
                        </div>
                    </div>

                    <div class="modal-actions">
                        <a
                            v-if="project.url"
                            :href="project.url"
                            target="_blank"
                            class="action-button"
                            aria-label="Visit project"
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </svg>
                        </a>

                        <button class="action-button close-button" aria-label="Close" @click="closeModal">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                <path
                                    d="M18 6L6 18M6 6L18 18"
                                    stroke="currentColor"
                                    stroke-width="2"
                                    stroke-linecap="round"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Modal Content -->
                <div class="modal-content">
                    <!-- PDF Viewer -->
                    <div v-if="project.pdf" class="pdf-viewer">
                        <iframe :src="project.pdf" class="pdf-frame"></iframe>
                    </div>

                    <!-- Image Gallery -->
                    <div v-else-if="project.imgs && project.imgs.length > 0" class="image-gallery">
                        <div class="gallery-main">
                            <template v-for="(img, index) in project.imgs" :key="index">
                                <Transition name="gallery-fade" mode="out-in">
                                    <div v-if="index === currentImageIndex" class="gallery-item">
                                        <video
                                            v-if="img.type === 'video'"
                                            :src="img.src"
                                            autoplay
                                            loop
                                            muted
                                            class="gallery-media"
                                        ></video>
                                        <img
                                            v-else
                                            :src="img.src"
                                            :alt="img.title || project.name"
                                            class="gallery-media"
                                        />
                                        <p v-if="img.title" class="media-caption">{{ img.title }}</p>
                                    </div>
                                </Transition>
                            </template>

                            <!-- Navigation Arrows -->
                            <button
                                v-if="project.imgs.length > 1"
                                class="gallery-nav prev"
                                aria-label="Previous image"
                                @click="prevImage"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M15 18L9 12L15 6"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </button>
                            <button
                                v-if="project.imgs.length > 1"
                                class="gallery-nav next"
                                aria-label="Next image"
                                @click="nextImage"
                            >
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M9 18L15 12L9 6"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </button>
                        </div>

                        <!-- Thumbnails -->
                        <div v-if="project.imgs.length > 1" class="gallery-thumbnails">
                            <button
                                v-for="(img, index) in project.imgs"
                                :key="index"
                                class="thumbnail"
                                :class="{ active: index === currentImageIndex }"
                                @click="goToImage(index)"
                            >
                                <img v-if="img.type !== 'video'" :src="img.src" :alt="`Thumbnail ${index + 1}`" />
                                <div v-else class="video-thumbnail">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M8 5v14l11-7z" />
                                    </svg>
                                </div>
                            </button>
                        </div>
                    </div>

                    <!-- Project Description -->
                    <div class="project-details">
                        <p class="project-description" v-html="project.description"></p>

                        <!-- Technologies -->
                        <div class="tech-stack">
                            <h3 class="tech-title">{{ store.isFrench ? 'Technologies' : 'Tech Stack' }}</h3>
                            <div class="tech-tags">
                                <a
                                    v-for="(tech, index) in project.techno"
                                    :key="index"
                                    :href="tech.url"
                                    target="_blank"
                                    class="tech-tag"
                                >
                                    {{ tech.name }}
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                                        <path
                                            d="M18 13V19C18 19.5304 17.7893 20.0391 17.4142 20.4142C17.0391 20.7893 16.5304 21 16 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V8C3 7.46957 3.21071 6.96086 3.58579 6.58579C3.96086 6.21071 4.46957 6 5 6H11M15 3H21M21 3V9M21 3L10 14"
                                            stroke="currentColor"
                                            stroke-width="2"
                                            stroke-linecap="round"
                                            stroke-linejoin="round"
                                        />
                                    </svg>
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<style scoped>
.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 3000;
    background: rgba(42, 40, 38, 0.95);
    backdrop-filter: blur(20px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-lg);
    overflow-y: hidden;
    max-height: 100dvh;
}

.modal-panel {
    position: relative;
    max-width: 1000px;
    width: 100%;
    background: var(--bg-primary);
    border-radius: 32px;
    padding: var(--space-xl);
    max-height: calc(100vh - 4rem);
    overflow-y: auto;
    box-shadow: 0 20px 60px rgba(var(--color), 0.2);
    margin: 2rem;
    scrollbar-gutter: stable;
}

.modal-panel::-webkit-scrollbar {
    width: 8px;
}

.modal-panel::-webkit-scrollbar-track {
    background: transparent;
    margin: 32px 0;
}

.modal-panel::-webkit-scrollbar-thumb {
    background: var(--accent-secondary);
    border-radius: 4px;
    transition: background 0.3s ease;
}

.modal-panel::-webkit-scrollbar-thumb:hover {
    background: var(--accent-primary);
}

/* Modal Header */
.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-md);
    margin-bottom: var(--space-lg);
    padding-bottom: var(--space-md);
    border-bottom: 1px solid var(--bg-accent);
}

.project-meta {
    flex: 1;
}

.project-title {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0 0 var(--space-xs) 0;
}

.project-info {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    color: var(--text-secondary);
}

.dot {
    opacity: 0.5;
}

.modal-actions {
    display: flex;
    gap: var(--space-sm);
}

.action-button {
    width: 44px;
    height: 44px;
    background: var(--bg-secondary);
    border: 1px solid var(--bg-accent);
    border-radius: 50%;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    text-decoration: none;
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.3s ease,
        border-color 0.3s ease;
}

@media (prefers-reduced-motion: no-preference) {
    .action-button:hover {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
        color: var(--bg-primary);
        transform: scale(1.08);
    }

    .close-button:hover {
        transform: scale(1.08) rotate(90deg);
    }
}

/* Modal Content */
.modal-content {
    display: flex;
    flex-direction: column;
    gap: var(--space-lg);
}

/* PDF Viewer */
.pdf-viewer {
    width: 100%;
    height: 600px;
    border-radius: 16px;
    overflow: hidden;
    background: var(--bg-secondary);
}

.pdf-frame {
    width: 100%;
    height: 100%;
    border: none;
}

/* Image Gallery */
.image-gallery {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.gallery-main {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 10;
    border-radius: 16px;
    overflow: hidden;
    background: var(--bg-secondary);
}

.gallery-item {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
}

.gallery-media {
    width: 100%;
    flex: 1;
    object-fit: contain;
    background: var(--bg-secondary);
}

.media-caption {
    padding: var(--space-sm);
    background: rgba(var(--color), 0.9);
    color: var(--bg-primary);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    text-align: center;
    margin: 0;
}

.gallery-nav {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    width: 44px;
    height: 44px;
    background: rgba(var(--color), 0.9);
    border: none;
    border-radius: 50%;
    color: var(--bg-primary);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        opacity 0.3s ease;
    opacity: 0.7;
}

@media (prefers-reduced-motion: no-preference) {
    .gallery-nav:hover {
        opacity: 1;
        transform: translateY(-50%) scale(1.15);
    }
}

.gallery-nav.prev {
    left: var(--space-md);
}

.gallery-nav.next {
    right: var(--space-md);
}

.gallery-thumbnails {
    display: flex;
    gap: var(--space-sm);
    overflow-x: auto;
    padding: var(--space-xs);
}

.thumbnail {
    width: 80px;
    height: 60px;
    flex-shrink: 0;
    border-radius: 8px;
    overflow: hidden;
    background: var(--bg-secondary);
    border: 2px solid transparent;
    cursor: pointer;
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        border-color 0.3s ease;
    padding: 0;
}

.thumbnail img,
.video-thumbnail {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
}

@media (prefers-reduced-motion: no-preference) {
    .thumbnail:hover,
    .thumbnail.active {
        border-color: rgb(var(--color));
    }

    .thumbnail.active {
        transform: scale(1.08);
    }
}

/* Project Details */
.project-details {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.project-description {
    font-size: 1.0625rem;
    line-height: 1.8;
    color: var(--text-secondary);
    margin: 0;
}

.tech-stack {
    padding-top: var(--space-md);
    border-top: 1px solid var(--bg-accent);
}

.tech-title {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-muted);
    margin: 0 0 var(--space-sm) 0;
}

.tech-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-sm);
}

.tech-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    font-size: 0.875rem;
    padding: var(--space-xs) var(--space-md);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 20px;
    text-decoration: none;
    transition:
        all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.3s ease,
        border-color 0.3s ease;
}

.tech-tag svg {
    opacity: 0;
    transform: translateX(-4px);
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: no-preference) {
    .tech-tag:hover {
        background: rgb(var(--color));
        border-color: rgb(var(--color));
        color: var(--bg-primary);
        transform: translateY(-2px);
    }

    .tech-tag:hover svg {
        opacity: 1;
        transform: translateX(0);
    }
}

/* Transitions */
.modal-enter-active,
.modal-leave-active {
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}

.modal-enter-active .modal-panel,
.modal-leave-active .modal-panel {
    transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-from .modal-panel {
    opacity: 0;
    transform: scale(0.92) translateY(-20px);
}

.modal-leave-to .modal-panel {
    opacity: 0;
    transform: scale(0.92) translateY(20px);
}

/* Gallery fade transition */
.gallery-fade-enter-active,
.gallery-fade-leave-active {
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}

.gallery-fade-enter-from,
.gallery-fade-leave-to {
    opacity: 0;
}

/* Responsive */
@media (max-width: 768px) {
    .modal-overlay {
        padding:0;
    }

    .modal-panel {
        padding: var(--space-sm);
        margin:0;
    }

    .project-title {
        font-size: 1.5rem;
    }

    .modal-header {
        flex-direction: column-reverse;
        margin-bottom: var(--space-sm);
        gap: unset;
    }

    .modal-actions {
        align-self: flex-end;
    }

    .gallery-main {
        aspect-ratio: 4 / 3;
    }

    .pdf-viewer {
        height: 400px;
    }
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
</style>
