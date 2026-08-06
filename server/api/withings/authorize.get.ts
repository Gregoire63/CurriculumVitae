import { defineEventHandler, getQuery, sendRedirect } from 'h3'

// Étape 1 du flux OAuth2 : on envoie l'utilisateur chez Withings.
// Le client_id n'est pas secret, mais on construit l'URL côté serveur pour que
// l'application n'ait qu'une seule source de vérité sur le redirect_uri — une
// divergence d'un caractère et Withings refuse l'échange, sans expliquer pourquoi.
export default defineEventHandler((event) => {
  const cfg = useRuntimeConfig(event)
  const clientId = cfg.withings?.clientId
  if (!clientId) {
    throw createError({ statusCode: 501, statusMessage: 'Withings non configuré : NUXT_WITHINGS_CLIENT_ID manquant.' })
  }

  const { origin } = getQuery(event) as { origin?: string }
  const base = origin || getRequestURL(event).origin
  // `state` protège du CSRF : Withings nous le renvoie tel quel, on le vérifie au retour.
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36)

  setCookie(event, 'withings_state', state, {
    httpOnly: true, sameSite: 'lax', secure: !import.meta.dev, path: '/', maxAge: 600,
  })

  const url = new URL('https://account.withings.com/oauth2_user/authorize2')
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', clientId)
  // user.metrics : pesées et composition. user.activity : les pas comptés par Health Mate.
  url.searchParams.set('scope', 'user.info,user.metrics,user.activity')
  url.searchParams.set('redirect_uri', `${base}/api/withings/callback`)
  url.searchParams.set('state', state)

  return sendRedirect(event, url.toString())
})
