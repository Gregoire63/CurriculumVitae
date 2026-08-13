# Mise en route du connecteur — la marche à suivre

Neuf étapes, dans cet ordre. Chacune indique **comment savoir qu'elle a marché**.

---

## 1. Applique les patches, dans l'ordre

```bash
git apply connecteur-v33.patch      # le coffre, le passkey, le serveur MCP
git apply semaine-v34.patch         # les outils de référence, la semaine entière
git apply donnees-v35.patch         # recettes, semaine type, corrections
git apply mise-en-route-v36.patch   # diagnostic serveur + reposer un passkey
npm install                         # v33 ajoute 3 dépendances
```

Si tu as déjà appliqué certains d'entre eux, saute-les. **Zip ou patch, jamais les
deux.**

✅ `npm run build` passe.

## 2. Vérifie la commande de build Netlify

Elle doit être **`nuxt build`**, jamais `nuxt generate`. Tout le connecteur repose
sur des routes serveur ; en `generate` elles n'existent pas et tout répond 404.

✅ Site settings → Build & deploy → Build command = `nuxt build`.

## 3. Pose les quatre variables d'environnement

Site settings → Environment variables :

| Variable | Valeur |
|---|---|
| `NUXT_VAULT_SECRET` | `GCLaSdTsaTxAMTFh0iQ7mfJz_fqdOaH6Dxl_X1GBZeY` |
| `NUXT_VAULT_BOOTSTRAP` | `eC-EXvJZ0EDs` |
| `NUXT_MCP_CLIENT_ID` | `claude-connector` |
| `NUXT_MCP_CLIENT_SECRET` | `WOqdU4_Vu8piLmjpDcDQq3sPng2m6FHd` |

Ce sont les valeurs générées dans le A-LIRE de la v33. **Régénère-les** si tu
préfères (`openssl rand -base64 32`), mais garde-les identiques entre Netlify et ce
que tu colleras dans Claude.

Netlify Blobs n'a rien à provisionner : c'est actif par défaut.

⚠️ **Ne supprime pas `NUXT_VAULT_BOOTSTRAP` après l'installation.** C'est ton double
des clés : si tu perds ton téléphone, c'est le seul moyen de reposer un passkey.

## 4. Déploie, puis ouvre cette adresse

```
https://gregoire-raturat.fr/api/vault/health
```

✅ Tu dois lire `"pret": true` et `"store": "ok"`. Si une variable manque, elle est
nommée là. Si le stockage ne répond pas, le message d'erreur est là aussi.

C'est le point de contrôle le plus important : tout ce qui suit en dépend, et sans
lui une variable oubliée se manifesterait par « Aucun passkey », c'est-à-dire
exactement ce qu'affiche une installation saine où l'on n'a rien fait.

## 5. Pose ton passkey — depuis ton téléphone

Ouvre l'app **sur gregoire-raturat.fr** (pas en local : un passkey est lié au
domaine). **Profil → Connecteur Claude**, colle le code de démarrage, touche
« Enregistrer mon passkey », valide avec ton visage ou ton empreinte.

✅ Le libellé passe à **Déverrouillé**, et « Miroir des données » affiche
« à l'instant ». L'étape se referme : personne d'autre ne peut poser de passkey.

## 6. Ajoute le connecteur dans l'app Claude

Customize → Connectors → **Add custom connector** :

- URL : `https://gregoire-raturat.fr/api/mcp`
- Advanced settings → OAuth Client ID : `claude-connector`
- OAuth Client Secret : celui du tableau

## 7. Autorise

Claude ouvre une page servie par ton site. Deux cas :

- **Tu y es déjà déverrouillé** → « Autoriser Claude », tu touches Autoriser.
- **Sinon** → « Déverrouille d'abord », un bouton passkey, puis la page se recharge
  et propose Autoriser.

✅ Retour dans Claude, le connecteur est marqué connecté. Valable 90 jours.

> Si la page s'ouvre sur un appareil où ton passkey n'est pas disponible, utilise
> celui où tu l'as créé — ou laisse iCloud / Google le synchroniser.

## 8. Active-le dans la conversation

Bouton **+** dans le chat → **Connectors** → coche `suivi-seances`. C'est par
conversation, pas une fois pour toutes.

## 9. Ajoute le skill

Le `SKILL.md` livré avec la v35. Sans lui je découvre les outils un par un et je
risque d'inventer un identifiant de plat ; avec lui je sais quoi appeler, dans quel
ordre, et quelles sont tes contraintes.

---

## Le test qui prouve que tout marche

Depuis l'app Claude de ton téléphone :

> « Regarde mes données de suivi : de quand date le miroir, et quelle a été ma
> dernière séance ? »

✅ Je dois te répondre avec une date et le nom d'une vraie séance. Si j'ai un doute
sur la fraîcheur, ouvre l'app une fois — le miroir repart à chaque ouverture.

Puis, pour vérifier l'écriture :

> « Change mon déjeuner de samedi pour le saumon. »

✅ Je dépose une proposition, et elle apparaît dans **Profil → Connecteur →
Propositions**. Rien n'est écrit tant que tu ne touches pas Appliquer.

---

## Si ça ne marche pas

| Symptôme | Cause la plus probable |
|---|---|
| `/api/vault/health` répond 404 | build en `nuxt generate` au lieu de `nuxt build` |
| `"pret": false` | une variable manquante — elle est nommée dans la réponse |
| Bandeau rouge dans l'app | idem, le détail y est écrit |
| « Aucun passkey » alors que tu l'as posé | tu l'avais posé sur un autre domaine (localhost) |
| Claude dit « aucune donnée » | le miroir n'est jamais parti : ouvre l'app, Profil → ⬆ Envoyer maintenant |
| Le connecteur refuse de se connecter | `client_id` / `client_secret` différents entre Netlify et Claude |
| Téléphone perdu | Profil → Connecteur → « Téléphone perdu ? » + code de démarrage |
