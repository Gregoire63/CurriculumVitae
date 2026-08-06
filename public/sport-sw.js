// Service worker scopé /sport — cache offline de l'outil de suivi.
// Le reste du site n'est pas affecté (scope limité au register()).
const CACHE = 'sport-v5'
const SHELL = '/sport'
const NAV_TIMEOUT_MS = 3000

// Ne met en cache que ce qui est réellement servable. Une réponse d'erreur ou
// une REDIRECTION mise en cache rendait /sport inaccessible durablement : servie
// à une navigation, la redirection repart sur la même URL, le SW la ressert…
// jusqu'à ERR_TOO_MANY_REDIRECTS, et le rechargement n'y changeait rien
// puisque la réponse fautive venait du cache.
function cacheable(res) {
  return !!res && res.ok && !res.redirected && res.type === 'basic'
}

function put(request, res) {
  if (!cacheable(res)) return
  const copy = res.clone()
  caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => { /* quota */ })
}

self.addEventListener('install', (e) => {
  // Un échec de mise en cache ne doit pas faire échouer l'installation, sinon le
  // SW ne s'active jamais et la page dépend d'un cache qui n'existera pas.
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => fetch(SHELL).then((res) => (cacheable(res) ? c.put(SHELL, res) : undefined)))
      .catch(() => { /* hors-ligne à l'install */ })
  )
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith('sport-') && k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Clic sur la notification de fin de repos : on ramène l'utilisateur sur /sport
self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes('/sport') && 'focus' in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow('/sport')
    })
  )
})

// Navigation : réseau d'abord, cache en repli. Le HTML référence des assets
// _nuxt dont le nom est haché ; servir un HTML périmé après un déploiement fait
// pointer la page vers des fichiers qui n'existent plus et l'app ne démarre pas.
// Le cache ne sert donc que hors-ligne, ou si le réseau traîne au-delà du délai.
function navigate(request) {
  return new Promise((resolve) => {
    let settled = false
    const done = (r) => { if (!settled) { settled = true; resolve(r) } }
    const fallback = () => caches.match(SHELL).then((cached) => (cached ? done(cached) : undefined))
    const timer = setTimeout(fallback, NAV_TIMEOUT_MS)
    fetch(request)
      .then((res) => {
        clearTimeout(timer)
        put(SHELL, res)
        done(res)
      })
      .catch(() => {
        clearTimeout(timer)
        caches.match(SHELL).then((cached) => done(cached || Response.error()))
      })
  })
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return

  if (e.request.mode === 'navigate') {
    e.respondWith(navigate(e.request))
    return
  }

  // Un build produit des noms hachés, donc immuables : le cache d'abord est sûr.
  // En développement, Vite sert les SOURCES sous leur vrai chemin
  // (/_nuxt/utils/monFichier.ts) : les mettre en cache fige l'application sur une
  // version morte, et un fichier renommé continue d'être servi après sa disparition.
  // On ne met donc jamais en cache un chemin qui ressemble à un fichier source.
  const isSource = /\.(?:ts|tsx|vue|jsx|mjs|css|scss)(?:\?|$)/.test(url.pathname + url.search)
  if (isSource) return

  // Assets (_nuxt, icônes, manifest) : cache d'abord, réseau en cas d'absence.
  // Le changement de version du cache suffit à repartir propre.
  if (url.pathname.startsWith('/_nuxt/') || url.pathname.startsWith('/sport/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached
        return fetch(e.request).then((res) => {
          put(e.request, res)
          return res
        })
      })
    )
  }
})
