# ActoGraph v3

ActoGraph v3 est une application d'observation comportementale : création de chroniques, protocoles, collecte de relevés, graphe d'activité et statistiques. **L'application bureau Electron est le mode principal** sur Windows, macOS et Linux. Elle embarque une API NestJS et une base SQLite, et permet de travailler hors ligne après activation. Le cloud actograph.io sert à la connexion et aux échanges de chroniques ; il reste facultatif pour le travail local.

Ce dépôt contient aussi le frontend web et l'application mobile Capacitor. Le site vitrine, l'espace client et le serveur cloud sont dans un dépôt distinct.

## Téléchargement

La [page officielle de téléchargement](https://actograph.io/fr/download) propose l'installeur adapté au système, y compris macOS Intel ou Apple Silicon. Les binaires officiels sont distribués par les [GitHub Releases](https://github.com/Syllll/actograph-v3/releases).

- **Étudiants** : accès gratuit, sans clé de licence.
- **Professionnels** : activation avec une licence achetée sur [actograph.io](https://actograph.io/fr/).

Voir [comptes et licences](docs/comptes-et-licences.md) pour distinguer accès local, activation et compte cloud.

## Commencer par la documentation

- **[Index de la documentation](docs/README.md)** : tous les guides et les archives.
- **[Parcours dans l'application bureau](docs/desktop.md)** : créer, observer, analyser, enregistrer et retrouver ses chroniques.
- **[Architecture](docs/architecture.md)** : Electron, API locale, SQLite, packages partagés et cloud.
- **[Build Electron](docs/electron-desktop-build.md)** et **[publication](docs/deployment.md)** : compilation, modules natifs, signature et releases.

## Développer l'application bureau

### Prérequis

- **Node.js 20**, comme le script de développement et la CI bureau.
- **Yarn Classic 1.22**, avec des installations indépendantes par sous-projet, sans workspaces.
- Une session graphique pour Electron. Sur Linux, le script assisté utilise `gnome-terminal` ; sur macOS, Terminal via `osascript`. Le lancement manuel ci-dessous permet de garder deux terminaux séparés.
- Pour construire les modules natifs, la chaîne de compilation requise par `better-sqlite3` et `electron-rebuild` sur le système cible.

### Préparer le clone

Depuis la racine du dépôt, copier les exemples si les fichiers `.env` n'existent pas encore :

```bash
cp api/.env.example api/.env
cp front/.env.example front/.env
```

Dans `api/.env`, remplacer la configuration PostgreSQL de l'exemple par :

```dotenv
DB_TYPE=better-sqlite3
DB_NAME=data_dev/actograph.db
DB_HOST=
DB_PORT=
DB_USERNAME=
DB_PASSWORD=
```

Configurer également `JWT_SECRET`, `ADMINUSER_LOGIN` et `ADMINUSER_PASSWORD` pour ce clone. Dans `front/.env`, garder `API_URL=http://localhost:3236` si le port API est celui de l'exemple (`BACKEND_DOCKER_APP_PORT_EXPOSED=3236`). Le serveur Quasar utilise `FRONT_DOCKER_PORT_EXPOSED=8481` dans l'exemple frontend.

Installer les dépendances bureau et construire les packages :

```bash
(cd packages/core && yarn install)
(cd packages/graph && yarn install)
(cd api && yarn install)
(cd front && yarn install)
mkdir -p api/data_dev
yarn build:packages
```

`yarn install:all` installe aussi les dépendances mobiles. Voir [le guide monorepo](docs/monorepo-build.md) pour les alias et l'ordre de compilation.

### Lancer Electron

Le script assisté sélectionne Node 20, installe les dépendances API/frontend, exécute les migrations, ouvre un terminal API et lance Electron :

```bash
bash scripts/dev-electron.sh
```

Il suppose que les fichiers `.env` et le build `packages/core/dist` ont été préparés. Pour un lancement manuel, avec Node 20 actif dans chaque terminal :

```bash
# Terminal 1, depuis la racine
cd api
yarn start:dev-electron
```

```bash
# Terminal 2, depuis la racine
cd front
yarn quasar dev -m electron
```

L'API utilise SQLite et applique les migrations au démarrage (`migrationsRun: true`). En développement, Electron utilise cette API séparée ; dans l'installeur, il démarre et supervise l'API embarquée automatiquement. Une VM sans affichage nécessite un serveur graphique, puis un `DISPLAY` adapté.

Si Electron affiche `ERR_CONNECTION_REFUSED`, consulter aussi le terminal Quasar : le serveur frontend peut avoir quitté avant le chargement de la fenêtre. Une erreur `SyntaxError: Unexpected end of input` dans `vite-plugin-checker/.../typescript-vue-tsc/lib/typescript.js` signale un cache TypeScript tronqué. Le script assisté le détecte et le supprime avant de lancer Quasar, qui le reconstruit. Pour un lancement manuel, arrêter Quasar, supprimer uniquement `front/node_modules/vite-plugin-checker/dist/cjs/checkers/vueTsc/typescript-vue-tsc`, puis relancer Quasar.

**Après une modification de `packages/core/src`, reconstruire `core` pour l'API.** Les alias Vite frontend et mobile pointent vers les sources, y compris lors de leurs builds ; le mapping TypeScript de l'API pointe vers `packages/core/dist`.

### Mode web alternatif

Le mode web utilise les configurations Docker et PostgreSQL :

```bash
bash scripts/dev-web.sh
```

Préparer les `.env` pour ce mode, notamment les paramètres PostgreSQL de `api/.env`. Les ports viennent des `.env`, pas d'un port fixe `9000`. Les commandes Docker concernent ce workflow web ; le développement bureau exécute les commandes localement.

## Structure du dépôt

```text
actograph-v3/
├── api/                 # NestJS, TypeORM, migrations, bundle esbuild
├── front/               # Quasar/Vue 3, frontend web et Electron
│   ├── src/             # Pages, services, composables et i18n
│   ├── src-electron/     # Main, preload et superviseur de l'API
│   └── lib-improba/      # Composants et utilitaires UI
├── mobile/              # Quasar + Capacitor Android/iOS
├── packages/
│   ├── core/            # Types, statistiques, validation et import v1
│   └── graph/           # Moteur PixiJS partagé bureau/mobile
├── scripts/             # Développement, build et publication
└── docs/                # Guides actuels et documents historiques
```

## Vérifications de développement

Exécuter les commandes depuis le sous-projet indiqué :

| Sous-projet | Commandes |
|---|---|
| `front/` | `yarn lint`, `yarn typecheck`, `yarn test --runInBand` |
| `api/` | `yarn test --runInBand`, `yarn build` |
| `packages/core/` | `yarn test --runInBand`, `yarn build` |
| `packages/graph/` | `yarn test --runInBand`, `yarn build` |
| Racine | `node --test scripts/inject-key-validator.test.cjs` |

Le succès d'une ancienne revue ne valide pas les changements du clone courant. Les tests Electron de `front/` couvrent notamment le superviseur et les URLs autorisées ; les guides métier renvoient aux tests de leurs modules.

## Construire et publier le bureau

Pour construire localement, avec Node 20 et les `.env` bureau préparés :

```bash
bash scripts/build-electron.sh
```

Le résultat se trouve dans `front/dist/electron/Packaged/`. Le script construit `core`, puis `graph`, puis Electron avec son API bundlée et son driver SQLite reconstruit pour Electron. Un build local utilise les bouchons publics du validateur PKV ; les builds officiels injectent le validateur privé en CI. Voir [validation des licences](docs/license-validation.md).

Pour publier une nouvelle version officielle :

```bash
bash scripts/publish.sh prod desktop patch
```

`prod` seul équivaut à `prod desktop`. Le script incrémente les versions bureau (`api` et `front`), committe, pousse et crée le tag `prod-vX.Y.Z`. Le workflow de publication produit les installeurs, les signatures et les fichiers de mise à jour. Un simple push de documentation sur `main` ne déclenche pas de nouvelle release bureau.

Les cibles `mobile`, `android`, `ios` et `desktop-mobile`, ainsi que le canal `preprod`, sont décrits dans [deployment.md](docs/deployment.md). Les versions bureau et mobile évoluent séparément ; la version du `package.json` racine et des packages partagés n'est pas la version distribuée de l'application.

## Contribution

Créer normalement une branche depuis `main`, vérifier les changements, puis ouvrir une pull request. Une intervention directement sur `main` peut être autorisée explicitement par le mainteneur.

## Licence

ActoGraph v3 est la propriété exclusive de **SymAlgo Technologies**. Le code source est disponible en open source sous une licence dual avec les conditions suivantes :

### 🎓 Utilisation par les étudiants

Le code source d'ActoGraph v3 peut être utilisé **librement par les étudiants** à des fins éducatives et non commerciales. Les étudiants peuvent :
- Utiliser le logiciel dans le cadre de leurs activités académiques
- Étudier, modifier et adapter le code source
- Partager le code modifié avec d'autres étudiants ou enseignants dans un contexte éducatif

### 🏢 Utilisation par les entreprises

**Toute utilisation par des entreprises est strictement interdite** sans l'obtention préalable d'une licence commerciale auprès de SymAlgo Technologies.

**Modèle de licence par utilisateur :**
- **1 licence = 1 utilisateur** : Chaque licence commerciale est accordée pour un seul utilisateur
- **Plusieurs utilisateurs = plusieurs licences** : Si votre entreprise a besoin de plusieurs utilisateurs, une licence distincte est requise pour chaque utilisateur
- Le partage d'une licence entre plusieurs utilisateurs est strictement interdit

Une licence commerciale est requise pour :
- Toute utilisation à des fins commerciales ou professionnelles
- Toute utilisation dans un contexte commercial, même si elle n'est pas directement monétisée
- Toute intégration dans des produits ou services commerciaux
- Toute utilisation par des consultants ou prestataires de services

### 📄 Détails complets

Pour plus d'informations sur les conditions d'utilisation, consultez le fichier [LICENSE](LICENSE) à la racine du projet.

**Pour obtenir une licence commerciale**, veuillez contacter SymAlgo Technologies :
- Site web : https://actograph.io

## Support

Pour toute question ou problème, contactez l'équipe de développement.
