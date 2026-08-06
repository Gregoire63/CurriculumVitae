import type { H3Event } from 'h3'

// Appels signés vers Withings. Isolés ici parce qu'ils manipulent le client_secret :
// tout ce fichier doit rester hors du bundle client.

const TOKEN_URL = 'https://wbsapi.withings.net/v2/oauth2'
const API_URL = 'https://wbsapi.withings.net'

export interface Tokens {
  access_token: string
  refresh_token: string
  expires_in: number
  userid?: number
}

function creds(event: H3Event) {
  const cfg = useRuntimeConfig(event)
  const clientId = cfg.withings?.clientId
  const clientSecret = cfg.withings?.clientSecret
  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 501, statusMessage: 'Withings non configuré : NUXT_WITHINGS_CLIENT_ID et NUXT_WITHINGS_CLIENT_SECRET sont requis.' })
  }
  return { clientId, clientSecret }
}

/**
 * Withings renvoie toujours HTTP 200 : le vrai statut est dans `status` du corps.
 * Traiter la réponse comme réussie parce que le code HTTP est 200 fait passer les
 * erreurs de jeton pour des données vides, et le bug devient introuvable.
 */
async function call<T>(url: string, body: Record<string, string>): Promise<T> {
  const res = await $fetch<{ status: number, body?: T, error?: string }>(url, {
    method: 'POST',
    body: new URLSearchParams(body).toString(),
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  if (res.status !== 0) {
    throw createError({ statusCode: 502, statusMessage: `Withings status ${res.status}: ${res.error ?? 'erreur inconnue'}` })
  }
  return res.body as T
}

export function exchangeCode(event: H3Event, code: string, redirectUri: string) {
  const { clientId, clientSecret } = creds(event)
  return call<Tokens>(TOKEN_URL, {
    action: 'requesttoken',
    grant_type: 'authorization_code',
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  })
}

export function refreshTokens(event: H3Event, refreshToken: string) {
  const { clientId, clientSecret } = creds(event)
  return call<Tokens>(TOKEN_URL, {
    action: 'requesttoken',
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  })
}

/** Appel authentifié à l'API de données. */
export async function api<T>(path: string, accessToken: string, params: Record<string, string>): Promise<T> {
  const res = await $fetch<{ status: number, body?: T, error?: string }>(`${API_URL}${path}`, {
    method: 'POST',
    body: new URLSearchParams(params).toString(),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${accessToken}`,
    },
  })
  if (res.status !== 0) {
    throw createError({ statusCode: 502, statusMessage: `Withings status ${res.status}: ${res.error ?? 'erreur inconnue'}` })
  }
  return res.body as T
}
