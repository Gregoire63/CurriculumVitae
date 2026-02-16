import { defineNuxtConfig } from 'nuxt/config'
// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2024-11-01',
    modules: [
        '@vueuse/nuxt',
        '@vueuse/motion',
        '@nuxt/icon',
        '@pinia/nuxt',
        '@nuxt/fonts',
        '@nuxt/content',
        '@nuxt/eslint',
        '@nuxt/fonts',
        '@nuxt/hints',
        '@nuxt/image',
        '@nuxt/scripts',
        '@nuxt/test-utils/module',
        '@nuxtjs/google-fonts',
        '@nuxt/ui',
        'nuxt-gtag',
        '@nuxtjs/sitemap',
        '@nuxtjs/robots',
    ],
    css: ['~/assets/css/main.css'],
    ssr: false,
    spaLoadingTemplate: 'spa-loading-template.html',
    gtag: {
        id: 'G-ZEHQTGC6EE',
        config: {
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure',
        },
    },

    imports: { dirs: ['./composables/*/*.{ts,js}'] },
    devtools: { enabled: true },
    pinia: {
        storesDirs: ['./stores/**', './custom-folder/stores/**'],
    },

    // ============================================================
    // SITEMAP (@nuxtjs/sitemap)
    // ============================================================
    site: {
        url: 'https://gregoire-raturat.fr',
        autoLastmod: true,
        xsl: false,
        urls: [
            {
                loc: '/',
                priority: 1.0,
                changefreq: 'monthly',
            },
        ],
        // Hreflang pour FR + EN (même URL, langue client-side)
        i18n: {
            locales: ['fr', 'en'],
            defaultLocale: 'fr',
        },
    },

    runtimeConfig: {
        public: {
            siteUrl: 'https://gregoire-raturat.fr',
        },
    },
    // Configuration des images
    image: {
        quality: 80,
        format: ['webp', 'avif', 'jpeg'],
        screens: {
            xs: 320,
            sm: 640,
            md: 768,
            lg: 1024,
            xl: 1280,
            xxl: 1536,
        },
    },
    robots: {
        disallow: ['/_nuxt/', '/api/'],
    },
    app: {
        head: {
            title: 'Grégoire Raturat — Full Stack Developer',
            titleTemplate: '%s | Grégoire Raturat',
            charset: 'utf-8',
            viewport: 'width=device-width, initial-scale=1',
            meta: [
                {
                    name: 'description',
                    content:
                        'Portfolio de Grégoire Raturat, développeur Full Stack spécialisé en Vue.js, Nuxt, React et Node.js, basé à Lyon.',
                },
                { name: 'format-detection', content: 'telephone=no' },
                { name: 'author', content: 'Grégoire Raturat' },
                { name: 'robots', content: 'index, follow' },
                // Open Graph
                { property: 'og:title', content: 'Grégoire Raturat — Full Stack Developer' },
                {
                    property: 'og:description',
                    content:
                        'Portfolio de Grégoire Raturat, développeur Full Stack spécialisé en Vue.js, Nuxt, React et Node.js, basé à Lyon.',
                },
                { property: 'og:type', content: 'website' },
                { property: 'og:url', content: 'https://gregoire-raturat.fr' },
                { property: 'og:image', content: 'https://gregoire-raturat.fr/og-image.webp' },
                { property: 'og:image:width', content: '1200' },
                { property: 'og:image:height', content: '630' },
                { property: 'og:locale', content: 'fr_FR' },
                // Twitter Card
                { name: 'twitter:card', content: 'summary_large_image' },
                { name: 'twitter:title', content: 'Grégoire Raturat — Full Stack Developer' },
                {
                    name: 'twitter:description',
                    content:
                        'Portfolio de Grégoire Raturat, développeur Full Stack spécialisé en Vue.js, Nuxt, React et Node.js, basé à Lyon.',
                },
                { name: 'twitter:image', content: 'https://gregoire-raturat.fr/og-image.webp' },
                // Thème
                { name: 'theme-color', content: '#8b6f5c' },
                { name: 'msapplication-TileColor', content: '#8b6f5c' },
            ],
            link: [
                { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
                { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
                { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
                { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
                { rel: 'manifest', href: '/site.webmanifest' },
                // Preconnect
                { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
                { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
                { rel: 'dns-prefetch', href: 'https://www.googletagmanager.com' },
                {
                    rel: 'preload',
                    as: 'style',
                    href: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap',
                },
            ],
        },
        pageTransition: { name: 'page', mode: 'out-in' },
    },
    // Configuration des fonts
    fonts: {
        families: [
            { name: 'Inter', provider: 'google', weights: [300, 400, 500, 600, 700] },
            { name: 'JetBrains Mono', provider: 'google', weights: [400, 500, 600] },
        ],
    },
    googleFonts: {
        families: {
            'Playfair+Display': [400, 600, 700],
            'Space+Mono': [400, 700],
            'DM+Sans': [400, 500, 700],
        },
        display: 'swap',
        preload: true,
        download: true,
    },
    // Optimisations de performance
    experimental: {
        payloadExtraction: true,
        renderJsonPayloads: true,
        viewTransition: true,
    },

    // Nitro (serveur)
    nitro: {
        prerender: {
            crawlLinks: true,
            routes: ['/'],
        },
        compressPublicAssets: {
            gzip: true,
            brotli: true,
        },
        routeRules: {
            '/_nuxt/**': { headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
        },
    },

    // Vite configuration
    vite: {
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: '@use "~/assets/scss/variables.scss" as *;',
                },
            },
        },
    },
    // Route rules pour le caching
    routeRules: {
        '/': { prerender: true },
        '/**': {
            headers: {
                'X-Content-Type-Options': 'nosniff',
                'X-Frame-Options': 'DENY',
                'X-XSS-Protection': '1; mode=block',
                'Referrer-Policy': 'strict-origin-when-cross-origin',
                'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
            },
        },
    },
})
