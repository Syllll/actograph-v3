# Monorepo et builds

ActoGraph est un monorepo **sans Yarn workspaces**. `api/`, `front/`, `mobile/`, `packages/core/` et `packages/graph/` ont leurs propres manifestes, dépendances et lockfiles. Il existe aussi un manifeste et un lockfile racine pour les scripts de commodité ; leur présence ne transforme pas le dépôt en workspace.

## Installer

Avec Node 20 et Yarn Classic 1.22, depuis la racine :

```bash
yarn install:all
```

Ce script installe core, graph, API, frontend et mobile. Pour travailler uniquement sur le bureau :

```bash
(cd packages/core && yarn install)
(cd packages/graph && yarn install)
(cd api && yarn install)
(cd front && yarn install)
yarn build:packages
```

Les références locales sont `file:../packages/core` depuis l'API/frontend/mobile, `file:../packages/graph` depuis le frontend/mobile et `file:../core` depuis graph. Éviter les exemples avec `cd ../api` exécuté depuis `packages/core` : ce chemin ne mène pas à l'API racine.

## Sources ou build compilé ?

| Consommateur | Résolution actuelle | Après modification des sources partagées |
|---|---|---|
| API | `api/tsconfig.json` pointe vers `../packages/core/dist` ; le runtime utilise le package compilé | Reconstruire core avant de relancer/recompiler l'API |
| Frontend web/Electron | Alias Vite `@actograph/core` et `@actograph/graph` vers `packages/*/src` | Rechargement des sources par Vite |
| Mobile | Alias Vite vers les sources des packages | Rechargement des sources par Vite |
| Build TypeScript de graph | Types de core compilés | Construire core avant graph |
| Consommateur externe sans alias | Champs `main`/`types` vers `dist` | Construire les packages et actualiser l'installation locale si nécessaire |

Les alias Vite sont déclarés dans `front/quasar.config.js` et `mobile/quasar.config.js` et restent actifs lors des builds. Ils ne basculent pas automatiquement vers `dist` en production. Le pipeline bureau construit néanmoins les deux packages avant l'API et Electron.

```bash
# Depuis la racine, dans cet ordre
yarn build:core
yarn build:graph

# Équivalent
yarn build:packages
```

Pour l'API, `yarn dev:core` dans un terminal permet de reconstruire core en watch. Si une installation `file:` locale garde une ancienne copie du package, actualiser aussi ses dépendances dans le consommateur ; vérifier la résolution locale avant de supprimer des caches.

## Commandes par sous-projet

| Dossier | Développement | Build | Tests |
|---|---|---|---|
| `api/` | `yarn start:dev-electron` pour SQLite bureau ; `yarn start:dev` pour web | `yarn build`, puis `yarn build:bundle` pour esbuild | `yarn test --runInBand` |
| `front/` | `yarn quasar dev -m electron` pour bureau ; `yarn dev` pour web | `yarn quasar build -m electron --publish never` pour bureau ; `yarn build` pour web | `yarn test --runInBand` |
| `mobile/` | `yarn dev`, `yarn dev:ios` | `yarn build`, `yarn build:ios` | Voir [README mobile](../mobile/README.md) |
| `packages/core/` | `yarn dev` | `yarn build` | `yarn test --runInBand` |
| `packages/graph/` | `yarn dev` | `yarn build` | `yarn test --runInBand` |

À la racine, `dev:api` et `dev:front` lancent le **mode web** des sous-projets. `build:front` lance également un build Quasar web, pas un installeur Electron. Pour le bureau, utiliser [le démarrage du README](../README.md#développer-lapplication-bureau) et :

```bash
bash scripts/build-electron.sh
```

Ce script prépare les dépendances, construit core puis graph et lance le build Electron. La compilation NestJS et le bundling de l'API sont orchestrés par le hook `beforeBuild` du frontend. Les modules natifs sont reconstruits pour la version Electron cible.

## Versions et configuration

La version bureau vient de `front/package.json` et `api/package.json`, synchronisés par `scripts/publish.sh`. Les deux manifestes mobiles avancent séparément. Le manifeste racine et les packages partagés conservent leur propre version ; ne pas les utiliser comme numéro de release bureau.

Le `tsconfig.json` racine exclut les sous-projets ; chaque application possède sa configuration TypeScript et son propre outillage. Les spécificités de ce clone priment sur celles du template IKB actuel (workspaces et autre ORM).

Voir [architecture](architecture.md), [build Electron](electron-desktop-build.md) et [publication](deployment.md).
