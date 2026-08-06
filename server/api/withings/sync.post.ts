import { api, refreshTokens } from './_client'
import type { Tokens } from './_client'

// Récupère pesées + activité. Le navigateur envoie ses jetons, le serveur les
// rafraîchit si besoin et renvoie les nouveaux : le client_secret ne sort jamais d'ici.
//
// Pas de base de données côté serveur : les jetons vivent dans le localStorage du
// téléphone, comme le reste de l'appli sport. C'est aussi pour ça qu'il n'y a pas de
// webhook Withings — un webhook a besoin d'un serveur qui stocke, sinon il n'a
// personne à prévenir. La synchro se fait donc à l'ouverture de l'appli, ce qui suffit
// largement pour une pesée par jour.

interface Body {
  accessToken?: string
  refreshToken?: string
  /** epoch (s) : ne redemande que ce qui est plus récent. */
  since?: number
}

interface MeasResponse {
  updatetime: number
  timezone: string
  measuregrps: { date: number, measures: { value: number, type: number, unit: number }[] }[]
}

interface ActivityResponse {
  activities: { date: string, steps?: number, distance?: number, calories?: number, totalcalories?: number }[]
}

const day = 86400
const isoOf = (t: number) => new Date(t * 1000).toISOString().slice(0, 10)

export default defineEventHandler(async (event) => {
  const body = await readBody<Body>(event)
  if (!body?.accessToken && !body?.refreshToken) {
    throw createError({ statusCode: 400, statusMessage: 'Aucun jeton fourni : reconnecte le compte Withings.' })
  }

  const nowSec = Math.floor(Date.now() / 1000)
  // 90 jours par défaut : assez pour tracer une tendance dès la première synchro.
  const since = body.since && body.since > 0 ? body.since : nowSec - 90 * day

  let access = body.accessToken ?? ''
  let renewed: Tokens | null = null

  // Le jeton Withings vit 3 h. Plutôt que de suivre son expiration côté client
  // (horloge du téléphone, décalages, mise en veille), on tente et on rafraîchit
  // sur échec : une requête perdue de temps en temps contre zéro état à maintenir.
  async function withRetry<T>(run: (token: string) => Promise<T>): Promise<T> {
    try {
      return await run(access)
    }
    catch (err) {
      if (!body.refreshToken) throw err
      renewed = await refreshTokens(event, body.refreshToken)
      access = renewed.access_token
      return await run(access)
    }
  }

  const meas = await withRetry(t => api<MeasResponse>('/measure', t, {
    action: 'getmeas',
    meastypes: '1,5,6,8,11,76,77,88',
    category: '1',
    lastupdate: String(since),
  }))

  // getactivity veut des dates, pas des epochs.
  const activity = await withRetry(t => api<ActivityResponse>('/v2/measure', t, {
    action: 'getactivity',
    startdateymd: isoOf(since),
    enddateymd: isoOf(nowSec),
    data_fields: 'steps,distance,calories,totalcalories',
  })).catch(() => ({ activities: [] } as ActivityResponse))

  return {
    groups: meas.measuregrps ?? [],
    timezone: meas.timezone ?? null,
    updatetime: meas.updatetime ?? nowSec,
    activity: activity.activities ?? [],
    // Non nul uniquement si les jetons ont été renouvelés : le client les réécrit alors.
    tokens: renewed
      ? { accessToken: (renewed as Tokens).access_token, refreshToken: (renewed as Tokens).refresh_token, expiresIn: (renewed as Tokens).expires_in }
      : null,
  }
})
