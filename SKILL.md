---
name: suivi-seances
description: Travailler avec le suivi d'entraînement et de nutrition de Grégoire via son connecteur MCP maison. À utiliser dès qu'il parle de ses séances, charges, records, pesées, calories, repas, plats, courses, batch cooking, planning de salle, ou qu'il demande « fais-moi la semaine prochaine », « je ne peux pas aller à la salle », « où j'en suis au squat », « ma perte de poids est-elle au bon rythme ».
---

# Suivi séances — le connecteur de Grégoire

Application personnelle (Nuxt, PWA) de suivi d'entraînement et de nutrition, en
recomposition : **perdre du gras en gardant le muscle**. Le connecteur expose ses
données réelles.

## La règle qui prime sur tout

**Tu ne peux rien modifier.** `proposer_modification` dépose une proposition dans
une boîte de réception ; il la voit dans l'app (Profil → Connecteur), il valide ou
refuse. Ne dis jamais « c'est fait », dis « je te l'ai proposée, valide-la dans
l'app ».

Six formes de proposition s'appliquent d'un tap parce que l'app sait les vérifier.
Toute autre s'affichera, mais il devra la faire à la main — ne t'en sers que si
aucune forme fermée ne convient, et dis-le.

## Commence toujours par `etat`

Les données sont un **miroir** poussé par son téléphone, pas la source. Il peut
avoir plusieurs heures de retard. `etat` donne sa date : si elle est vieille de plus
d'une journée, dis-le avant de conclure, et propose-lui d'ouvrir l'app pour la
rafraîchir.

## Les outils

**Lire ses données** — `profil` (taille/sexe/année, semaine type, jours de salle et
de télétravail), `seances` (les dernières, filtrables par date), `exercice` (tout
l'historique d'un mouvement), `poids` (pesées et composition), `nutrition` (appelle
sans argument pour lister les rubriques, puis cible-en une).

**Lire les références** — `plats` (le catalogue : identifiants, noms, type de
créneau, conservation), `aliments` (les ingrédients : identifiants et macros pour
100 g), `programme` (séances, exercices, machines de remplacement avec leur
coefficient), `menus` (ses semaines de menus et à quel lundi elles sont appliquées).

**Atteindre n'importe quel champ** — `champ`. Sans argument il rend la carte de la
sauvegarde : les sections, leur taille, un exemple de chemin. Avec un chemin
(pointeur JSON, `/sessions/12/durationMin`) il rend la valeur et dit si elle est
modifiable. C'est le passage obligé avant toute correction de champ : il donne la
valeur exacte à mettre dans `de`.

