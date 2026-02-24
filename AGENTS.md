# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

ActoGraph v3 is a behavioral observation analysis app (Quasar/Vue.js frontend + NestJS API). The primary development mode is **Electron** (desktop), which bundles the API with SQLite (`better-sqlite3`) for offline use. See `README.md` for full architecture details.

### Running the Electron dev mode

The canonical dev workflow is `bash scripts/dev-electron.sh`, but in a cloud/headless VM you must run the two processes separately:

1. **API** (terminal 1): `cd api && DEV_ELECTRON=true yarn start:dev-electron`
   - Runs on port 3236 (from `BACKEND_DOCKER_APP_PORT_EXPOSED` in `api/.env`)
   - Uses SQLite via `better-sqlite3` (set `DB_TYPE=better-sqlite3` and `DB_NAME=data_dev/actograph.db` in `api/.env`)
   - Auto-creates admin user on first start (credentials in `api/.env`: `ADMINUSER_LOGIN` / `ADMINUSER_PASSWORD`)
   - Auto-runs migrations via TypeORM `migrationsRun: true`

2. **Frontend/Electron** (terminal 2): `cd front && DISPLAY=:1 npx quasar dev -m electron`
   - Requires `DISPLAY=:1` in the cloud VM for headless Electron
   - Dev server port is controlled by `FRONT_DOCKER_PORT_EXPOSED` in `front/.env` (default 8481)

### .env files

Must be created from `.env.example` before first run. For local SQLite dev:
- `api/.env`: set `DB_TYPE=better-sqlite3`, clear `DB_HOST`/`DB_PORT`/`DB_USERNAME`/`DB_PASSWORD`, set `DB_NAME=data_dev/actograph.db`
- `front/.env`: set `API_URL=http://localhost:3236`

### Building shared packages

- **In dev mode**: NOT required. Vite aliases in `front/quasar.config.js` point directly to `packages/*/src/`.
- **For the API**: `@actograph/core` must be built (`cd packages/core && yarn build`) because the API's `tsconfig.json` path mapping references `../packages/core/dist`.
- Production builds require `yarn build:packages` from root.

### Lint and tests

- `cd front && yarn lint` — ESLint for frontend (passes clean)
- `cd packages/core && yarn test` — Jest unit tests (45 tests)
- `cd api && yarn test` — Jest unit tests (has a pre-existing failing stub test in `app.controller.spec.ts`)
- API lint (`yarn lint:fix`) requires `eslint-plugin-prettier` which is missing from `package.json`. The API also has many pre-existing formatting issues.
- `packages/core` lint has pre-existing errors in the vendored `qtdatastream` library.

### Running the mobile app (Android)

See `mobile/README.md` for full setup. Key points for cloud VMs:

1. **Prerequisites**: Android SDK (API 35), Android Studio at `/opt/android-studio`, Java 21+
   - Environment vars: `ANDROID_HOME`, `ANDROID_SDK_ROOT`, `JAVA_HOME`, `CAPACITOR_ANDROID_STUDIO_PATH`
   - These are configured in `~/.bashrc`
   - `local.properties` in `mobile/src-capacitor/android/` must contain `sdk.dir=/home/ubuntu/Android/Sdk`

2. **Dev mode**: `cd mobile && yarn dev` (runs `quasar dev -m capacitor -T android`)
   - This opens Android Studio. From there, run on an emulator or connected device.
   - The Android emulator requires KVM (`/dev/kvm`), which is **not available** in cloud VMs. Use a physical device via ADB or build the APK for testing.

3. **Build APK without emulator** (works in cloud VMs):
   ```
   cd mobile && yarn build:apk
   ```
   This builds the Quasar app, syncs Capacitor, and produces a debug APK via Gradle.

4. **Lint**: `cd mobile && yarn lint` (passes clean)

### Gotchas

- The `scripts/dev-electron.sh` script tries to open new terminal tabs via `gnome-terminal` (Linux) or `osascript` (macOS), which doesn't work in headless VMs. Run API and frontend separately instead.
- Electron requires `--no-sandbox` on Linux in some environments. The `quasar.config.js` already sets `ELECTRON_DISABLE_SANDBOX=1` on Linux.
- The D-Bus errors in Electron logs (`Failed to connect to the bus`) are harmless in headless environments.
- GPU-related errors (`Exiting GPU process`, `kTransientFailure`) are normal when no GPU is available; Electron falls back to software rendering.
- The Android emulator requires KVM hardware acceleration, unavailable in cloud VMs. Build APKs with `yarn build:apk` instead.
