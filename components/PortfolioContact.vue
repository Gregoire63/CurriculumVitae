<script setup lang="ts">
import { usePreferredReducedMotion } from '@vueuse/core'
import { ref } from 'vue'
import { usePortfolioStore } from '~/stores/portfolio'

const store = usePortfolioStore()
const preferredMotion = usePreferredReducedMotion()
// usePreferredReducedMotion renvoie une string ('reduce' | 'no-preference'), toujours truthy : on la normalise en booleen
const prefersReducedMotion = computed(() => preferredMotion.value === 'reduce')
const { gtag } = useGtag()

const name = ref('')
const email = ref('')
const message = ref('')
const isSubmitting = ref(false)
const isSuccess = ref(false)
const isError = ref(false)

const socialLinks = [
    {
        name: 'Email',
        url: 'mailto:gregoireraturatpro@gmail.com',
        icon: 'M0 3v18h24v-18h-24zm21.518 2l-9.518 7.713-9.518-7.713h19.036zm-19.518 14v-11.817l10 8.104 10-8.104v11.817h-20z',
    },
    {
        name: 'Malt',
        url: 'https://www.malt.fr/profile/gregoireraturat',
        icon: 'M20.195 8.581c-.069 0-.285.026-.484.113-.432.181-.597.311-.597.58v5.023c0 .277.26.355.735.355.467 0 .649-.087.649-.355V8.858c0-.173-.113-.277-.303-.277zm3.502 4.903c-.345.087-.45.113-.57.113-.147 0-.2-.044-.2-.2v-2.161h.788c.207 0 .285-.078.285-.285 0-.173-.078-.26-.285-.26h-.787v-.839c0-.259-.087-.363-.268-.363-.173 0-.415.156-.934.597-.528.45-.83.744-.83.951 0 .121.086.199.224.199h.424v2.335c0 .683.337 1.08.925 1.08.39 0 .675-.146 1.012-.406.311-.242.51-.432.51-.596 0-.139-.103-.217-.294-.165zm-15.21-3.078c-.13 0-.285.026-.484.112-.433.19-.597.312-.597.58v3.2c0 .276.26.354.735.354.467 0 .649-.087.649-.355v-3.614c0-.173-.113-.277-.303-.277Zm1.816 0c-.355 0-.675.121-.986.363-.173.138-.32.294-.32.424 0 .112.078.173.19.173.19 0 .251-.078.416-.078.164 0 .25.173.25.476v2.533c0 .277.26.355.735.355.467 0 .649-.087.649-.355v-2.776c0-.657-.39-1.115-.934-1.115zm2.43 0c-.337 0-.692.121-1.003.363-.173.138-.32.294-.32.424 0 .112.078.173.19.173.19 0 .25-.078.432-.078s.268.173.268.476v2.533c0 .277.26.355.735.355.467 0 .649-.087.649-.355v-2.776c0-.657-.39-1.115-.951-1.115zm5.335 0a1.29 1.29 0 0 0-.484.112c-.26.113-.398.2-.467.312-.26-.303-.597-.398-.977-.398-1.116 0-1.911.942-1.911 2.283 0 1.124.605 1.954 1.461 1.954.26 0 .493-.104.77-.363.216-.2.32-.329.32-.45a.14.14 0 0 0-.147-.147c-.121 0-.251.104-.416.104-.354 0-.596-.545-.596-1.35 0-.803.32-1.348.804-1.348.32 0 .562.242.562.657v2.525c0 .277.26.355.735.355.467 0 .649-.087.649-.355v-3.614c0-.173-.113-.277-.303-.277ZM3.499 13.563l-.21.21.619.618c.304.304.79.598 1.244.144.339-.34.26-.695.073-.98-.06.004-1.726.008-1.726.008zm-.963-2.325.21-.21-.608-.607c-.304-.303-.765-.621-1.243-.143-.351.35-.273.692-.087.97Zm2.86.416c-.037.043-1.511 1.524-1.511 1.524h1.154c.43 0 .981-.101.981-.777 0-.496-.296-.683-.624-.747zm-3.244-.031H.981c-.43 0-.981.135-.981.778 0 .479.307.676.641.745.04-.046 1.511-1.523 1.511-1.523zm1.484 3.04-.618-.618-.608.607a2.613 2.613 0 0 1-.137.128c.07.333.266.639.745.639s.676-.307.745-.641c-.043-.037-.085-.073-.127-.115zM2.41 10.15l.608.607.618-.618a2.25 2.25 0 0 1 .128-.118c-.065-.327-.251-.623-.747-.623s-.682.297-.746.625c.046.04.092.08.14.127zm2.742.117c-.455-.454-.94-.16-1.244.144l-2.87 2.87c-.303.303-.621.765-.143 1.243.478.478.94.16 1.243-.143l2.87-2.87c.304-.304.598-.79.144-1.244Z',
    },
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

    if (!name.value || !email.value || !message.value) return

    isSubmitting.value = true
    isError.value = false

    try {
        // Google Analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', 'contact_form_submit', {
                event_category: 'engagement',
                event_label: 'Contact Form',
                value: message.value.length,
            })
        }

        // ✅ CORRECTION : POST vers / avec form-name requis par Netlify
        const response = await fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                'form-name': 'contact',  // CRITIQUE : doit matcher le name du form
                'name': name.value,
                'email': email.value,
                'message': message.value,
            }).toString()
        })

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
        }

        // ✅ Redirection vers la page de succès
        window.location.href = '/contact.html'

    } catch (error) {
        console.error('Error sending message:', error)
        isError.value = true

        // Affichage du message d'erreur dans la console pour debug
        if (error instanceof Error) {
            console.error('Error details:', error.message)
        }

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
                                ? 'Un projet, une question ou simplement envie d’échanger ? Écrivez-moi, je réponds rapidement.'
                                : 'A project, a question, or just want to connect? Write to me — I reply quickly.'
                        }}
                    </p>

                    <!-- Social Links -->
                    <div class="social-links">
                        <a
                            v-for="social in socialLinks"
                            :key="social.name"
                            :href="social.url"
                            :target="social.download || social.url.startsWith('mailto:') ? '_self' : '_blank'"
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
                    <!-- Message d'erreur -->
                    <div v-if="isError" class="error-message">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                            <path d="M12 8v4M12 16h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <span>
                            {{ store.isFrench 
                                ? "Erreur lors de l'envoi. Veuillez réessayer." 
                                : "Error sending message. Please try again."
                            }}
                        </span>
                    </div>

                    <form class="contact-form" name="contact" method="POST" data-netlify="true" netlify-honeypot="bot-field" @submit="handleSubmit">
                        <!-- Hidden fields requis par Netlify -->
                        <input type="hidden" name="form-name" value="contact" />
                        
                        <!-- Honeypot anti-spam : masqué visuellement, présent dans le DOM pour piéger les bots -->
                        <div style="display: none;" aria-hidden="true">
                            <label>Don't fill this out: <input name="bot-field" tabindex="-1" autocomplete="off" /></label>
                        </div>

                        <!-- Champ Name (ajouté pour correspondre à contact.html) -->
                        <div class="form-group">
                            <label for="name" class="form-label">
                                {{ store.isFrench ? 'Nom' : 'Name' }}
                            </label>
                            <input
                                id="name"
                                v-model="name"
                                type="text"
                                name="name"
                                class="form-input"
                                :placeholder="store.isFrench ? 'Votre nom' : 'Your name'"
                                required
                            />
                        </div>

                        <!-- Champ Email -->
                        <div class="form-group">
                            <label for="email" class="form-label">Email</label>
                            <input
                                id="email"
                                v-model="email"
                                type="email"
                                name="email"
                                class="form-input"
                                :placeholder="store.isFrench ? 'votre@email.com' : 'your@email.com'"
                                required
                            />
                        </div>

                        <!-- Champ Message -->
                        <div class="form-group">
                            <label for="message" class="form-label">Message</label>
                            <textarea
                                id="message"
                                v-model="message"
                                name="message"
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

