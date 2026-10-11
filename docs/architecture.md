# Architecture de l'application bureau

Référence revue sur `main` le 11 octobre 2026. ActoGraph bureau associe Electron, le frontend Quasar/Vue 3, une API NestJS et une base SQLite TypeORM locale. Le web et le mobile réutilisent une partie du code mais ont des workflows distincts.

## Processus et données

```text
Fenêtre Quasar/Vue (renderer)
        | bridge window.api via electron-preload.ts
        v
Processus principal Electron
        | superviseur + IPC de disponibilité/arrêt
        v
API NestJS embarquée (api.bundle.js)
        | TypeORM + better-sqlite3
        v
Base locale dans userData/actograph.sqlite
```

Le renderer appelle aussi l'API HTTP locale pour les opérations métier. En production, l'API écoute sur `127.0.0.1` avec un port disponible choisi au lancement. Le secret de session `ACTOGRAPH_DESKTOP_TOKEN` est transmis au sous-processus et la connexion est fournie au renderer par le preload ; le JWT local s'ajoute pour les routes métier. Ce secret n'est pas le token cloud.

Le processus principal maintient une seule instance de l'application. Le superviseur attend le message IPC `backend-ready`, puis une réponse HTTP de santé du même processus, avant de déclarer l'API prête. Il sérialise les essais, la reprise après crash et l'arrêt pour éviter des processus concurrents sur SQLite. À la fermeture, il demande un arrêt IPC, attend Nest/SQLite, puis applique les signaux de terminaison si nécessaire.

En développement Electron, l'API est lancée séparément avec `yarn start:dev-electron`, son port vient de `api/.env` et `API_URL` configure le frontend. Le mode `DEV_ELECTRON` active le comportement bureau de l'API. Voir [README](../README.md) pour les commandes.

## Stockage et accès

- SQLite conserve chroniques, protocoles, relevés, utilisateurs locaux et licences.
- TypeORM applique automatiquement les migrations ; `synchronize` est désactivé.
- `access.json` conserve le choix étudiant ou la clé pro. Le compte local Electron est créé et connecté automatiquement ; il est distinct du compte actograph.io.
- Les fichiers `.jchronic` permettent d'exporter/importer une chronique indépendamment des IDs de la base. L'autosave écrit des fichiers de récupération via Electron.
- La vidéo est référencée par un chemin local ; elle n'est pas incorporée au fichier `.jchronic`.

L'activation d'une nouvelle licence pro contacte le serveur de licences. Une licence déjà enregistrée peut fonctionner hors ligne si la copie locale reste valide. L'accès étudiant ne nécessite pas de clé. Voir [validation des licences](license-validation.md).

## Packages et applications

| Partie | Responsabilité |
|---|---|
| `api/` | API NestJS, TypeORM, contrôles d'accès et import/export |
| `front/` | Interface web/bureau, shell Electron et bridges natifs |
| `packages/core/` | Types, statistiques, correction des relevés, validation et parser `.chronic` v1 |
| `packages/graph/` | Façade `PixiApp`, moteur v2, axes et rendu PixiJS partagé |
| `mobile/` | Application Capacitor Android/iOS, stockage et synchronisation propres au mobile |

Le dépôt utilise des références `file:` sans workspaces. Vite consomme les sources partagées ; l'API dépend de core compilé dans `dist`. Voir [monorepo et builds](monorepo-build.md).

## Cloud et site

Le site actograph.io, son espace client et son serveur de licences/cloud vivent dans un dépôt séparé. La connexion cloud du bureau appelle `/api/auth-tokens`, obtient un token opaque et utilise le contrat `X-Auth-Token`. Elle permet les transferts de chroniques et ne remplace pas la session JWT de l'API locale. Le travail local ne dépend pas d'une connexion cloud.

## Distribution

Le build compile NestJS, bundle l'API avec esbuild, copie la configuration et reconstruit `better-sqlite3` pour Electron. Les index d'entités et de migrations sont générés explicitement pour fonctionner dans le bundle. La CI officielle injecte aussi le validateur PKV privé et produit les installeurs signés ainsi que les métadonnées de mise à jour GitHub.

Voir [build Electron](electron-desktop-build.md), [publication](deployment.md), [authentification](authentification.md) et [parcours bureau](desktop.md).
