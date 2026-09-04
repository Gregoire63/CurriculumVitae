# gregoire-raturat.fr

Portfolio de Grégoire Raturat, développeur full-stack à Lyon.
Nuxt 4, déployé sur Netlify à l'adresse <https://gregoire-raturat.fr>.

## Démarrer

```bash
nvm use          # Node 22.12 (cf. .nvmrc)
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # build Nitro (Netlify) — « / » est prérendue
npm run preview  # sert le build local
```

## Ce qu'il y a dans le dépôt

Une seule page. `pages/index.vue` empile les sections, chacune dans son composant
`components/Portfolio*.vue` : héro, études de cas, autres projets, parcours,
formation, compétences, contact.

Tout sauf le héro et la navigation est monté en `Lazy…` avec `hydrate-on-visible`
(ou `hydrate-when` pour les modales). Les sections sont rendues côté serveur comme
les autres — c'est l'hydratation qui attend d'être utile. Une page de 7 sections
qui s'hydratent toutes au chargement paie l'intégralité de son JavaScript avant
que le visiteur ait fait défiler quoi que ce soit.

`stores/portfolio.ts` (Pinia) tient l'état partagé : langue FR/EN, section active,
modales, progression du défilement. Le contenu des sections y vit aussi — projets,
expériences, compétences — plutôt que dans les templates : c'est ce qui rend la
version anglaise possible sans dupliquer le balisage.

`components/CustomCursor.vue` remplace le curseur système, d'où le
`cursor: none !important` global dans `app.vue`.

## Détails qui se remarquent quand on y touche

**Le formulaire de contact passe par Netlify Forms** (`data-netlify="true"`), pas
par un service tiers. Il n'est détecté qu'à partir du HTML **déployé** : il faut
donc que « / » reste prérendue, sinon le formulaire disparaît côté Netlify sans
que rien ne casse à l'écran. `public/contact.html` est la page de confirmation.

**Les images passent par `ipxStatic`**, pas `ipx` : les variantes sont fabriquées
au build et servies comme des fichiers statiques. `ipx` embarquait sharp et
libvips dans le bundle serveur — 38 Mo sur 48 — pour une photo de 20 Ko déjà en
WebP.

**Les polices sont en `display: optional`**, imposé jusque dans un petit plugin
PostCSS de `nuxt.config.ts` qui réécrit les `swap` que `@nuxt/fonts` génère. Pas
de saut de texte au chargement ; une police qui arrive trop tard est simplement
ignorée pour cette visite.

**`useSEO()`** (dans `composables/`) produit les meta, l'Open Graph, le canonical
et le JSON-LD. L'URL du site y est écrite en dur — il n'y a pas de
`runtimeConfig` à renseigner, et rien à configurer pour lancer le projet.

## L'application de suivi a déménagé

Ce dépôt a longtemps hébergé, sous `/sport`, une application de suivi
d'entraînement et de nutrition. Elle vit désormais dans son propre dépôt
(`damn-claude`) et sur son propre domaine.

`netlify.toml` redirige `/sport` et `/sport/*` en 301, et `public/sport-sw.js`
est conservé, vidé : c'est ce qui désinstalle le service worker resté sur les
appareils où la PWA avait été ajoutée à l'écran d'accueil. Les deux sont là pour
les anciens raccourcis, pas pour le site.

## Licence

MIT — voir [LICENSE](LICENSE).
