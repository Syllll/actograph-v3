# Build Electron / Application Desktop

Ce document décrit l'architecture du build de l'application ActoGraph v3 pour la distribution desktop (Windows, macOS, Linux).

## Vue d'ensemble

L'application desktop embarque une API NestJS bundlée qui s'exécute en arrière-plan. Cette architecture permet :

- **Installation rapide** : ~150 fichiers au lieu de ~50 000
- **Démarrage instantané** : Pas d'extraction de fichiers au premier lancement
- **Taille réduite** : ~20-30 MB au lieu de ~150-200 MB

## Architecture du bundling

### Schéma global

```
┌─────────────────────────────────────────────────────────────────┐
│                        BUILD PROCESS                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  api/src/**/*.ts                                                │
│       │                                                         │
│       ▼                                                         │
│  ┌────────────────┐    ┌─────────────────────┐                 │
│  │  nest build    │───▶│  dist/src/**/*.js   │                 │
│  └────────────────┘    └─────────────────────┘                 │
│                                   │                             │
│                                   ▼                             │
│                        ┌─────────────────────┐                 │
│                        │  esbuild bundle     │                 │
│                        └─────────────────────┘                 │
│                                   │                             │
│                                   ▼                             │
│                        ┌─────────────────────┐                 │
│                        │  api.bundle.js      │ (~5-10 MB)      │
│                        └─────────────────────┘                 │
│                                                                 │
│  + node_modules/better-sqlite3 (prebuilds natifs)              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    STRUCTURE FINALE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  resources/src-electron/extra-resources/api/                    │
│  ├── api.bundle.js          # Bundle unique de l'API           │
│  ├── .env                   # Configuration                     │
│  └── node_modules/                                              │
│      └── better-sqlite3/    # Module natif avec prebuilds      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Choix techniques

| Problème | Solution |
|----------|----------|
| Packages natifs lents à installer | Remplacé `bcrypt` par `bcryptjs` (pur JS) |
| Driver SQLite natif | Remplacé `sqlite3` par `better-sqlite3` (prebuilds inclus) |
| 50 000+ fichiers à installer | Bundle esbuild → 1 fichier + modules natifs |
| Glob patterns cassés après bundling | Index explicites (all-entities.ts, all-migrations.ts) |
| Extraction ZIP lente au premier lancement | Plus de ZIP, démarrage instantané |

## Flux de build

### Étapes du build (quasar.config.js)

```
1. yarn install (api/)
   └─▶ Installation des dépendances

2. generate-indexes.js
   └─▶ Génère all-entities.ts et all-migrations.ts

3. nest build
   └─▶ Compile TypeScript → JavaScript

4. esbuild (api.bundle.js)
   └─▶ Bundle tout en un fichier, externalise better-sqlite3

5. Copie du bundle
   └─▶ front/src-electron/extra-resources/api/api.bundle.js

6. Installation production des modules natifs
   └─▶ yarn install --production (better-sqlite3 uniquement)

7. Copie des node_modules natifs
   └─▶ front/src-electron/extra-resources/api/node_modules/
```

### Commandes de build

```bash
# Build complet Electron (déclenche tout le processus)
cd front && quasar build -m electron

# Build manuel de l'API bundlée
cd api
yarn generate:indexes    # Génère les index d'entités/migrations
yarn build              # Compile TypeScript
yarn build:bundle       # Génère le bundle esbuild
```

## Flux d'exécution en production

### Séquence de démarrage

```
┌─────────────────────────────────────────────────────────────────┐
│                    DÉMARRAGE APPLICATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Utilisateur lance ActoGraph-v3                              │
│     └─▶ Electron démarre                                        │
│                                                                 │
│  2. electron-main.ts                                            │
│     └─▶ fork('api.bundle.js', args)                            │
│         args: ['--subprocess', port, envPath, dbPath]           │
│                                                                 │
│  3. api.bundle.js s'exécute                                     │
│     ├─▶ mode.ts: détecte '--subprocess' → mode 'electron'      │
│     ├─▶ typeorm.config.ts: charge .env                         │
│     ├─▶ DB_TYPE=better-sqlite3                                 │
│     └─▶ require('better-sqlite3') résolu localement            │
│                                                                 │
│  4. TypeORM se connecte                                         │
│     └─▶ Base: {userData}/actograph.sqlite                      │
│                                                                 │
│  5. Serveur NestJS démarre                                      │
│     └─▶ Console: "*** App server starting... ***"              │
│                                                                 │
│  6. electron-main.ts détecte le message                         │
│     └─▶ Application prête !                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Arguments de ligne de commande

| Index | Valeur | Description |
|-------|--------|-------------|
| `process.argv[0]` | node | Exécutable Node.js |
| `process.argv[1]` | serverPath | Chemin vers api.bundle.js |
| `process.argv[2]` | `--subprocess` | Flag de détection mode Electron |
| `process.argv[3]` | port | Port du serveur (ex: 3044) |
| `process.argv[4]` | envPath | Chemin vers .env |
| `process.argv[5]` | dbPath | Chemin vers le dossier userData |

### Chemins en production

| Variable | Valeur |
|----------|--------|
| `process.resourcesPath` | `{app}/resources/` |
| `serverPath` | `{resources}/src-electron/extra-resources/api/api.bundle.js` |
| `envPath` | `{resources}/src-electron/extra-resources/api/.env` |
| `dbPath` | `app.getPath('userData')` (ex: `~/.config/ActoGraph-v3/`) |
| `database` | `{dbPath}/actograph.sqlite` |

