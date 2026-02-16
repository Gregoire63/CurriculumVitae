/**
 * composables/useSEO.ts
 * Composable SEO universel pour gregoire-raturat.fr
 * Gère : meta tags, Open Graph, Twitter Card, JSON-LD, canonical, hreflang
 */

export interface SEOOptions {
    title?: string
    description?: string
    ogImage?: string
    twitterCard?: 'summary' | 'summary_large_image'
    noindex?: boolean
    canonical?: string
    keywords?: string[]
    jsonLd?: object
    author?: string
    locale?: string
    image?: string
    url?: string
    type?: 'website' | 'profile' | 'article'
}

const SITE_URL = 'https://gregoire-raturat.fr'
const SITE_NAME = 'Grégoire Raturat — Full Stack Developer'
const DEFAULT_DESCRIPTION =
    'Portfolio de Grégoire Raturat, développeur Full Stack spécialisé en Vue.js, Nuxt, Python et Node.js, basé à Lyon.'

export const useSEO = (options: SEOOptions = {}) => {
    const route = useRoute()

    // Configuration de base
    const config = {
        baseUrl: SITE_URL,
        author: 'Grégoire Raturat',
        defaultTitle: SITE_NAME,
        defaultDescription: DEFAULT_DESCRIPTION,
        defaultImage: '/og-image.jpg',
        email: 'gregoireraturatpro@gmail.com',
        city: 'Lyon',
        country: 'FR',
        github: 'https://github.com/Gregoire63',
        linkedin: 'https://www.linkedin.com/in/grégoire-raturat-b671091aa/',
    }

    // Construction des valeurs
    const title = options.title ? `${options.title} | ${config.author}` : config.defaultTitle
    const description = options.description || config.defaultDescription
    const ogImage = options.ogImage
        ? `${config.baseUrl}${options.ogImage}`
        : options.image || `${config.baseUrl}${config.defaultImage}`
    const canonical = options.canonical || options.url || `${config.baseUrl}${route.path}`
    const twitterCard = options.twitterCard || 'summary_large_image'
    const pageLocale = options.locale || 'fr'
    const pageType = options.type || 'website'

    // Meta tags
    const meta: any[] = [
        // Base
        { name: 'description', content: description },
        { name: 'author', content: options.author || config.author },
        { name: 'format-detection', content: 'telephone=no' },

        // Open Graph
        { property: 'og:type', content: pageType },
        { property: 'og:url', content: canonical },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: ogImage },
        { property: 'og:image:width', content: '1200' },
        { property: 'og:image:height', content: '630' },
        { property: 'og:image:alt', content: `${SITE_NAME} — aperçu` },
        { property: 'og:site_name', content: SITE_NAME },
        { property: 'og:locale', content: pageLocale === 'fr' ? 'fr_FR' : 'en_US' },
        { property: 'og:locale:alternate', content: pageLocale === 'fr' ? 'en_US' : 'fr_FR' },

        // Twitter Card
        { name: 'twitter:card', content: twitterCard },
        { name: 'twitter:url', content: canonical },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: ogImage },
        { name: 'twitter:image:alt', content: `${SITE_NAME} — aperçu` },

        // Thème navigateur
        { name: 'theme-color', content: '#8b6f5c' },
        { name: 'msapplication-TileColor', content: '#8b6f5c' },
    ]

    // Keywords
    if (options.keywords?.length) {
        meta.push({ name: 'keywords', content: options.keywords.join(', ') })
    }

    // Robots
    if (options.noindex) {
        meta.push({ name: 'robots', content: 'noindex, nofollow' })
    } else {
        meta.push({
            name: 'robots',
            content: 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1',
        })
    }

    // Links
    const link: any[] = [
        // Canonical
        { rel: 'canonical', href: canonical },

        // Hreflang (même URL, langue client-side)
        { rel: 'alternate', hreflang: 'fr', href: SITE_URL },
        { rel: 'alternate', hreflang: 'en', href: SITE_URL },
        { rel: 'alternate', hreflang: 'x-default', href: SITE_URL },

        // Favicons
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32x32.png' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16x16.png' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/site.webmanifest' },

        // Preconnect pour les fonts et Analytics
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'dns-prefetch', href: 'https://www.googletagmanager.com' },
    ]

    // Scripts (JSON-LD)
    const script: any[] = []

    // Schema personnalisé fourni dans les options
    if (options.jsonLd) {
        script.push({
            type: 'application/ld+json',
            children: JSON.stringify(options.jsonLd),
        })
    }

    // Schema Person pour la page d'accueil
    if (route.path === '/') {
        const personSchema = {
            '@context': 'https://schema.org',
            '@type': 'Person',
            '@id': `${SITE_URL}/#person`,
            name: config.author,
            jobTitle: 'Ingénieur Informatique Full Stack',
            url: config.baseUrl,
            image: ogImage,
            sameAs: [config.github, config.linkedin],
            description: config.defaultDescription,
            email: config.email,
            address: {
                '@type': 'PostalAddress',
                addressLocality: config.city,
                addressRegion: 'Auvergne-Rhône-Alpes',
                addressCountry: config.country,
            },
            knowsAbout: [
                'JavaScript',
                'TypeScript',
                'Vue.js',
                'Nuxt.js',
                'React',
                'Next.js',
                'Node.js',
                'Express.js',
                'Python',
                'PostgreSQL',
                'MongoDB',
                'Docker',
                'Git',
                'Full Stack Development',
            ],
            alumniOf: [
                {
                    '@type': 'EducationalOrganization',
                    name: 'ISITECH',
                    url: 'https://www.ecole-isitech.com/',
                },
            ],
            worksFor: {
                '@type': 'Organization',
                name: 'Systra',
            },
        }

        script.push({
            type: 'application/ld+json',
            children: JSON.stringify(personSchema),
        })

        // Website Schema
        const websiteSchema = {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: SITE_URL,
            name: SITE_NAME,
            description: DEFAULT_DESCRIPTION,
            inLanguage: ['fr-FR', 'en-US'],
            author: {
                '@id': `${SITE_URL}/#person`,
            },
        }

        script.push({
            type: 'application/ld+json',
            children: JSON.stringify(websiteSchema),
        })

        // Breadcrumb pour la navigation
        const breadcrumbSchema = {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
                {
                    '@type': 'ListItem',
                    position: 1,
                    name: 'Accueil',
                    item: config.baseUrl,
                },
            ],
        }

        script.push({
            type: 'application/ld+json',
            children: JSON.stringify(breadcrumbSchema),
        })
    }

    // Application des meta tags
    useHead({
        title,
        meta,
        link,
        script,
        htmlAttrs: {
            lang: pageLocale,
        },
    })

    // useSeoMeta pour meilleure compatibilité avec Nuxt 3
    useSeoMeta({
        title,
        ogTitle: title,
        description,
        ogDescription: description,
        ogImage,
        twitterCard,
        twitterTitle: title,
        twitterDescription: description,
        twitterImage: ogImage,
    })
}
