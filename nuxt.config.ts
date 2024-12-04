// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/robots', '@nuxtjs/sitemap', 'nuxt-gtag', '@zadigetvoltaire/nuxt-gtm'],
  css: ['~/assets/main.css'],
  site: { url: 'resume.gregoire-raturat.fr' },
  gtag: {
    enabled: process.env.NODE_ENV === 'production',
    id: 'G-ZEHQTGC6EE'
  },
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
    id: 'GTM-TWMWSF5Z', // Your GTM single container ID, array of container ids ['GTM-xxxxxx', 'GTM-yyyyyy'] or array of objects [{id: 'GTM-xxxxxx', queryParams: { gtm_auth: 'abc123', gtm_preview: 'env-4', gtm_cookies_win: 'x'}}, {id: 'GTM-yyyyyy', queryParams: {gtm_auth: 'abc234', gtm_preview: 'env-5', gtm_cookies_win: 'x'}}], // Your GTM single container ID or array of container ids ['GTM-xxxxxx', 'GTM-yyyyyy']
    queryParams: {
      // Add URL query string when loading gtm.js with GTM ID (required when using custom environments)
      gtm_auth: 'AB7cDEf3GHIjkl-MnOP8qr',
      gtm_preview: 'env-4',
      gtm_cookies_win: 'x',
    },
    defer: false, // Script can be set to `defer` to speed up page load at the cost of less accurate results (in case visitor leaves before script is loaded, which is unlikely but possible). Defaults to false, so the script is loaded `async` by default
    compatibility: false, // Will add `async` and `defer` to the script tag to not block requests for old browsers that do not support `async`
    nonce: '2726c7f26c', // Will add `nonce` to the script tag
    enabled: true, // defaults to true. Plugin can be disabled by setting this to false for Ex: enabled: !!GDPR_Cookie (optional)
    debug: true, // Whether or not display console logs debugs (optional)
    loadScript: true, // Whether or not to load the GTM Script (Helpful if you are including GTM manually, but need the dataLayer functionality in your components) (optional)
    enableRouterSync: true, // Pass the router instance of your app to automatically sync with router (optional)
    trackOnNextTick: false, // Whether or not call trackView in Vue.nextTick
    devtools: true, // (optional)
  },
  runtimeConfig: {
    public: {
      gtm: {
        id: 'GTM-TWMWSF5Z',
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