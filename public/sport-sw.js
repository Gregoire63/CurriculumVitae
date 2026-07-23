// Service worker scopé /sport — cache offline de l'outil de suivi.
// Le reste du site n'est pas affecté (scope limité au register()).
const CACHE = 'sport-v2'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/sport'])))
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

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url)
  if (e.request.method !== 'GET' || url.origin !== location.origin) return

  // Navigation vers /sport : network-first, fallback cache (offline)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put('/sport', copy))
          return res
        })
        .catch(() => caches.match('/sport'))
    )
    return
  }

  // Assets (_nuxt, icônes, manifest) : stale-while-revalidate
  if (url.pathname.startsWith('/_nuxt/') || url.pathname.startsWith('/sport/')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        const network = fetch(e.request)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone()
              caches.open(CACHE).then((c) => c.put(e.request, copy))
            }
            return res
          })
          .catch(() => cached)
        return cached || network
      })
    )
  }
})
