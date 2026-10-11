# API ActoGraph v3

Backend NestJS + TypeORM. Le mode principal est l'API SQLite locale de l'application Electron ; le mode web peut utiliser PostgreSQL. Le [README principal](../README.md) décrit Node 20, les `.env` et la préparation du clone.

## Développement bureau

Depuis `api/`, après installation des dépendances et build de `packages/core` :

```bash
yarn start:dev-electron
```

Ce script définit `DEV_ELECTRON=true`. Configurer `DB_TYPE=better-sqlite3` et `DB_NAME=data_dev/actograph.db` dans `api/.env` ; créer `api/data_dev/` avant le premier lancement. Le port vient de `BACKEND_DOCKER_APP_PORT_EXPOSED` (3236 dans l'exemple). TypeORM applique les migrations au démarrage (`migrationsRun: true`, `synchronize: false`).

L'API résout `@actograph/core` depuis `../packages/core/dist`. Après modification du core, le reconstruire avant de relancer l'API. Les commandes locales sont adaptées au bureau ; les conteneurs Docker sont utilisés pour le workflow web.

## Compiler et bundler

Pour préparer un bundle manuellement, depuis `api/` :

```bash
yarn generate:indexes
yarn build
yarn build:bundle
```

`build` compile NestJS puis réécrit les alias TypeScript. **`build:bundle` génère les index et lance esbuild sur `dist/src/main.js` ; il ne compile pas TypeScript.** Générer les index avant `build` garantit que les nouvelles entités et migrations sont présentes dans le code compilé.

Le résultat est `dist/api.bundle.js`. Le build Electron orchestre ces étapes via `front/quasar.config.js`, copie le bundle et reconstruit le driver natif `better-sqlite3` pour Electron. Le script racine `scripts/build-electron.sh` construit d'abord core puis graph. Voir [build Electron](../docs/electron-desktop-build.md).

## Entités et migrations

Créer les entités dans `src/**/entities/*.entity.ts` et les migrations dans `migrations/`. `scripts/generate-indexes.js` découvre ces fichiers et génère :

- `src/database/all-entities.ts`
- `src/database/all-migrations.ts`

Ne pas modifier ces index à la main. La découverte est exécutée explicitement par `generate:indexes`, `build:bundle` et le hook Electron ; un simple `yarn build` ne relance pas le générateur.

Depuis `api/`, pour générer une migration sur la base configurée :

```bash
yarn generate:indexes
yarn migration:generate migrations/NomDeLaMigration
yarn generate:indexes
```

La génération compare les entités au schéma de la base courante ; préparer la connexion et vérifier le contenu de la migration. Reconstruire ensuite l'API si elle doit être bundlée.

## Commandes

| Commande | Description |
|---|---|
| `yarn start:dev` | Développement web NestJS |
| `yarn start:dev-electron` | Développement API bureau séparée |
| `yarn generate:indexes` | Régénération des index TypeORM |
| `yarn build` | Compilation NestJS et réécriture des alias |
| `yarn build:bundle` | Index et esbuild, à partir du `dist` déjà compilé |
| `yarn migration:run` | Exécution des migrations sur la base configurée |
| `yarn migration:revert` | Retour de la dernière migration, à utiliser avec précaution |
| `yarn test --runInBand` | Tests Jest |

## Exécution dans l'installeur

Electron lance le bundle avec `--subprocess`, le port, le chemin `.env` et le dossier `userData`. L'API utilise alors `userData/actograph.sqlite`, écoute sur la boucle locale et exige le secret de session fourni par Electron. Elle signale sa disponibilité par IPC et accepte un arrêt coordonné pour fermer Nest/SQLite.

Les modules natifs sont externalisés du bundle. Un binaire installé pour Node sur l'hôte ne suffit pas : le build doit reconstruire `better-sqlite3` pour l'ABI Electron et l'architecture cible. Les builds officiels injectent le validateur PKV privé avant compilation ; un build public local utilise les bouchons. Voir [architecture](../docs/architecture.md) et [validation des licences](../docs/license-validation.md).