## Génération automatique des index

### Problème

Après bundling avec esbuild, les glob patterns de TypeORM ne fonctionnent plus :

```typescript
// ❌ Ne fonctionne pas après bundling
entities: [__dirname + '/../src/**/*.entity.{js,ts}']
```

### Solution

Un script génère automatiquement les fichiers d'index avec des imports explicites :

```bash
# api/scripts/generate-indexes.js
yarn generate:indexes
```

Génère :
- `api/src/database/all-entities.ts` - Toutes les entités
- `api/src/database/all-migrations.ts` - Toutes les migrations

### Exemple de fichier généré

```typescript
// api/src/database/all-entities.ts (généré automatiquement)
import { License } from '../core/licenses/entities/license.entity';
import { Observation } from '../core/observations/entities/observation.entity';
// ... autres imports

export const AllEntities = [
  License,
  Observation,
  // ... autres entités
];
```

### Intégration au build

Le script est exécuté automatiquement :
- Dans `yarn build:bundle` (package.json)
- Dans `beforeBuild` (quasar.config.js)

**Important** : Ne pas modifier manuellement ces fichiers, ils seront régénérés au prochain build.

## Configuration esbuild

### Fichier : `api/esbuild.config.js`

```javascript
const esbuild = require('esbuild');

const externalModules = [
  'better-sqlite3',  // Module natif avec prebuilds
  // Modules optionnels non utilisés
  'mysql2', 'pg', 'oracledb', 'tedious', 'sql.js',
  // ... autres
];

esbuild.build({
  entryPoints: ['./dist/src/main.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: './dist/api.bundle.js',
  external: externalModules,
  keepNames: true,
  plugins: [
    // Plugin pour externaliser les fichiers .node
    {
      name: 'native-modules',
      setup(build) {
        build.onResolve({ filter: /\.node$/ }, args => ({
          path: args.path,
          external: true
        }));
      }
    }
  ]
});
```

### Modules externalisés

| Module | Raison |
|--------|--------|
| `better-sqlite3` | Module natif (prebuilds) |
| `mysql2`, `pg`, etc. | Non utilisés, optionnels pour TypeORM |
| Fichiers `.node` | Binaires natifs |

## Configuration TypeORM

### Fichier : `api/config/typeorm.config.ts`

```typescript
import { AllEntities } from '../src/database/all-entities';
import { AllMigrations } from '../src/database/all-migrations';

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: process.env.DB_TYPE as any,  // 'better-sqlite3'
  database: `${dbPath}${process.env.DB_NAME}`,
  entities: AllEntities,      // Import explicite
  migrations: AllMigrations,  // Import explicite
  migrationsRun: true,
};
```

### Variable d'environnement

```env
# .env
DB_TYPE=better-sqlite3
DB_NAME=actograph.sqlite
```

## CI/CD (GitHub Actions)

### Workflow : `.github/workflows/publish.yml`

Le workflow build pour 3 plateformes en parallèle :

| Plateforme | Architecture | Artifact |
|------------|--------------|----------|
| Windows | x64 | `ActoGraph-v3-x64.exe` |
| macOS | x64 | `ActoGraph-v3-x64.dmg` |
| macOS | arm64 | `ActoGraph-v3-arm64.dmg` |
| Linux | x64 | `ActoGraph-v3-x64.AppImage` |

### Étapes du workflow

1. Checkout du code
2. Setup Node.js 20
3. Création du `.env` avec `DB_TYPE=better-sqlite3`
4. Installation des dépendances (yarn)
5. Build Electron (quasar build -m electron)
6. Upload des artifacts

## Dépannage

### Le serveur ne démarre pas

1. Vérifier les logs Electron : `electron-log`
2. Vérifier que `api.bundle.js` existe dans les resources
3. Vérifier que `.env` contient `DB_TYPE=better-sqlite3`

### Erreur "Cannot find module 'better-sqlite3'"

Le dossier `node_modules/better-sqlite3` n'a pas été copié correctement.

```bash
# Vérifier la structure
ls -la resources/src-electron/extra-resources/api/node_modules/
```

### Erreur de migration TypeORM

Les migrations ne sont pas incluses dans `AllMigrations`.

```bash
# Régénérer les index
cd api && yarn generate:indexes
```

### Base de données non trouvée

Le chemin `dbPath` n'est pas correct. Vérifier :
- `process.argv[5]` contient le bon chemin
- Le dossier `userData` existe et est accessible

## Comparaison avant/après

| Métrique | Avant (ZIP) | Après (Bundle) |
|----------|-------------|----------------|
| Fichiers installés | ~50 000 | ~150 |
| Taille installation | ~150-200 MB | ~20-30 MB |
| Premier lancement | 30s - 2min (extraction) | Instantané |
| Build time | ~5 min | ~3 min |
| Complexité | ZIP + extraction runtime | Bundle direct |

## Fichiers clés

| Fichier | Rôle |
|---------|------|
| `api/esbuild.config.js` | Configuration du bundler |
| `api/scripts/generate-indexes.js` | Génération des index entités/migrations |
| `api/src/database/all-entities.ts` | Index des entités (généré) |
| `api/src/database/all-migrations.ts` | Index des migrations (généré) |
| `api/config/typeorm.config.ts` | Configuration TypeORM avec imports explicites |
| `front/quasar.config.js` | Orchestration du build (beforeBuild) |
| `front/src-electron/electron-main.ts` | Lancement du serveur en production |