**Proposer** — `proposer_modification`, `propositions` (l'historique des tiennes).

> **N'invente jamais un identifiant.** Un plat plausible mais inexistant est refusé
> par l'app, et une semaine entière tombe avec lui. Appelle `plats` avant de citer
> une recette, `aliments` avant de citer un ingrédient. Un ingrédient inventé est le
> pire des cas : il ne fait rien planter, il produit des macros fausses qui se
> propagent dans les calories, les courses et le déficit.

## Les formes de proposition applicables d'un tap

`plat` · `planning-seance` · `semaine` · `semaine-type` · `recette` · `correction`.
Chacune est décrite dans le schéma de `proposer_modification` — lis-le. Toute autre
forme (`autre`) s'affiche mais devra être faite à la main.

## Ce qu'il faut savoir de son programme

**Entraînement** — 4 séances : `s1` lundi (pecs/épaules/triceps), `s2` mardi
(dos/biceps + sprint), `s3` jeudi (jambes), `s4` vendredi (pecs/bras + sprint).
Mercredi, samedi, dimanche au repos. Il va à la salle **entre midi et 14 h**, se
lève à 8 h.

**Charges** — la progression est auto-régulée : ce sont les reps qui décident, le
ressenti (`facile` / `correct` / `dur` / `à l'échec`) qualifie. « À l'échec » veut
dire **avoir atteint l'échec musculaire**, pas avoir raté la série — ne le lis
jamais comme un échec.

**Machines** — quand une machine est prise, il en note une autre (`variant` dans
l'historique). Les charges de deux machines ne se comparent pas telles quelles :
chaque variante a un coefficient (V-Squat ×1,35, presse ×2,4, haltères ×0,9…),
donné par `programme`. Ses courbes sont déjà en « équivalent référence » ; ses
**records**, eux, restent par machine.

**Calories** — Mifflin-St Jeor + pas + dépense de séance (~440 kcal), moins un
déficit de 20 % borné entre 400 et 700 kcal. Un jour de salle vaut donc ~350 kcal
de plus qu'un jour de repos, et décale les repas : jour de salle 9 h / 9 h 05 /
11 h 45 (avant-séance) / 13 h 45 / 17 h / 20 h 30 / 22 h 30 ; jour de repos, pas
d'avant-séance et déjeuner à 12 h 30.

**Nutrition** — plats préparés en batch cooking, deux sessions de cuisine
(dimanche et mercredi) plus les plats « minute ». Chaque plat a une
`conservation_jours` : un plat qui se garde peu ne peut pas être cuisiné trois
jours à l'avance. **Il n'achète pas de maquereau** — la recette existe encore dans
la bibliothèque, ne la propose pas.

## Recettes de tâches

### « Fais-moi la semaine prochaine »

1. `etat`, puis `menus` (ce qui tourne déjà) et `plats` (les identifiants valides,
   avec `conservation_jours`).
2. `nutrition` → rubrique `eaten` et `picked` si tu veux savoir ce qu'il a
   réellement mangé ces jours-ci, pour ne pas répéter trois fois le même plat.
3. Compose **sept jours, lundi en premier**, avec au minimum `lunch` et `dinner`.
   Vise la variété des protéines sur la semaine, ne remets pas le même dîner deux
   jours de suite, et respecte les conservations.
4. Propose :

```json
{
  "resume": "Semaine du 17 août : 2 saumons, 3 dindes, un jour off samedi",
  "cible": "semaine",
  "detail": {
    "lundi": "2026-08-17",
    "nom": "Semaine du 17 août",
    "jours": [
      { "lunch": "boite-a", "dinner": "din-saumon" },
      { "lunch": "boite-b", "dinner": "din-poulet" },
      { "lunch": "boite-a", "dinner": "din-dinde" },
      { "lunch": "boite-c", "dinner": "din-saumon" },
      { "lunch": "boite-b", "dinner": "din-dinde" },
      { "off": true },
      { "lunch": "boite-a", "dinner": "din-dinde" }
    ]
  }
}
```

`lundi` **doit être un lundi**, il faut **exactement sept entrées**, et chaque jour
est soit `off: true`, soit rempli. Une fois validée, l'app crée une semaine nommée
et l'applique à partir de ce lundi — les semaines livrées ne sont pas écrasées.
Dis-lui d'ouvrir **Préparation** pour voir les sessions de cuisine et la liste de
courses qui en découlent.

### « Je ne peux pas aller à la salle vendredi »

Demande d'abord s'il veut annuler ou déplacer. Puis une proposition par date
touchée :

```json
{ "resume": "Vendredi 21 : pas de salle", "cible": "planning-seance",
  "detail": { "date": "2026-08-21", "vers": "repos" } }
{ "resume": "Samedi 22 : Pecs & Bras déplacée ici", "cible": "planning-seance",
  "detail": { "date": "2026-08-22", "vers": "s4" } }
```

Les calories des deux journées suivent automatiquement — dis-le, c'est le point
qui l'intéresse.

### « Change mon déjeuner de samedi »

```json
{ "resume": "Samedi 15 midi : Boîte B → Saumon, patate douce, épinards",
  "cible": "plat",
  "detail": { "date": "2026-08-15", "slot": "lunch", "vers": "din-saumon" } }
```

Créneaux valides : `pdj`, `creatine`, `pre`, `lunch`, `snack`, `dinner`, `night`.
`"vers": null` remet le plat prévu par le menu.

### « Ajoute cette recette »

1. `aliments` (avec `cherche` pour retrouver un ingrédient) — **ne devine aucun
   identifiant**.
2. Pèse les quantités en grammes, pour une portion.

```json
{ "resume": "Nouvelle recette : Saumon, riz, brocolis",
  "cible": "recette",
  "detail": { "nom": "Saumon riz brocolis", "kind": "diner", "batch": true,
              "steps": "Four 15 min à 200 °C, riz à part.",
              "items": [ { "food": "saumon", "g": 150 },
                         { "food": "riz-basmati", "g": 80 },
                         { "food": "brocolis", "g": 200 } ] } }
```

`kind` : `pdj`, `boite`, `diner`, `collation`, `sauce`. Pour **modifier** une
recette existante, ajoute son `id` — sans lui, tu en crées une nouvelle.

### « Change ma semaine type »

Différent d'une exception datée : ça vaut pour toutes les semaines à venir. Les
trois axes sont indépendants, n'envoie que celui qui change.

```json
{ "resume": "Semaine type : jambes le mercredi au lieu du jeudi",
  "cible": "semaine-type",
  "detail": { "seances": ["s1", "s2", "s3", null, "s4", null, null] } }
```

`salle` et `teletravail` prennent sept booléens, lundi en premier.

### « Corrige cette erreur dans mes données »

C'est la seule chose qui écrase une donnée qu'on ne pourra pas reconstituer. La
proposition doit donc porter **`de`** : la valeur actuellement enregistrée. Si elle
ne correspond pas à ce qui est stocké, l'app refuse — c'est ce qui empêche
d'écraser une correction déjà faite entre-temps sur le téléphone, ou une valeur
qu'on avait mal lue dans un miroir vieux de quelques heures.

**Lis la valeur d'abord** avec `exercice` ou `poids`. Ne la déduis jamais de la
conversation.

```json
{ "resume": "Oiseau, série 3 du 13 août : 425 kg → 42,5 kg (faute de frappe)",
  "cible": "correction",
  "detail": { "quoi": "serie", "exercice": "oiseau", "date": "2026-08-13",
              "serie": 2, "de": { "w": 425, "r": 8 }, "vers": { "w": 42.5, "r": 8 } } }

{ "resume": "Pesée du 12 août : 77,4 → 76,9 kg",
  "cible": "correction",
  "detail": { "quoi": "pesee", "date": "2026-08-12", "de": 77.4, "vers": 76.9 } }
```

`serie` est un **index à partir de 0**. `"vers": null` sur une pesée la supprime —
utile pour une saisie en double ou un chiffre aberrant qui tire les moyennes. Une
correction de série met à jour l'historique de l'exercice **et** le journal de
séance : les courbes et le journal ne peuvent pas diverger.

#### Tout le reste de la sauvegarde

`serie` et `pesee` couvrent les deux erreurs fréquentes. Pour n'importe quel autre
champ — la durée d'une séance, son nom, une note, un réglage du profil — il y a
`quoi: "champ"`, qui vise par pointeur JSON.

```json
{ "resume": "Séance du 10 août : durée 50 → 65 min",
  "cible": "correction",
  "detail": { "quoi": "champ", "chemin": "/sessions/12/durationMin",
              "de": 50, "vers": 65 } }
```

**Appelle `champ` avant.** Sans le chemin exact et la valeur exacte, la proposition
est refusée au dépôt — tu recevras l'erreur, pas Grégoire, mais c'est un aller-retour
perdu. `champ` sans argument donne la carte, `champ` avec un chemin donne la valeur.

Trois choses sont impossibles, et le serveur les refuse tout de suite :

- **créer un champ.** Le chemin doit exister de bout en bout ; une faute de frappe
  fabriquerait sinon une clé fantôme que rien ne lit ;
- **remplacer un objet ou une liste.** Seules les valeurs simples passent — nombre,
  texte, booléen, `null`. Réécrire une séance entière depuis une phrase, c'est
  exactement ce qu'on refuse depuis le début. Descends d'un cran ;
- **se tromper de `de`.** Le serveur compare à la valeur enregistrée et te rend
  celle qu'il a. Relis, repropose.

Une correction de champ touche **exactement** l'endroit visé, rien d'autre. C'est
pour ça que `serie` existe à part : une série vit à deux endroits, et seul `serie`
les tient ensemble.

### « Où j'en suis au squat ? »

`exercice` avec `id: "squat"`. Attention en lisant : une séance avec un `variant`
est sur une autre machine, ses kilos ne se comparent pas directement — applique le
coefficient donné par `programme`. Regarde aussi les reps à charge égale : gagner
une rep est une progression, même si la charge n'a pas bougé.

### « Ma perte de poids est-elle au bon rythme ? »

`poids`. Le repère raisonnable en recomposition est **0,5 à 0,7 % du poids de corps
par semaine** : plus vite, c'est du muscle qui part. Les pesées se font au lever, à
heure fixe ; une pesée isolée ne veut rien dire, raisonne sur la tendance de 7 à
14 jours.

## Comment lui répondre

En **français**, en t'appuyant sur ses chiffres réels plutôt que sur des
généralités — il a les données, c'est pour ça qu'il te les donne. Court et direct.
Quand tu proposes une modification, dis en une phrase ce qu'elle changera
concrètement (calories, heures de repas, courses), et rappelle qu'elle attend sa
validation dans l'app.
