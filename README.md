# ActoGraph v3

ActoGraph v3 est une application web et desktop conçue pour l'analyse et la visualisation de données d'observation comportementale. L'application permet de créer des observations, de collecter des données (readings), de définir des protocoles d'observation structurés et de visualiser les données sous forme de graphiques interactifs.

## Architecture

L'application est composée de deux parties principales :

- **Frontend** : Application Quasar/Vue.js 3 permettant une interface utilisateur moderne et réactive
- **Backend** : API NestJS avec TypeORM pour la gestion des données et la logique métier

L'application peut être déployée en mode :
- **Web** : Accessible via un navigateur web moderne
- **Desktop** : Application Electron pour Linux, macOS et Windows

## Prérequis

- Node.js (version 18 ou 20)
- Yarn (version 1.22+)
- Docker et Docker Compose (pour le développement web)
- PostgreSQL (pour la production) ou SQLite (pour le développement)

## Installation et démarrage

### Mode développement Web

Pour démarrer l'application en mode web avec Docker :

```bash
bash scripts/dev-web.sh
```

Cette commande démarre automatiquement :
- Le conteneur Docker de la base de données PostgreSQL
- Le conteneur Docker de l'API NestJS
- Le conteneur Docker du frontend Quasar

L'application sera accessible à l'adresse configurée dans les variables d'environnement (par défaut `http://localhost:9000`).

### Mode développement Electron

Pour démarrer l'application en mode desktop (Electron) :

```bash
bash scripts/dev-electron.sh
```

Cette commande démarre l'API en arrière-plan et lance l'application Electron.

### Configuration

Les fichiers de configuration se trouvent dans :
- `api/.env` : Configuration de l'API (base de données, JWT, etc.)
- `front/.env` : Configuration du frontend (URL de l'API, etc.)

Consultez les fichiers `.env.example` pour voir les variables nécessaires.

## Structure du projet

```
actograph-v3/
├── api/                    # Backend NestJS
│   ├── src/
│   │   ├── core/          # Modules métier principaux
│   │   │   ├── observations/  # Gestion des observations
│   │   │   ├── users/         # Gestion des utilisateurs
│   │   │   └── security/      # Sécurité et licences
│   │   ├── general/       # Modules généraux (auth, etc.)
│   │   └── utils/         # Utilitaires partagés
│   ├── migrations/        # Migrations TypeORM
│   └── docker/            # Configuration Docker
├── front/                 # Frontend Quasar/Vue.js
│   ├── src/
│   │   ├── pages/        # Pages de l'application
│   │   ├── components/   # Composants Vue
│   │   ├── services/     # Services API
│   │   └── composables/  # Composables Vue
│   └── lib-improba/      # Bibliothèque partagée
└── docs/                  # Documentation détaillée
```

## Concepts principaux

### Observations

Une **observation** est l'entité centrale de l'application. Elle représente une session d'observation comportementale et contient :
- Un protocole d'observation structuré
- Des readings (données collectées)
- Un graphique d'activité (optionnel)

### Protocoles

Un **protocole** définit la structure hiérarchique d'une observation. Il est composé de :
- **Catégories** : Groupes d'observables
- **Observables** : Éléments individuels à observer (feuilles de l'arbre)

### Readings

Les **readings** sont les données collectées lors d'une observation. Chaque reading contient :
- Un type (START, STOP, PAUSE_START, PAUSE_END, DATA)
- Une date et heure précise
- Un nom et une description optionnels

### Graphiques d'activité

Les **graphiques d'activité** visualisent les données d'observation sur un axe temporel, avec les observables du protocole sur l'axe vertical et le temps sur l'axe horizontal.

## Documentation détaillée

Pour plus d'informations sur des aspects spécifiques de l'application, consultez la documentation détaillée :

- **[Déploiement](docs/deployment.md)** : Instructions complètes pour déployer l'application en production
- **[Authentification](docs/authentification.md)** : Système d'authentification JWT et gestion des utilisateurs
- **[Chronic](docs/chronic.md)** : Import, export et création de données chroniques (readings)
- **[Protocoles](docs/protocol.md)** : Création et gestion des protocoles d'observation
- **[Readings](docs/reading.md)** : Gestion des readings et synchronisation
- **[Graphiques](docs/graph.md)** : Visualisation des données avec PixiJS

## Commandes utiles

### Backend (API)

Toutes les commandes backend doivent être exécutées dans le conteneur Docker `actograph-v3-api-dev` :

```bash
# Accéder à la console du conteneur API
sh api/docker/compose.sh console

# Exécuter les migrations
docker compose --env-file ./api/docker/../.env -f ./api/docker/docker-compose.dev.yml exec actograph-v3-api-dev yarn migration:run

# Installer les dépendances
docker compose --env-file ./api/docker/../.env -f ./api/docker/docker-compose.dev.yml exec actograph-v3-api-dev yarn install
```

### Frontend

Toutes les commandes frontend doivent être exécutées dans le conteneur Docker `actograph-v3-front-dev` :

```bash
# Accéder à la console du conteneur Frontend
sh front/docker/compose.sh console

# Installer les dépendances
docker compose --env-file ./front/docker/../.env -f ./front/docker/docker-compose.dev.yml exec actograph-v3-front-dev yarn install
```

## Déploiement

Pour déployer l'application en production :

```bash
bash scripts/publish.sh prod [major|minor|patch]
```

Cette commande :
1. Incrémente la version dans les `package.json`
2. Crée un commit avec la nouvelle version
3. Crée un tag Git au format `prod-vX.Y.Z`
4. Déclenche le pipeline CI/CD pour le déploiement

Consultez [deployment.md](docs/deployment.md) pour plus de détails.

## Technologies utilisées

### Backend
- **NestJS** : Framework Node.js pour l'API
- **TypeORM** : ORM pour la gestion de la base de données
- **PostgreSQL/SQLite** : Bases de données
- **JWT** : Authentification par tokens
- **Passport** : Middleware d'authentification

### Frontend
- **Quasar Framework** : Framework Vue.js pour applications web et desktop
- **Vue.js 3** : Framework JavaScript réactif
- **TypeScript** : Typage statique
- **PixiJS** : Bibliothèque de rendu graphique 2D pour les graphiques
- **Axios** : Client HTTP

## Contribution

Pour contribuer au projet, veuillez :
1. Créer une branche depuis `main`
2. Effectuer vos modifications
3. Créer une pull request avec une description détaillée

## Licence

Ce projet est privé et propriétaire.

## Support

Pour toute question ou problème, contactez l'équipe de développement.
