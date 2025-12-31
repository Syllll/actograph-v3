# Configuration Build Monorepo (sans Workspaces)

Ce projet est un monorepo **sans** yarn workspaces. Chaque sous-projet (`api/`, `front/`, `mobile/`, `packages/core/`) a son propre `package.json`, `node_modules/` et `yarn.lock`.

## Principe : Chaque projet gère son propre build/watch

- **API (NestJS)** : Gère son build avec `nest build` et watch avec `nest start --watch`
- **Frontend (Quasar)** : Gère son build avec `quasar build` et watch avec `quasar dev`
- **Mobile (Quasar + Capacitor)** : Gère son build avec `quasar build -m capacitor`
- **Core Package** : Gère son build avec `tsc` et watch avec `tsc --watch`

## Partage du package @actograph/core

Le package `@actograph/core` est partagé entre l'API et le mobile via des références `file:` :

```json
// Dans api/package.json et mobile/package.json
"dependencies": {
  "@actograph/core": "file:../packages/core"
}
```

**Important** : Après modification du code dans `packages/core/`, il faut :
1. Rebuild le package core : `cd packages/core && yarn build`
2. Ré-installer les dépendances dans les projets qui l'utilisent : `cd ../api && yarn install`

## Installation des dépendances

### Installation complète (depuis la racine)

```bash
# Script qui installe toutes les dépendances
yarn install:all

# Ou manuellement
cd packages/core && yarn install && yarn build
cd ../api && yarn install
cd ../front && yarn install
cd ../mobile && yarn install
```

### Installation individuelle

```bash
# API
cd api && yarn install

# Frontend
cd front && yarn install

# Mobile
cd mobile && yarn install

# Core package
cd packages/core && yarn install
```

## Configuration pour éviter les conflits

### 1. TypeScript à la racine (`tsconfig.json`)

Exclut tous les projets pour éviter que l'IDE ne compile automatiquement :

```json
{
  "exclude": [
    "api/**/*",
    "packages/core/**/*",
    "front/**/*",
    "mobile/**/*",
    "node_modules/**/*"
  ]
}
```

### 2. VSCode/Cursor Settings (`.vscode/settings.json`)

Désactive le watch TypeScript pour l'API et le core :

```json
{
  "typescript.tsserver.watchOptions": {
    "excludeDirectories": [
      "**/api/**",
      "**/packages/core/**",
      "**/node_modules/**"
    ]
  },
  "files.watcherExclude": {
    "**/api/dist/**": true,
    "**/packages/core/dist/**": true,
    "**/node_modules/**": true
  }
}
```

### 3. NestJS Configuration (`api/nest-cli.json`)

```json
{
  "sourceRoot": "src",
  "entryFile": "src/main",
  "compilerOptions": {
    "webpack": false,
    "tsConfigPath": "tsconfig.build.json"
  }
}
```

## Commandes de développement

### Développement complet (Web)

```bash
# Depuis la racine - démarre API + Frontend en Docker
bash scripts/dev-web.sh
```

### Développement individuel

#### API
```bash
cd api
yarn start:dev    # Build + watch automatique avec NestJS
yarn build        # Build manuel
```

#### Frontend
```bash
cd front
yarn dev          # Build + watch automatique avec Quasar
yarn build        # Build manuel
```

#### Mobile
```bash
cd mobile
yarn dev          # Quasar dev avec Capacitor (Android)
yarn dev:ios      # Quasar dev avec Capacitor (iOS)
yarn build        # Build production Android
```

#### Core Package
```bash
cd packages/core
yarn dev          # Watch TypeScript
yarn build        # Build manuel
```

## Structure des fichiers de configuration

```
actograph-v3/
├── package.json          # Scripts de commodité pour le monorepo
├── tsconfig.json         # Exclut les sous-projets
├── .vscode/settings.json # Configuration IDE
├── api/
│   ├── package.json      # Dépendances API (inclut @actograph/core)
│   ├── yarn.lock
│   └── node_modules/
├── front/
│   ├── package.json      # Dépendances Frontend
│   ├── yarn.lock
│   └── node_modules/
├── mobile/
│   ├── package.json      # Dépendances Mobile (inclut @actograph/core)
│   ├── yarn.lock
│   └── node_modules/
└── packages/
    └── core/
        ├── package.json  # Package partagé
        ├── yarn.lock
        └── node_modules/
```

## Notes importantes

### Pas de node_modules à la racine

Ce projet n'utilise **pas** de yarn workspaces. Il n'y a donc pas de `node_modules/` ni de `yarn.lock` à la racine du projet. Chaque sous-projet gère ses propres dépendances de manière indépendante.

### Synchronisation des versions

Les versions des sous-projets doivent être synchronisées manuellement. Le script `scripts/publish.sh` gère automatiquement l'incrémentation des versions dans tous les `package.json`.

### Ordre de build pour @actograph/core

Si vous modifiez `packages/core/`, l'ordre de build doit être :
1. `packages/core` (yarn build)
2. Puis `api` et/ou `mobile` (yarn install pour mettre à jour le lien, puis yarn build si nécessaire)
