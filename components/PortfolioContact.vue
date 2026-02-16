<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const prefersReducedMotion = usePreferredReducedMotion()
const { gtag } = useGtag()

const email = ref('')
const message = ref('')
const isSubmitting = ref(false)
const isSuccess = ref(false)
const isError = ref(false)

const encode = (data: Record<string, string>) => {
    return Object.keys(data)
        .map((key) => encodeURIComponent(`${key}=${data[key]}`))
        .join('&')
}

const socialLinks = [
    {
        name: 'GitHub',
        url: 'https://github.com/Gregoire63',
        icon: 'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z',
    },
    {
        name: 'LinkedIn',
        url: 'https://www.linkedin.com/in/grégoire-raturat-b671091aa/',
        icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z',
    },
    {
        name: 'CV',
        url: '/cv/CV_Gregoire_Raturat.pdf',
        icon: 'M3 24h19v-23h-1v22h-18v1zm17-24h-18v22h18v-22zm-3 17h-12v1h12v-1zm0-3h-12v1h12v-1zm0-3h-12v1h12v-1zm-7.348-3.863l.948.3c-.145.529-.387.922-.725 1.178-.338.257-.767.385-1.287.385-.643 0-1.171-.22-1.585-.659-.414-.439-.621-1.04-.621-1.802 0-.806.208-1.432.624-1.878.416-.446.963-.669 1.642-.669.592 0 1.073.175 1.443.525.221.207.386.505.496.892l-.968.231c-.057-.251-.177-.449-.358-.594-.182-.146-.403-.218-.663-.218-.359 0-.65.129-.874.386-.223.258-.335.675-.335 1.252 0 .613.11 1.049.331 1.308.22.26.506.39.858.39.26 0 .484-.082.671-.248.187-.165.322-.425.403-.779zm3.023 1.78l-1.731-4.842h1.06l1.226 3.584 1.186-3.584h1.037l-1.734 4.842h-1.044z',
        download: true,
    },
]

const infoRef = ref<HTMLElement | null>(null)
const formRef = ref<HTMLElement | null>(null)

// Animations (côté client uniquement)
if (import.meta.client) {
    const { useMotion } = await import('@vueuse/motion')
    const fadeSlide = {
        initial: prefersReducedMotion.value ? { opacity: 0 } : { opacity: 0, x: -30 },
        visibleOnce: prefersReducedMotion.value
            ? { opacity: 1 }
            : {
                  opacity: 1,
                  x: 0,
                  transition: {
                      type: 'spring',
                      stiffness: 90,
                      damping: 22,
                  },
              },
    }
    const fadeSlideRight = {
        initial: prefersReducedMotion.value ? { opacity: 0 } : { opacity: 0, x: 30 },
        visibleOnce: prefersReducedMotion.value
            ? { opacity: 1 }
            : {
                  opacity: 1,
                  x: 0,
                  transition: {
                      type: 'spring',
                      stiffness: 90,
                      damping: 22,
                      delay: 0.2,
                  },
              },
    }

    useMotion(infoRef, fadeSlide)
    useMotion(formRef, fadeSlideRight)
}

const handleSubmit = async (e: Event) => {
    e.preventDefault()

    if (!email.value || !message.value) return

    isSubmitting.value = true
    isError.value = false

    try {
        // Google Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'contact', {
                app_name: 'Portfolio',
                screen_name: 'Contact',
                email: email.value,
                message_length: message.value.length,
            })
        }

        // Soumission à Netlify Forms
        const response = await fetch('/contact.html', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: encode({
                'form-name': 'contact',
                name: email.value,
                message: message.value,
            }),
        })

        if (!response.ok) {
            throw new Error('Form submission failed')
        }

        // Succès
        isSuccess.value = true
        email.value = ''
        message.value = ''

        // Reset du message de succès après 3s
        setTimeout(() => {
            isSuccess.value = false
        }, 3000)
    } catch (error) {
        console.error('Error sending message:', error)
        isError.value = true

        // Reset de l'erreur après 5s
        setTimeout(() => {
            isError.value = false
        }, 5000)
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="contact-wrapper">
        <div class="contact-container">
            <div class="contact-grid">
                <!-- Left Column - Info -->
                <div ref="infoRef" class="contact-info">
                    <span class="section-label">
                        <span class="label-line"></span>
                        {{ store.isFrench ? 'Restons en contact' : "Let's connect" }}
                    </span>

                    <h2 class="section-title">
                        {{ store.isFrench ? 'Contactez-moi' : 'Get in touch' }}
                    </h2>

                    <p class="section-description">
                        {{
                            store.isFrench
                                ? "Vous avez un projet en tête ? Une question sur mon travail ? N'hésitez pas à me contacter. Je serais ravi d'échanger avec vous."
                                : "Have a project in mind? A question about my work? Feel free to contact me. I'd be happy to chat with you."
                        }}
                    </p>

                    <!-- Social Links -->
                    <div class="social-links">
                        <a
                            v-for="social in socialLinks"
                            :key="social.name"
                            :href="social.url"
                            :target="social.download ? '_self' : '_blank'"
                            :download="social.download ? 'CV_Gregoire_Raturat.pdf' : undefined"
                            class="social-link"
                            :aria-label="social.name"
                        >
                            <svg viewBox="0 0 24 24" fill="currentColor">
                                <path :d="social.icon" />
                            </svg>
                            <span>{{ social.name }}</span>
                        </a>
                    </div>
                </div>

                <!-- Right Column - Form -->
                <div ref="formRef" class="contact-form-wrapper">
                    <form class="contact-form" name="contact" method="POST" data-netlify="true" @submit="handleSubmit">
                        <input type="hidden" name="form-name" value="contact" />
                        <div class="form-group">
                            <label for="email" class="form-label">Email</label>
                            <input
                                id="email"
                                v-model="email"
                                type="email"
                                class="form-input"
                                :placeholder="store.isFrench ? 'votre@email.com' : 'your@email.com'"
                                required
                            />
                        </div>

                        <div class="form-group">
                            <label for="message" class="form-label">Message</label>
                            <textarea
                                id="message"
                                v-model="message"
                                class="form-textarea"
                                :placeholder="store.isFrench ? 'Votre message...' : 'Your message...'"
                                rows="6"
                                required
                            ></textarea>
                        </div>

                        <button type="submit" class="submit-button" :disabled="isSubmitting">
                            <span v-if="!isSubmitting && !isSuccess">
                                {{ store.isFrench ? 'Envoyer' : 'Send' }}
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                            </span>
                            <span v-else-if="isSubmitting" class="loading">
                                <span class="loading-dot"></span>
                                <span class="loading-dot"></span>
                                <span class="loading-dot"></span>
                            </span>
                            <span v-else class="success">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                                    <path
                                        d="M20 6L9 17L4 12"
                                        stroke="currentColor"
                                        stroke-width="2"
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                    />
                                </svg>
                                {{ store.isFrench ? 'Envoyé !' : 'Sent!' }}
                            </span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.contact-wrapper {
    position: relative;
    width: 100%;
    padding: var(--space-xl) var(--space-lg);
    z-index: 1;
}

.contact-container {
    max-width: 1200px;
    margin: 0 auto;
}

.contact-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--space-xl);
    align-items: start;
}

