import { defineEventHandler, getQuery, sendRedirect } from 'h3'
import { exchangeCode } from './_client'

// Étape 2 : Withings nous renvoie un code, valable une trentaine de secondes.
// On l'échange immédiatement contre les jetons, puis on repasse la main au client.
export default defineEventHandler(async (event) => {
  const { code, state, error } = getQuery(event) as Record<string, string | undefined>
  const expected = getCookie(event, 'withings_state')
  deleteCookie(event, 'withings_state', { path: '/' })

  const back = (params: Record<string, string>) =>
    sendRedirect(event, `/sport?${new URLSearchParams(params).toString()}#withings`)

  if (error) return back({ withings: 'error', reason: error })
  if (!code) return back({ withings: 'error', reason: 'code_manquant' })
  if (!state || state !== expected) return back({ withings: 'error', reason: 'state_invalide' })

  try {
    const tokens = await exchangeCode(event, code, `${getRequestURL(event).origin}/api/withings/callback`)
    // Les jetons repartent au client, qui les garde avec le reste de ses données.
    // Application mono-utilisateur, sans base : le secret, lui, n'a jamais quitté le serveur.
    return back({
      withings: 'ok',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: String(Math.floor(Date.now() / 1000) + tokens.expires_in),
      userid: String(tokens.userid ?? ''),
    })
  }
  catch (e) {
    return back({ withings: 'error', reason: (e as Error).message.slice(0, 120) })
  }
})
