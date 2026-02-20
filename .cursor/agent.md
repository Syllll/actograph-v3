# ActoGraph v3 - Cursor Agent Rules

## Setup de l'environnement

**OBLIGATOIRE au demarrage** : Avant toute action, executer le script de setup de l'environnement :

```bash
bash .cursor/setup.sh
```

Ce script :
- Clone la **Knowledge Base Improba** dans `.knowledge-base/` si elle n'est pas deja presente
- Utilise la variable d'environnement `KNOWLEDGE_BASE_REPO_URL` pour l'URL du repo (a configurer dans les secrets Cursor Cloud Agent si necessaire)
- Si la variable n'est pas definie, utilise l'URL par defaut configuree dans le script

**Configuration des secrets** (pour Cloud Agents) :
- Ajouter `KNOWLEDGE_BASE_REPO_URL` dans les secrets Cursor (Dashboard > Cloud Agents > Secrets)
- Format : URL HTTPS ou SSH du repo Git de la Knowledge Base

## Knowledge Base Improba

Ce projet utilise les conventions et recettes de la **Knowledge Base Improba** accessible via le lien symbolique `.knowledge-base/`.

**Recettes pertinentes de la Knowledge Base** :
- `.knowledge-base/recipes/glutamat/auto-implement.md` - **Processus d'implémentation de features et structure docs/** (OBLIGATOIRE)
- `.knowledge-base/recipes/glutamat/creer-module-nestjs.md` - Structure de base (adapter pour TypeORM)
- `.knowledge-base/recipes/glutamat/creer-module-quasar.md` - Structure frontend (adapter pour `defineComponent`)
- `.knowledge-base/best-practices/code-quality/conventions-vue-quasar.md` - Conventions Vue/Quasar (adapter pour `defineComponent`)
- `.knowledge-base/best-practices/code-quality/conventions-code.md` - Conventions generales de code
- `.knowledge-base/best-practices/code-quality/conventions-nommage.md` - Conventions de nommage
- `.knowledge-base/procedures/development/workflow-docker.md` - Workflow Docker

**Consulter la Knowledge Base** : Toujours verifier `.knowledge-base/` pour les recettes et conventions generales, puis adapter selon les specificites d'ActoGraph v3.

## Differences specifiques a ActoGraph v3 par rapport a la Knowledge Base

Ce projet a des specificites par rapport aux recettes standard de la Knowledge Base :

1. **ORM** : Ce projet utilise **TypeORM** (pas MikroORM)
   - Les recettes de la KB mentionnent MikroORM, mais ici on utilise TypeORM
   - Voir `.cursor/rules/backend.md` pour les conventions TypeORM specifiques

2. **Vue.js** : Ce projet utilise **`defineComponent` avec `setup()`** (pas `<script setup>`)
   - Les recettes de la KB montrent `<script setup>`, mais ici on utilise `defineComponent`
   - Voir `.cursor/rules/frontend.md` pour les conventions specifiques

3. **Couleurs CSS** : Ce projet utilise des **couleurs CSS custom** (pas Anubis UI par defaut)
   - Les couleurs sont definies dans `front/src/css/_colors.scss`
   - Utiliser `var(--primary)`, `var(--accent)`, `var(--secondary)` dans les styles SCSS

Quand vous consultez la Knowledge Base (`.knowledge-base/`), **toujours verifier** :
1. Les recettes generales dans `.knowledge-base/recipes/glutamat/`
2. Les conventions dans `.knowledge-base/best-practices/code-quality/`
3. **Puis adapter** selon les specificites d'ActoGraph v3 decrites dans les rules de `.cursor/rules/`

## Architecture du projet

Ce projet est compose de deux parties principales :
- **Frontend** : Application Quasar/Vue.js 3 dans le dossier `front/`
- **Backend** : API NestJS avec TypeORM dans le dossier `api/`

Les deux parties sont containerisees avec Docker pour le developpement.

## Docker - Conteneurs et commandes

### Conteneurs Docker
- **API** : `actograph-v3-api-dev` (dans `api/docker/`)
- **Frontend** : `actograph-v3-front-dev` (dans `front/docker/`)

### Regles pour les commandes Docker

**IMPORTANT** : Toutes les commandes liees au backend (migrations, yarn install, etc.) doivent etre executees dans le conteneur `actograph-v3-api-dev`.
Toutes les commandes liees au frontend (yarn install, quasar dev, etc.) doivent etre executees dans le conteneur `actograph-v3-front-dev`.

#### Commandes API (Backend)
Pour executer des commandes dans le conteneur API :
```bash
docker compose --env-file ./api/docker/../.env -f ./api/docker/docker-compose.dev.yml exec actograph-v3-api-dev <commande>
```

Exemples :
- Migrations : `docker compose --env-file ./api/docker/../.env -f ./api/docker/docker-compose.dev.yml exec actograph-v3-api-dev yarn migration:run`
- Yarn install : `docker compose --env-file ./api/docker/../.env -f ./api/docker/docker-compose.dev.yml exec actograph-v3-api-dev yarn install`
- Console interactive : `sh api/docker/compose.sh console`

#### Commandes Frontend
Pour executer des commandes dans le conteneur Frontend :
```bash
docker compose --env-file ./front/docker/../.env -f ./front/docker/docker-compose.dev.yml exec actograph-v3-front-dev <commande>
```

