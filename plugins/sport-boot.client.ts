// Sur /sport (rendu SPA), on cède 2 frames au navigateur AVANT le montage de
// l'app : il peut alors peindre l'écran de chargement et démarrer l'animation de
// l'anneau sur le compositeur, avant le rendu (lourd) de l'app. Sans ça, sur une
// machine rapide, le JS peut bloquer le thread avant que l'animation ne soit
// « committée » → anneau figé. Coût : ~2 frames (~32 ms), uniquement sur /sport.
export default defineNuxtPlugin(async () => {
  if (!import.meta.client) return
  if (location.pathname.replace(/\/+$/, '') !== '/sport') return
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
})
