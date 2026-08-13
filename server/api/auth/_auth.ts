import type { H3Event } from 'h3'
import { SESSION_COOKIE, SESSION_TTL, verifyToken } from '../../utils/vault'

// Ce qui identifie « le site » aux yeux d'un passkey.
//
// Un passkey est lié à un DOMAINE, et c'est toute sa force : il ne peut pas être
// rejoué ailleurs, donc un site qui imite celui-ci n'obtiendra jamais de signature
// valide. Encore faut-il que le domaine soit lu de la requête et non écrit en dur —
// sinon le développement local et la production ne peuvent pas coexister.

/** Le domaine, sans le port : c'est ce que la spécification WebAuthn appelle le RP ID. */
export function rpId(event: H3Event): string {
  return (getRequestHost(event) || 'localhost').split(':')[0]
}

/** L'origine complète, port compris — elle, doit correspondre exactement. */
export function origin(event: H3Event): string {
  return getRequestURL(event).origin
}

export const RP_NAME = 'Suivi séances — Grégoire'

/** La session du téléphone, ou `null`. Aucune requête protégée ne s'en passe. */
export function session(event: H3Event, nowMs = Date.now()) {
  const token = getCookie(event, SESSION_COOKIE)
  const payload = verifyToken(token, nowMs)
  return payload && payload.scope === 'app' ? payload : null
}

export function setSession(event: H3Event, token: string) {
  setCookie(event, SESSION_COOKIE, token, {
    httpOnly: true, // hors de portée du JavaScript : une faille XSS ne l'emporte pas
    secure: !import.meta.dev,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  })
}

export function clearSession(event: H3Event) {
  deleteCookie(event, SESSION_COOKIE, { path: '/' })
}

/** Refuse proprement plutôt que de laisser filer une requête non authentifiée. */
export function requireSession(event: H3Event) {
  const s = session(event)
  if (!s) throw createError({ statusCode: 401, statusMessage: 'Session requise' })
  return s
}
