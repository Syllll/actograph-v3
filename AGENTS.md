# Instructions Agent - ActoGraph v3

## Improba Knowledge Base

Ce projet utilise l'**Improba Knowledge Base** accessible via `.knowledge-base/`.

Avant de répondre ou d'implémenter, toujours :
1. Consulter `.knowledge-base/README.md` pour la structure
2. Lire les fichiers référencés dans les sections "Voir aussi"
3. Adapter selon les spécificités ci-dessous

## Spécificités du projet

- **ORM** : ce projet utilise **TypeORM** (pas MikroORM) — `conventions-mikroorm.md` ne s'applique pas
- **Frontend** : ce projet utilise **`defineComponent` avec `setup()`** (pas `<script setup>`) — adapter les exemples des recettes
- **Design system** : couleurs CSS custom dans `front/src/css/_colors.scss` (pas Anubis UI par défaut)
- **Composants UI** : utiliser les composants **DCard, DPage, DCardSection** etc. de `@lib-improba/components`
- **Déploiement** : mode principal = **Electron** (desktop), bundle API + SQLite (`better-sqlite3`) pour usage offline

En cas de conflit entre une recette IKB et ce fichier, les spécificités du projet priment.

## Références IKB

- `.knowledge-base/recipes/glutamat/creer-module-nestjs.md` - Structure backend (⚠️ adapter pour TypeORM)
- `.knowledge-base/recipes/glutamat/creer-module-quasar.md` - Structure frontend (⚠️ adapter pour `defineComponent`)
- `.knowledge-base/recipes/glutamat/auto-implement.md` - Processus d'implémentation de features (OBLIGATOIRE)
- `.knowledge-base/best-practices/code-quality/conventions-nestjs.md` - Conventions NestJS (ORM-agnostique)
- `.knowledge-base/best-practices/code-quality/conventions-vue-quasar.md` - Conventions Vue/Quasar (⚠️ adapter)
- `.knowledge-base/best-practices/code-quality/conventions-code.md` - Conventions générales
- `.knowledge-base/best-practices/code-quality/conventions-nommage.md` - Nommage
- `.knowledge-base/procedures/development/workflow-docker.md` - Workflow Docker

## Project overview

ActoGraph v3 is a behavioral observation analysis app (Quasar/Vue.js frontend + NestJS API). The primary development mode is **Electron** (desktop), which bundles the API with SQLite (`better-sqlite3`) for offline use. See `README.md` for full architecture details.

## Running the Electron dev mode

The canonical dev workflow is `bash scripts/dev-electron.sh`, but in a cloud/headless VM you must run the two processes separately:

1. **API** (terminal 1): `cd api && DEV_ELECTRON=true yarn start:dev-electron`
   - Runs on port 3236 (from `BACKEND_DOCKER_APP_PORT_EXPOSED` in `api/.env`)
   - Uses SQLite via `better-sqlite3` (set `DB_TYPE=better-sqlite3` and `DB_NAME=data_dev/actograph.db` in `api/.env`)
   - Auto-creates admin user on first start (credentials in `api/.env`: `ADMINUSER_LOGIN` / `ADMINUSER_PASSWORD`)
   - Auto-runs migrations via TypeORM `migrationsRun: true`

2. **Frontend/Electron** (terminal 2): `cd front && DISPLAY=:1 npx quasar dev -m electron`
   - Requires `DISPLAY=:1` in the cloud VM for headless Electron
   - Dev server port is controlled by `FRONT_DOCKER_PORT_EXPOSED` in `front/.env` (default 8481)

## .env files

Must be created from `.env.example` before first run. For local SQLite dev:
- `api/.env`: set `DB_TYPE=better-sqlite3`, clear `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`, set `DB_NAME=data_dev/actograph.db`
- `front/.env`: set `API_URL=http://localhost:3236`

## Building shared packages

- **In dev mode**: NOT required. Vite aliases in `front/quasar.config.js` point directly to `packages/*/src/`.
- **For the API**: `@actograph/core` must be built (`cd packages/core && yarn build`) because the API's `tsconfig.json` path mapping references `../packages/core/dist`.
- Production builds require `yarn build:packages` from root.

## Lint and tests

- `cd front && yarn lint` — ESLint for frontend (passes clean)
- `cd packages/core && yarn test` — Jest unit tests (45 tests)
- `cd api && yarn test` — Jest unit tests (has a pre-existing failing stub test in `app.controller.spec.ts`)
- API lint (`yarn lint:fix`) requires `eslint-plugin-prettier` which is missing from `package.json`. The API also has many pre-existing formatting issues.
- `packages/core` lint has pre-existing errors in the vendored `qtdatastream` library.

## Gotchas

- The `scripts/dev-electron.sh` script tries to open new terminal tabs via `gnome-terminal` (Linux) or `osascript` (macOS), which doesn't work in headless VMs. Run API and frontend separately instead.
- Electron requires `--no-sandbox` on Linux in some environments. The `quasar.config.js` already sets `ELECTRON_DISABLE_SANDBOX=1` on Linux.
- The D-Bus errors in Electron logs (`Failed to connect to the bus`) are harmless in headless environments.
- GPU-related errors (`Exiting GPU process`, `kTransientFailure`) are normal when no GPU is available; Electron falls back to software rendering.