Exemples :
- Yarn install : `docker compose --env-file ./front/docker/../.env -f ./front/docker/docker-compose.dev.yml exec actograph-v3-front-dev yarn install`
- Quasar dev : `docker compose --env-file ./front/docker/../.env -f ./front/docker/docker-compose.dev.yml exec actograph-v3-front-dev yarn dev`
- Console interactive : `sh front/docker/compose.sh console`

## Scripts utiles

### Developpement
- Demarrer en mode web (avec Docker) : `bash scripts/dev-web.sh`
- Demarrer en mode electron : `bash scripts/dev-electron.sh`
- Console API : `sh api/docker/compose.sh console`
- Console Frontend : `sh front/docker/compose.sh console`

### Deploiement
- Deployer en production : `bash scripts/publish prod`
- Deployer manuellement : `COMPOSE_MODE=production sh compose.sh up -d`

## Processus d'implementation de features

**Source de verite : `.knowledge-base/recipes/glutamat/auto-implement.md`**

Ce processus est **OBLIGATOIRE** pour toute nouvelle feature. Consulter la recette IKB pour le processus complet et le format detaille des fichiers.

### Resume du processus

1. **Demander le nom de l'auteur** avant de creer le fichier (OBLIGATOIRE)
2. **Creer le fichier** dans `docs/temp/` pendant l'implementation
   - Format du nom : `{YYYYMMDDhhmmss}-{issue-number}-{feature-name}-{Prenom-Nom}.md`
   - Exemple : `docs/temp/20260212143000-42-mon-feature-Sylvain-Meylan.md`
3. **Analyser l'issue GitHub** pour comprendre les besoins fonctionnels
4. **Analyser le code existant** pour identifier ce qui est deja implemente
5. **Creer un plan d'implementation detaille** dans le fichier (format IKB avec frontmatter YAML)
6. **Demander validation** a l'utilisateur avant de commencer l'implementation
7. **Pendant l'implementation** : Mettre a jour le fichier au fur et a mesure (checkboxes, problemes, initiatives)
8. **Une fois termine** : Deplacer le fichier vers le dossier approprie :
   - `docs/features/` pour la documentation perenne (nettoyer les TODOs termines)
   - `docs/plans/` pour les plans reutilisables
   - `docs/reviews/` pour les reviews importantes

### Structure du dossier docs/

```
docs/
├── README.md                    # Description de la structure
├── features/                    # Documentation PERENNE de features terminees (tracke git)
├── plans/                       # Plans d'implementation PARTAGEABLES (tracke git)
├── reviews/                     # Reviews IMPORTANTES a conserver (tracke git)
└── temp/                        # Fichiers TEMPORAIRES en cours de travail (NON tracke git)
```

### Points importants
- Toujours analyser le code existant AVANT de proposer un plan
- Marquer clairement ce qui existe deja vs ce qui doit etre cree
- Ne pas proposer d'implementer ce qui existe deja
- Demander validation avant de commencer a coder
- Mettre a jour le plan au fur et a mesure
- Si trop de fichiers dans un dossier, possibilite de creer des sous-dossiers thematiques
- Ne pas inclure d'estimations de temps sauf si explicitement demande

Voir `.knowledge-base/recipes/glutamat/auto-implement.md` pour le processus detaille, le format YAML frontmatter, et des exemples complets.

## Regles generales

**Reference Knowledge Base** : Voir `.knowledge-base/best-practices/code-quality/conventions-code.md` pour les principes generaux de qualite de code.

1. **Toujours utiliser Docker** pour les commandes de developpement (yarn, migrations, etc.)
   - Voir `.knowledge-base/procedures/development/workflow-docker.md` pour les workflows Docker generaux
2. **Respecter la structure** des dossiers existants
3. **Utiliser TypeScript** partout (backend et frontend)
   - Voir `.knowledge-base/best-practices/code-quality/conventions-code.md` pour les conventions TypeScript strictes
4. **Suivre les conventions** de nommage existantes
   - Voir `.knowledge-base/best-practices/code-quality/conventions-nommage.md` pour les conventions generales
5. **Etendre les classes de base** quand disponibles (BaseEntity, BaseService, BaseController)
6. **Utiliser yarn** pour la gestion des dependances (pas npm)
7. **Tester les migrations** avant de les commiter (TypeORM, pas MikroORM)
8. **Respecter les patterns** existants dans le code

## Notes techniques transversales

- Les migrations TypeORM doivent toujours etre executees dans le conteneur Docker API
- Les commandes yarn doivent etre executees dans le conteneur approprie (API ou Frontend)
- Le frontend utilise Vue.js 3 avec `defineComponent` et `setup()`, **PAS** `<script setup>`
- Le backend utilise NestJS avec TypeORM et des entites qui etendent `BaseEntity`
- Tous les fichiers doivent respecter les conventions TypeScript strictes
- Le backend utilise un `ValidationPipe` global qui transforme et valide automatiquement les DTOs
- Les erreurs de validation sont automatiquement renvoyees par NestJS avec un format standardise
- NestJS gere automatiquement les exceptions HTTP (NotFoundException, BadRequestException, etc.)
- Les relations many-to-many sont gerees automatiquement par `BaseRepository.save()`
- Les groupes de serialisation (`GROUP_USER`, `GROUP_ADMIN`) permettent de controler quels champs sont exposes selon le role
- Les services frontend doivent utiliser `api()` depuis `lib-improba/boot/axios` qui gere automatiquement l'authentification JWT