/* Contact Info */
.contact-info {
    position: sticky;
    top: calc(var(--space-xl) + 80px);
}

.section-label {
    display: inline-flex;
    align-items: center;
    gap: var(--space-sm);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: var(--accent-primary);
    margin-bottom: var(--space-sm);
}

.label-line {
    width: 30px;
    height: 2px;
    background: var(--accent-primary);
}

.section-title {
    font-family: var(--font-display);
    font-size: clamp(2.5rem, 6vw, 4rem);
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--space-md);
}

.section-description {
    font-size: 1.125rem;
    line-height: 1.8;
    color: var(--text-secondary);
    margin-bottom: var(--space-lg);
}

/* Social Links */
.social-links {
    display: flex;
    flex-direction: column;
    gap: var(--space-sm);
}

.social-link {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-secondary);
    border: 1px solid var(--bg-accent);
    border-radius: 12px;
    color: var(--text-primary);
    text-decoration: none;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    font-family: var(--font-mono);
    font-size: 0.875rem;
    width: fit-content;
}

.social-link svg {
    width: 20px;
    height: 20px;
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@media (prefers-reduced-motion: no-preference) {
    .social-link:hover {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
        color: var(--bg-primary);
        transform: translateX(8px);
    }

    .social-link:hover svg {
        transform: scale(1.15);
    }
}

/* Contact Form */
.contact-form-wrapper {
    background: var(--bg-primary);
    border: 1px solid var(--bg-accent);
    border-radius: 24px;
    padding: var(--space-lg);
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.05);
}

.contact-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-md);
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: var(--space-xs);
}

.form-label {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--text-primary);
}

.form-input,
.form-textarea {
    font-family: var(--font-body);
    font-size: 1rem;
    padding: var(--space-sm) var(--space-md);
    background: var(--bg-secondary);
    border: 2px solid var(--bg-accent);
    border-radius: 12px;
    color: var(--text-primary);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.6, 1);
}

.form-input:focus,
.form-textarea:focus {
    outline: none;
    border-color: var(--accent-primary);
    background: var(--bg-primary);
}

.form-textarea {
    resize: vertical;
    min-height: 120px;
}

/* Submit Button */
.submit-button {
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 600;
    padding: var(--space-sm) var(--space-lg);
    background: var(--accent-primary);
    color: var(--bg-primary);
    border: 2px solid var(--accent-primary);
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-xs);
}

@media (prefers-reduced-motion: no-preference) {
    .submit-button:hover:not(:disabled) {
        background: var(--text-primary);
        border-color: var(--text-primary);
        transform: translateY(-2px);
        box-shadow: 0 10px 30px rgba(139, 111, 92, 0.3);
    }

    .submit-button svg {
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .submit-button:hover:not(:disabled) svg {
        transform: translateX(3px);
    }
}

.submit-button:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

/* Loading Animation */
.loading {
    display: flex;
    gap: 4px;
}

.loading-dot {
    width: 6px;
    height: 6px;
    background: currentColor;
    border-radius: 50%;
}

@media (prefers-reduced-motion: no-preference) {
    .loading-dot {
        animation: loading-bounce 1.4s infinite ease-in-out both;
    }

    .loading-dot:nth-child(1) {
        animation-delay: -0.32s;
    }
    .loading-dot:nth-child(2) {
        animation-delay: -0.16s;
    }

    @keyframes loading-bounce {
        0%,
        80%,
        100% {
            transform: scale(0);
            opacity: 0.5;
        }
        40% {
            transform: scale(1);
            opacity: 1;
        }
    }
}

.success {
    display: flex;
    align-items: center;
    gap: var(--space-xs);
}

/* Responsive */
@media (max-width: 1024px) {
    .contact-grid {
        grid-template-columns: 1fr;
        gap: var(--space-lg);
    }

    .contact-info {
        position: relative;
        top: 0;
    }

    .section-title {
        font-size: clamp(2rem, 8vw, 3rem);
    }
}

@media (max-width: 768px) {
    .contact-wrapper {
        padding: var(--space-lg) var(--space-md);
    }

    .contact-form-wrapper {
        padding: var(--space-md);
    }

    .social-links {
        flex-direction: row;
        flex-wrap: wrap;
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
