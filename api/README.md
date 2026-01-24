# ActoGraph API

API NestJS pour ActoGraph v3.

## Configuration de l'environnement

### Base de données SQLite (mode Electron)

L'API utilise **better-sqlite3** comme driver SQLite pour de meilleures performances et une installation plus rapide.

Dans votre fichier `.env`, configurez :

```env
DB_TYPE=better-sqlite3
DB_NAME=actograph.db
```

> **Note importante** : Si vous migrez depuis une version antérieure qui utilisait `sqlite3`, vous devez changer `DB_TYPE=sqlite` en `DB_TYPE=better-sqlite3`.

### Build pour Electron

L'API est bundlée en un seul fichier JavaScript avec esbuild pour :
- Réduire drastiquement le nombre de fichiers (~50 000 → ~100)
- Accélérer l'installation sur Windows
- Démarrage plus rapide

Pour builder manuellement :

```bash
# Build NestJS (TypeScript → JavaScript)
yarn build

# Bundle avec esbuild (JavaScript → single bundle)
yarn build:bundle
```

Le fichier résultant `dist/api.bundle.js` contient tout le code de l'API bundlé.

## Ajouter une nouvelle entité ou migration

Les fichiers d'index TypeORM sont **générés automatiquement** lors du build.

### Nouvelle entité

1. Créez votre entité dans `src/**/entities/*.entity.ts`
2. C'est tout ! Le script `generate-indexes.js` découvrira automatiquement votre entité

### Nouvelle migration

1. Générez la migration avec `yarn migration:generate api/migrations/NomDeLaMigration`
2. C'est tout ! Le script `generate-indexes.js` découvrira automatiquement votre migration

### Régénération manuelle

Si vous avez besoin de régénérer les fichiers d'index manuellement :

```bash
yarn generate:indexes
```

Les fichiers générés sont :
- `src/database/all-entities.ts` - Toutes les entités `*.entity.ts`
- `src/database/all-migrations.ts` - Toutes les migrations de `migrations/`

## Scripts disponibles

| Commande | Description |
|----------|-------------|
| `yarn start:dev` | Démarrer en mode développement |
| `yarn start:dev-electron` | Démarrer en mode développement pour Electron |
| `yarn build` | Build NestJS standard (TypeScript → JavaScript) |
| `yarn build:bundle` | Build complet (génère indexes + compile + bundle) |
| `yarn generate:indexes` | Régénérer les index d'entités/migrations |
| `yarn migration:run` | Exécuter les migrations |
| `yarn migration:generate <path>` | Générer une migration |

## Architecture du bundle

```
api/
├── src/                          # Code source TypeScript
│   └── database/
│       ├── all-entities.ts       # Index généré automatiquement
│       └── all-migrations.ts     # Index généré automatiquement
├── dist/
│   ├── src/                      # Code compilé JavaScript
│   └── api.bundle.js             # Bundle final (~5-10 MB)
├── esbuild.config.js             # Configuration esbuild
└── scripts/
    └── generate-indexes.js       # Script de génération des index
```

## Dépendances natives

Le bundle externalise `better-sqlite3` car c'est un module natif. Ce module utilise des **prebuilds** (binaires précompilés) qui sont téléchargés automatiquement lors du `yarn install`.

Plateformes supportées par better-sqlite3 :
- Windows x64
- macOS x64 et arm64 (Apple Silicon)
- Linux x64

## Documentation détaillée

Pour plus de détails sur le processus de build Electron, voir : [docs/electron-desktop-build.md](../docs/electron-desktop-build.md)