/* Social Links — deux par ligne */
.social-links {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
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
    min-width: 0;
}

/* Si le nombre de liens est impair, le dernier occupe toute la largeur */
.social-link:last-child:nth-child(odd) {
    grid-column: 1 / -1;
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
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(139, 111, 92, 0.22);
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

/* Message d'erreur */
.error-message {
    display: flex;
    align-items: center;
    gap: var(--space-sm);
    padding: var(--space-sm) var(--space-md);
    background: #fee;
    border: 1px solid #fcc;
    border-radius: 12px;
    color: #c33;
    font-size: 0.875rem;
    margin-bottom: var(--space-md);
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.error-message svg {
    flex-shrink: 0;
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

@media (prefers-reduced-motion: no-preference) and (pointer: fine) {
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
    .contact-grid {
        gap: var(--space-sm);
    }
    .contact-wrapper {
        padding: var(--space-lg) var(--space-md);
    }
    .section-description {
        margin-bottom: var(--space-md);
    }
    .contact-form-wrapper {
        padding: var(--space-md);
    }

    .social-links {
        gap: var(--space-xs);
    }

    .social-link {
        padding: var(--space-sm);
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

/* Sorti du sélecteur parent : le nom d'un @keyframes est toujours global, donc
   l'imbriquer n'apportait aucune portée — et lightningcss (minifieur de Vite 8)
   rejette toute at-rule autre que @media/@supports/@container à l'intérieur
   d'une règle. Vue continue de préfixer les noms en <style scoped>. */
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
</style>