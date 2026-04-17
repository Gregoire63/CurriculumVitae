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
      '@nuxt/image',
      '@nuxt/ui',
      'nuxt-gtag',
      '@nuxtjs/sitemap',
      '@nuxtjs/robots',
    ],
    css: ['~/assets/css/main.css'],
    gtag: {
        id: 'G-ZEHQTGC6EE',
        initMode: 'manual',
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
    sourcemap: {
        server: false,
        client: false,
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
        disallow: [],
        sitemap: 'https://gregoire-raturat.fr/sitemap.xml',
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
                { rel: 'icon', type: 'image/png', sizes: '48x48', href: '/favicon-48x48.png' },
                { rel: 'icon', type: 'image/png', sizes: '96x96', href: '/favicon-96x96.png' },
                { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
                { rel: 'manifest', href: '/site.webmanifest' },
                { rel: 'dns-prefetch', href: 'https://www.googletagmanager.com' },
            ],
            script: [
                {
                    type: 'application/ld+json',
                    innerHTML: JSON.stringify({
                        '@context': 'https://schema.org',
                        '@graph': [
                            {
                                '@type': 'Person',
                                '@id': 'https://gregoire-raturat.fr/#person',
                                name: 'Grégoire Raturat',
                                jobTitle: 'Développeur Full Stack',
                                url: 'https://gregoire-raturat.fr',
                                image: 'https://gregoire-raturat.fr/og-image.webp',
                                logo: 'https://gregoire-raturat.fr/favicon-96x96.png',
                                sameAs: [
                                    'https://github.com/Gregoire63',
                                    'https://www.linkedin.com/in/gregoire-raturat',
                                ],
                                address: {
                                    '@type': 'PostalAddress',
                                    addressLocality: 'Lyon',
                                    addressCountry: 'FR',
                                },
                                knowsAbout: [
                                    'Vue.js', 'Nuxt.js', 'React', 'Node.js',
                                    'TypeScript', 'JavaScript', 'Python',
                                    'Full Stack Development', 'Web Development',
                                ],
                                alumniOf: {
                                    '@type': 'EducationalOrganization',
                                    name: 'ISITECH',
                                },
                                worksFor: {
                                    '@type': 'Organization',
                                    name: 'Sogedo',
                                },
                            },
                            {
                                '@type': 'WebSite',
                                '@id': 'https://gregoire-raturat.fr/#website',
                                url: 'https://gregoire-raturat.fr',
                                name: 'Grégoire Raturat — Portfolio',
                                description: 'Portfolio de Grégoire Raturat, développeur Full Stack basé à Lyon.',
                                author: { '@id': 'https://gregoire-raturat.fr/#person' },
                                inLanguage: ['fr-FR', 'en-US'],
                            },
                        ],
                    }),
                },
            ],
        },
        pageTransition: { name: 'page', mode: 'out-in' },
    },
    // Configuration des fonts
    fonts: {
        families: [
            { name: 'Playfair Display', provider: 'google', weights: [600, 700], display: 'optional' },
            { name: 'Space Mono', provider: 'google', weights: [400, 700], display: 'optional' },
            { name: 'DM Sans', provider: 'google', weights: [400, 700], display: 'optional' },
        ],
        defaults: {
            fallbacks: {
                serif: ['Georgia', 'Times New Roman'],
                'sans-serif': ['system-ui', 'Arial'],
                monospace: ['Courier New'],
            },
        },
    },
    // Optimisations de performance
    experimental: {
        payloadExtraction: false,
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
            '/': { 
                prerender: true 
            },
            // Headers de sécurité pour toutes les routes
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
    },

    // Vite configuration
    vite: {
        build: {
            sourcemap: false,
        },
        css: {
            preprocessorOptions: {
                scss: {
                    additionalData: '@use "~/assets/scss/variables.scss" as *;',
                },
            },
            postcss: {
                plugins: [
                    {
                        postcssPlugin: 'font-display-optional',
                        Declaration(decl: any) {
                            if (decl.prop === 'font-display' && decl.value === 'swap') {
                                decl.value = 'optional'
                            }
                        },
                    },
                ],
            },
        },
        vue: {
            template: {
                compilerOptions: {
                    isCustomElement: (tag) => tag.includes('-'),
                },
            },
        },
    },
})