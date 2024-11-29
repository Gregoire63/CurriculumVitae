// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/robots', '@nuxtjs/sitemap', '@zadigetvoltaire/nuxt-gtm'],
  css: ['~/assets/main.css'],
  app: {
    head: {
      link: [{ rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }, { rel: 'canonical', href: 'https://resume.gregoire-raturat.fr/' }],
      charset: 'UTF-8',
      title: 'Grégoire Raturat - FullStack Developer',
        meta: [
          { charset: 'UTF-8' },
          { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
          { name: 'description', content: 'Portfolio de Grégoire Raturat, développeur FullStack passionné par l\'innovation et le travail en équipe.' },
          { name: 'keywords', content: 'Grégoire Raturat, gregoire, raturat, développeur, FullStack, portfolio, innovation, travail en équipe' },
          { name: 'author', content: 'Grégoire Raturat' },
          { property: 'og:title', content: 'Grégoire Raturat - FullStack Developer' },
          { property: 'og:description', content: 'Portfolio de Grégoire Raturat, développeur FullStack passionné par l\'innovation et le travail en équipe.' },
          { property: 'og:type', content: 'website' },
          { property: 'og:url', content: 'https://resume.gregoire-raturat.fr/' },
          { property: 'og:image', content: '/screen.webp' },
          { name: 'twitter:card', content: 'summary_large_image' },
          { name: 'twitter:title', content: 'Grégoire Raturat - FullStack Developer' },
          { name: 'twitter:description', content: 'Portfolio de Grégoire Raturat, développeur FullStack passionné par l\'innovation et le travail en équipe.' },
          { name: 'twitter:image', content: '/screen.webp' }
        ],
        noscript: [
          {
            innerHTML: 'Votre navigateur ne supporte pas JavaScript. Veuillez activer JavaScript pour une meilleure expérience.'
          }
        ]
    },
  },
  gtm: {
    id: 'G-ZEHQTGC6EE',
    queryParams: {
      gtm_auth: 'AB7cDEf3GHIjkl-MnOP8qr',
      gtm_preview: 'env-4',
      gtm_cookies_win: 'x',
    },
    defer: false,
    compatibility: false,
    nonce: '2726c7f26c',
    enabled: true,
    debug: true,
    loadScript: true,
    enableRouterSync: true,
    trackOnNextTick: false,
    devtools: true,
  },
  runtimeConfig: {
    public: {
      gtm: {
        id: 'G-ZEHQTGC6EE',
        queryParams: {
          gtm_auth: 'AB7cDEf3GHIjkl-MnOP8qr',
          gtm_preview: 'env-4',
          gtm_cookies_win: 'x',
        },
        defer: false,
        compatibility: false,
        nonce: '2726c7f26c',
        enabled: true,
        debug: true,
        loadScript: true,
        enableRouterSync: true,
        trackOnNextTick: false,
        devtools: true,
      }
    }
  }
})