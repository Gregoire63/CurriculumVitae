import { randomBytes } from 'node:crypto'

// ─────────────────────────────────────────────────────────────────────────────
// Savoir si la requête est arrivée jusqu'ici.
// ─────────────────────────────────────────────────────────────────────────────
//
// Le connecteur rend par intermittence une 502 « Bad gateway ». Deux explications
// tiennent, et elles n'ont pas le même remède : ou bien la requête n'atteint jamais
// cette fonction, ou bien elle l'atteint et quelque chose se passe mal en la
// servant. Impossible de trancher depuis la conversation — on n'y voit que l'échec.
//
// Ce module compte les appels au moment où ils entrent, AVANT l'authentification :
// une requête refusée reste une requête arrivée, et c'est cette distinction-là qui
// nous intéresse. `/api/vault/health` rend le compteur ; on tire n appels, on relit,
// et l'écart dit tout. Si le compteur suit le nombre d'appels envoyés, l'échec est
// ici. S'il ne bouge que pour les appels réussis, la requête n'est jamais arrivée.
//
// Tout est en MÉMOIRE, volontairement : pas un octet écrit, pas un aller-retour vers
// le stockage. Un diagnostic qui ajoute de la latence à ce qu'il mesure ne mesure
// plus rien. Le prix de ce choix est que le compteur repart de zéro à chaque
// démarrage — et c'est précisément la seconde information qu'on cherche, puisque
// `demarree_depuis_s` près de zéro à chaque appel signifierait des démarrages à
// froid en série.
//
// L'identifiant d'instance sert à lire le reste sans se tromper : le compteur n'a de
// sens que comparé à lui-même. Si deux relevés portent deux identifiants différents,
// ils viennent de deux processus et leurs compteurs ne se soustraient pas.

/** Tiré une fois par processus : deux relevés de même identifiant sont comparables. */
export const INSTANCE = randomBytes(3).toString('hex')

const bootedAt = Date.now()
let calls = 0
const recent: { a: string, m: string }[] = []

/** À appeler à l'entrée du gestionnaire MCP, avant toute vérification. */
export function noteCall(method: string, at: Date): void {
  calls++
  recent.push({ a: at.toISOString().slice(11, 19), m: method.slice(0, 40) })
  // Une fenêtre glissante courte : on veut les dernières minutes d'un test, pas un
  // journal. Ce qui déborde n'aurait servi qu'à faire grossir le processus.
  if (recent.length > 12) recent.shift()
}

export function trace(): Record<string, unknown> {
  return {
    instance: INSTANCE,
    demarree_depuis_s: Math.round((Date.now() - bootedAt) / 1000),
    appels_mcp: calls,
    derniers: [...recent],
  }
}
