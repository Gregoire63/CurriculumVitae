import { readMirror, writeMirror } from '../../utils/vault'

/**
 * « Pourquoi ça ne marche pas ? » — répondu par le serveur lui-même.
 *
 * Sans ce point d'entrée, une variable oubliée ou un stockage injoignable se
 * manifestaient de la pire façon : l'écran affichait « Aucun passkey », c'est-à-dire
 * exactement ce qu'il affiche quand tout va bien mais qu'on n'a rien fait encore. On
 * cherchait alors du côté du navigateur un problème qui était côté serveur.
 *
 * Rien de sensible n'en sort : des booléens de PRÉSENCE, jamais une valeur. Savoir
 * qu'un secret est configuré n'aide personne à le deviner.
 */
export default defineEventHandler(async () => {
  const env = {
    NUXT_VAULT_SECRET: (process.env.NUXT_VAULT_SECRET || '').length >= 24,
    NUXT_VAULT_BOOTSTRAP: !!process.env.NUXT_VAULT_BOOTSTRAP,
    NUXT_MCP_CLIENT_ID: !!process.env.NUXT_MCP_CLIENT_ID,
    NUXT_MCP_CLIENT_SECRET: !!process.env.NUXT_MCP_CLIENT_SECRET,
  }
  const driver = process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT ? 'netlify-blobs' : 'fichier local'

  // On teste la LECTURE, jamais l'écriture : un diagnostic qui écrit peut casser ce
  // qu'il diagnostique. La lecture suffit à distinguer « stockage injoignable » de
  // « stockage vide », qui sont deux situations très différentes.
  let store = 'ok'
  try { await readMirror() }
  catch (e) { store = `erreur : ${e instanceof Error ? e.message : String(e)}`.slice(0, 160) }

  return {
    pret: Object.values(env).every(Boolean) && store === 'ok',
    env,
    store,
    driver,
  }
})
