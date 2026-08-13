import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'

// ─────────────────────────────────────────────────────────────────────────────
// Le coffre : ce que le serveur détient, et pourquoi il le détient.
// ─────────────────────────────────────────────────────────────────────────────
//
// Jusqu'ici l'application ne stockait RIEN côté serveur — c'était une propriété,
// pas un manque. Elle change ici pour une raison précise : un connecteur Claude est
// appelé depuis les serveurs d'Anthropic, jamais depuis le téléphone. Sans copie
// lisible côté serveur, il n'a rien à lire.
//
// Trois règles encadrent cette copie.
//
//  1. C'est un MIROIR, pas la source. Le téléphone reste la référence : il pousse
//     son instantané, le serveur l'accepte tel quel. Aucune fusion, donc aucun
//     conflit possible — le cas où deux copies divergent et où il faut arbitrer
//     n'existe pas.
//  2. Les écritures venant de Claude ne touchent JAMAIS le miroir. Elles vont dans
//     une file de PROPOSITIONS, que l'application montre à l'ouverture et qu'on
//     applique d'un geste. Une erreur d'interprétation coûte un refus, pas une
//     donnée perdue.
//  3. Rien n'est lisible sans authentification : le passkey pour l'application, un
//     jeton OAuth pour le connecteur.
//
// Le stockage est Netlify Blobs en production (rien à provisionner, rien à payer
// à cette échelle) et un dossier local en développement, derrière la même
// interface — pour que le code testé soit celui qui tourne.

export interface VaultProposal {
  id: string
  /** Quand Claude l'a déposée. */
  at: string
  /** L'outil qui l'a produite, pour savoir quoi appliquer côté application. */
  action: string
  /** Phrase lisible : c'est ce que l'utilisateur lira avant de valider. */
  summary: string
  /** Le détail, tel que l'application saura l'appliquer. */
  patch: Record<string, unknown>
  status: 'pending' | 'applied' | 'refused'
  resolvedAt?: string
}

export interface VaultMirror {
  /** Horodatage de l'instantané poussé par le téléphone. */
  at: string
  /** Version du format de l'export (celle de useWorkout). */
  version: number
  data: Record<string, unknown>
}

interface Store {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
}

const KEY_MIRROR = 'mirror.json'
const KEY_PROPOSALS = 'proposals.json'
const KEY_CREDENTIAL = 'credential.json'

/**
 * Netlify Blobs en production, dossier local sinon.
 *
 * Le repli n'est pas un gadget de confort : sans lui, rien de ce qui suit ne
 * serait exécutable ni testable hors déploiement, et on ne saurait qu'en
 * production si le coffre fonctionne.
 */
async function store(): Promise<Store> {
  if (process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT) {
    const { getStore } = await import('@netlify/blobs')
    const s = getStore({ name: 'gr-vault', consistency: 'strong' })
    return {
      get: key => s.get(key, { type: 'text' }) as Promise<string | null>,
      set: (key, value) => s.set(key, value),
    }
  }
  const dir = join(process.cwd(), '.data', 'vault')
  return {
    async get(key) {
      try { return await readFile(join(dir, key), 'utf8') }
      catch { return null }
    },
    async set(key, value) {
      const file = join(dir, key)
      await mkdir(dirname(file), { recursive: true })
      await writeFile(file, value, 'utf8')
    },
  }
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const raw = await (await store()).get(key)
  if (!raw) return fallback
  try { return JSON.parse(raw) as T }
  catch { return fallback }
}
const writeJson = async (key: string, value: unknown) => (await store()).set(key, JSON.stringify(value))

// ─── Miroir ──────────────────────────────────────────────────────────────────
export const readMirror = () => readJson<VaultMirror | null>(KEY_MIRROR, null)
export const writeMirror = (m: VaultMirror) => writeJson(KEY_MIRROR, m)

// ─── Propositions ────────────────────────────────────────────────────────────
export const readProposals = () => readJson<VaultProposal[]>(KEY_PROPOSALS, [])

/** Garde les 50 dernières : la file est une boîte de réception, pas un journal. */
const PROPOSAL_KEEP = 50

export async function addProposal(p: Omit<VaultProposal, 'id' | 'at' | 'status'>, now: string): Promise<VaultProposal> {
  const all = await readProposals()
  const created: VaultProposal = { ...p, id: randomBytes(8).toString('hex'), at: now, status: 'pending' }
  await writeJson(KEY_PROPOSALS, [...all, created].slice(-PROPOSAL_KEEP))
  return created
}

export async function resolveProposal(id: string, status: 'applied' | 'refused', now: string): Promise<boolean> {
  const all = await readProposals()
  const found = all.find(p => p.id === id)
  if (!found || found.status !== 'pending') return false
  found.status = status
  found.resolvedAt = now
  await writeJson(KEY_PROPOSALS, all)
  return true
}

// ─── Passkey enregistré ──────────────────────────────────────────────────────
export interface StoredCredential { id: string, publicKey: string, counter: number, at: string }
export const readCredential = () => readJson<StoredCredential | null>(KEY_CREDENTIAL, null)
export const writeCredential = (c: StoredCredential) => writeJson(KEY_CREDENTIAL, c)

// ─── Jetons signés ───────────────────────────────────────────────────────────
// Ni base de sessions, ni bibliothèque JWT : un seul utilisateur, un seul secret,
// et une signature HMAC suffit. Le jeton porte sa propre expiration ; le serveur
// n'a donc rien à retenir entre deux requêtes — ce qui est exactement ce qu'il
// faut sur des fonctions sans état qui peuvent démarrer à froid.

const b64u = (b: Buffer) => b.toString('base64url')

function secret(): string {
  const s = process.env.NUXT_VAULT_SECRET || ''
  if (!s || s.length < 24) throw new Error('NUXT_VAULT_SECRET manquant ou trop court (32 caractères minimum)')
  return s
}

export interface TokenPayload { sub: string, scope: string, exp: number, [k: string]: unknown }

export function signToken(payload: Omit<TokenPayload, 'exp'>, ttlSeconds: number, nowMs: number): string {
  const body = { ...payload, exp: Math.floor(nowMs / 1000) + ttlSeconds }
  const data = b64u(Buffer.from(JSON.stringify(body)))
  const sig = b64u(createHmac('sha256', secret()).update(data).digest())
  return `${data}.${sig}`
}

/**
 * Vérifie signature PUIS expiration, avec une comparaison à temps constant.
 *
 * L'ordre compte : lire le contenu avant d'avoir validé la signature, c'est faire
 * confiance à une chaîne fournie par l'appelant. Et `timingSafeEqual` plutôt que
 * `===` parce qu'une comparaison qui s'arrête au premier octet différent laisse
 * deviner la signature attendue, octet par octet.
 */
export function verifyToken(token: string | undefined | null, nowMs: number): TokenPayload | null {
  if (!token || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  if (!data || !sig) return null
  let expected: Buffer
  try { expected = createHmac('sha256', secret()).update(data).digest() }
  catch { return null }
  const given = Buffer.from(sig, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8')) as TokenPayload
    if (typeof payload.exp !== 'number' || payload.exp * 1000 < nowMs) return null
    return payload
  }
  catch { return null }
}

export const SESSION_COOKIE = 'gr-session'
export const SESSION_TTL = 60 * 60 * 24 * 30 // 30 jours : c'est un téléphone personnel
export const CHALLENGE_TTL = 60 * 5
export const CODE_TTL = 60 * 2
export const ACCESS_TTL = 60 * 60 * 24 * 90 // le connecteur ne doit pas se déconnecter tous les matins
