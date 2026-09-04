// Pierre tombale du service worker de /sport.
//
// L'application a déménagé sur son propre domaine, et netlify.toml redirige
// désormais /sport. Mais une redirection ne suffit pas à retirer une PWA d'un
// téléphone : le service worker installé depuis l'ancienne adresse contrôle
// toujours /sport et sert l'app DEPUIS SON CACHE, sans jamais toucher au réseau.
// Supprimer ce fichier ne l'aurait pas désinstallé non plus — il aurait continué
// à tourner sur le cache d'un site qui n'existe plus.
//
// Ce fichier reste donc en place, vidé de tout : le navigateur le re-télécharge
// à la première navigation (il vérifie toujours le script du SW), voit qu'il a
// changé, l'active — et cette version-là se désinstalle, purge ses caches et
// renvoie les fenêtres ouvertes sur le réseau, où la redirection les attend.
//
// À supprimer quand plus aucun appareil ne l'a en mémoire. Sans urgence : le
// fichier ne coûte rien, et rien ne dit quel téléphone garde encore un raccourci.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    (async () => {
      // Uniquement les caches de l'ancienne app : le reste du site n'est pas à nous.
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k.startsWith('sport-')).map((k) => caches.delete(k)))

      await self.registration.unregister()

      // Les fenêtres déjà ouvertes restent contrôlées jusqu'à leur prochaine
      // navigation : on la provoque, sinon l'utilisateur reste sur une page morte.
      const clients = await self.clients.matchAll({ type: 'window' })
      for (const c of clients) {
        if ('navigate' in c) c.navigate(c.url).catch(() => {})
      }
    })(),
  )
})

// Aucun gestionnaire `fetch` : les requêtes partent au réseau, et la redirection
// 301 de netlify.toml fait le reste.
