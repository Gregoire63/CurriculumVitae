# Héberger sa propre instance

Ce suivi est fait pour tourner **chez toi**, sur ton hébergement, avec ton compte
Anthropic. Il n'y a pas de compte à créer chez moi, pas de serveur central, pas de
données qui transitent ailleurs que chez toi.

L'architecture le permet parce qu'elle est mono-utilisateur *par instance* : un
passkey, un miroir, une boîte de propositions. Ce n'est pas une limite qu'on
contourne, c'est le modèle — chacun sa copie.

---

## Ce que tu obtiens

- Un suivi de séances et de nutrition qui vit dans le navigateur de ton téléphone.
  Aucune donnée ne quitte l'appareil tant que tu ne l'y autorises pas.
- Un connecteur MCP que **ton** Claude peut lire, et dans lequel il dépose des
  propositions que tu valides d'un tap. Il n'écrit jamais directement.
- Une sauvegarde chiffrée par le domaine (miroir côté serveur), qui sert aussi à
  changer de téléphone.

## Ce que ça demande

Un compte Netlify (l'offre gratuite suffit largement), un nom de domaine ou le
sous-domaine `.netlify.app`, et dix minutes.

---

## 1. Déployer

```bash
git clone <ce dépôt> mon-suivi
cd mon-suivi && npm install
```

Sur Netlify : « Add new site » → « Import an existing project ». La configuration
est déjà dans `netlify.toml` — commande `npm run build`, dossier `dist/`.

> **`npm run build`, jamais `nuxt generate`.** `generate` prérend tout en fichiers
> statiques : il n'y a alors aucun serveur, et les routes `server/api/**` n'existent
> pas. Le connecteur et la sauvegarde disparaissent sans message d'erreur.

## 2. Poser les variables

Dans Netlify → Site configuration → Environment variables.

### Obligatoires

| Variable | À quoi ça sert | Comment la fabriquer |
|---|---|---|
| `NUXT_VAULT_SECRET` | Signe les jetons de session et du connecteur | `openssl rand -base64 48` |
| `NUXT_VAULT_BOOTSTRAP` | Le code qui autorise à poser le **premier** passkey | Ce que tu veux, ≥ 8 caractères |

### Pour le connecteur Claude

| Variable | À quoi ça sert |
|---|---|
| `NUXT_MCP_CLIENT_ID` | Identifiant du client OAuth que tu donneras à Claude |
| `NUXT_MCP_CLIENT_SECRET` | Son secret |

Invente-les — ce sont **tes** identifiants, pas ceux d'un service tiers.
`openssl rand -hex 16` fait très bien l'affaire pour les deux.

### Facultative

| Variable | À quoi ça sert |
|---|---|
| `NUXT_OWNER_NAME` | Ton prénom, si tu préfères le décrire ici. **Ce n'est pas nécessaire** : l'application te le demande au moment de poser ton passkey, et tu peux le corriger ensuite depuis le profil sans redéployer. |

> Aucun secret ne doit entrer dans le dépôt. Tout se pose dans l'interface Netlify.

### Et le nom du compte Claude ?

On ne peut pas le récupérer. Le protocole MCP ne transporte **aucune identité
d'utilisateur** : le message `initialize` porte un `clientInfo`, qui est le nom du
*logiciel* client (« Claude »), pas celui de la personne. Le flux OAuth n'en
transporte pas davantage — c'est ton propre serveur qui émet les jetons, et il
décide seul de ce qu'il y met.

C'est donc l'application qui demande le prénom, au moment où l'on pose le passkey.
C'est le bon moment : c'est exactement là qu'on déclare que cette instance est la
sienne, et la fenêtre du système l'affiche dans la seconde qui suit.

## 3. Poser ton passkey

Ouvre `https://ton-domaine/sport` → onglet **Profil** → carte **Connecteur Claude**
→ « Poser un passkey ». On te demandera ton prénom (facultatif) et le
`NUXT_VAULT_BOOTSTRAP`.

Le prénom est rangé à côté du passkey, pas dans la configuration : il s'affiche dans
la fenêtre de ton téléphone, et dans ce que le connecteur raconte à Claude. Tu peux
le changer plus tard depuis la même carte — « renommer ».

**Une seule inscription est possible.** Une fois le passkey posé, la route
d'enregistrement se ferme — sans quoi n'importe qui passant sur le site pourrait s'en
créer un et lire tes données. Pour repartir de zéro (téléphone perdu), la même route
de remise à zéro demande le même code de démarrage.

## 4. Brancher Claude

Dans Claude → Paramètres → Connecteurs → « Ajouter un connecteur personnalisé » :

- URL : `https://ton-domaine/api/mcp`
- Identifiant client : ton `NUXT_MCP_CLIENT_ID`
- Secret client : ton `NUXT_MCP_CLIENT_SECRET`

Claude t'enverra sur une page d'autorisation servie par ton propre site, qui te
demandera ton passkey avant d'accorder quoi que ce soit.

> La liste des outils est mise en cache **à la connexion**. Après un déploiement qui
> change les outils, ouvre une nouvelle conversation ou rebranche le connecteur —
> sinon la session en cours continue de voir l'ancienne version.

---

## 5. Poids et pas

L'onglet **Profil** → carte **Poids et pas**.

**Sans aucun objet connecté, ça marche.** Tu saisis ton poids au réveil et tes pas si
tu les connais. C'est ce que faisaient les carnets, et ça suffit à tout calculer : le
métabolisme de base, la dépense du jour, la cible à manger. Laisser les pas vides
retombe sur une estimation tirée de ta semaine type.

### Brancher une balance

| Marque | État | Ce qu'il faut poser |
|---|---|---|
| **Withings** | Fonctionne | `NUXT_WITHINGS_CLIENT_ID`, `NUXT_WITHINGS_CLIENT_SECRET` |
| **Fitbit** | Écrit, **jamais déroulé en vrai** | `NUXT_FITBIT_CLIENT_ID`, `NUXT_FITBIT_CLIENT_SECRET` |
| **Garmin** | **Impossible aujourd'hui** | — |

Une marque dont les variables ne sont pas posées **ne s'affiche pas** dans l'écran.
C'est délibéré : un bouton « Connecter » qui rend une erreur se lit comme une panne,
et on cherche pendant dix minutes un problème qui n'existe pas.

**Withings** — crée une application sur
`https://developer.withings.com`, en indiquant comme URL de retour
`https://ton-domaine/api/withings/callback`. L'URL doit correspondre **exactement**.
Les jetons de chaque personne restent dans le navigateur de son téléphone ; le
serveur n'en conserve aucun.

**Fitbit** — crée une application sur `https://dev.fitbit.com/apps/new`. Type
« Personal » (c'est le seul qui donne accès aux données détaillées de ton propre
compte), URL de rappel `https://ton-domaine/api/fitbit/callback`, et coche les
autorisations **`weight`** et **`activity`** — sans elles l'API répond 403, et
réautoriser n'y changera rien.

> **Ce chemin n'a jamais été déroulé sur un vrai compte.** Les points d'entrée et
> les formats viennent de la documentation officielle, et le trajet reprend celui de
> Withings, éprouvé lui. Mais aucun compte développeur n'était disponible pour le
> tester de bout en bout : attends-toi à corriger un détail au premier essai. Les
> messages d'erreur sont écrits pour ça — ils distinguent « pas configuré » (501),
> « autorisations manquantes dans le portail » (403), « autorisation expirée » (401)
> et « Fitbit injoignable » (502). Si tu tombes sur l'un d'eux, il dit quoi regarder.

Un piège vérifié au passage : Fitbit décide des **unités** d'après l'en-tête
`Accept-Language`. Sans lui, les poids arrivent en livres — 91,5 kg devient 201,7, et
rien dans la réponse ne le signale. Le client force `fr_FR`.

**Garmin** — le programme développeur Garmin est **en pause** : le formulaire de
demande d'accès a été retiré et aucune date de réouverture n'est annoncée
(vérifié en août 2026). Personne ne peut obtenir d'identifiants, quel que soit le
code écrit ici. La fiche reste dans `lib/providers.ts` pour que la question ne se
repose pas tous les six mois.

### Ajouter une marque

Trois choses, et Fitbit sert de modèle complet :

1. une fiche dans `lib/providers.ts` — le nom, ce qu'elle fournit, les variables
   à poser — plus une fonction de conversion vers la forme de l'application ;
2. quatre routes dans `server/api/<marque>/` : `authorize`, `callback`, `claim`,
   `sync`. Recopie `server/api/fitbit/`, le trajet est le même pour tout le monde ;
3. un composable qui garde SES jetons et verse dans les magasins communs —
   `useWithings().adopt()` pour les pesées, `useNutrition().setSteps()` pour les pas.

Le point à ne pas rater est le troisième. Une marque qui se construit son propre
historique de poids donne deux séries du même chiffre : la courbe en choisit une, le
métabolisme de base l'autre, et l'écart se découvre des semaines plus tard. `adopt`
existe pour ça — dédoublonnage, quarantaine des pesées aberrantes et miroir vers le
module séances viennent avec.

---

## Ce qui reste à toi de régler

Le programme d'entraînement, le catalogue d'aliments et les semaines de menus livrés
sont **les miens**. Ce sont des valeurs de départ, pas du contenu figé : tout est
modifiable depuis l'application ou depuis une conversation avec Claude, et le livré
n'est jamais écrasé — tes modifications vivent à côté et fusionnent à la lecture.
Tu peux donc les remodeler sans toucher au code.

Deux exceptions : les semaines de menus « A » et « B » ne sont pas éditables (crée
les tiennes), et l'estimation de pas par défaut (3 500 en télétravail, 7 500 sur
site) correspond à mon rythme — elle est dans `lib/nutritionStats.ts`.

Enfin, ce dépôt est mon site personnel avec le suivi monté sur `/sport`. Si tu
comptes le partager, tu voudras probablement retirer les pages de portfolio.
