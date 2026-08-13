import { session } from './_auth'
import { readCredential } from '../../utils/vault'

/** L'état de la connexion, pour que l'écran sache quoi proposer : enregistrer un
 *  passkey, se connecter, ou rien du tout. */
export default defineEventHandler(async (event) => ({
  connected: !!session(event),
  registered: !!(await readCredential()),
  bootstrapReady: !!process.env.NUXT_VAULT_BOOTSTRAP,
}))
