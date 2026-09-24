# Déploiement

Ce document décrit les procédures de déploiement de l'application ActoGraph v3 en environnement de production.

## Vue d'ensemble

L'application peut être déployée de deux manières :
1. **Déploiement automatique** : Via CI/CD avec des tags Git
2. **Déploiement manuel** : Via Docker Compose en mode production

## Déploiement automatique

### Processus

Le déploiement automatique est déclenché par un tag Git :

| Tag | Canal | Build |
|-----|-------|-------|
| `prod-vX.Y.Z` ou `prod-vX.Y.Z-desktop` | production | bureau Electron |
| `preprod-vX.Y.Z` ou `preprod-vX.Y.Z-desktop` | préproduction | bureau Electron, release GitHub en prerelease |
| `prod-vX.Y.Z-mobile` | production | AAB Android, piste Play production |
| `preprod-vX.Y.Z-mobile` | préproduction | AAB Android, piste Play test ouvert |
| `prod-vX.Y.Z-desktop-mobile` | production | bureau et Android (piste production) |
| `preprod-vX.Y.Z-desktop-mobile` | préproduction | bureau en prerelease et Android en test ouvert |

`bash scripts/publish.sh prod` produit le même tag que `bash scripts/publish.sh prod desktop`.

### Script de publication

Utilisez le script `scripts/publish.sh` pour créer automatiquement un tag et déclencher le déploiement :

```bash
# Bureau en production, incrément patch (défaut). Équivaut à : prod desktop
bash scripts/publish.sh prod

# Bureau en production, incrément choisi
bash scripts/publish.sh prod major
bash scripts/publish.sh prod minor
bash scripts/publish.sh prod patch

# Android seul, ou bureau et Android ensemble
bash scripts/publish.sh prod mobile
bash scripts/publish.sh preprod desktop-mobile patch
```

### Ce que fait le script

1. **Vérification des versions** : le bureau compare frontend et API. Le mobile compare `mobile/package.json` et `mobile/src-capacitor/package.json`. `desktop-mobile` exige que les trois lignes soient déjà au même numéro.
2. **Vérification des tags existants** : compare avec les tags du même canal qui embarquent la même cible
3. **Incrémentation de version** : met à jour les `package.json` de la cible
4. **Commit et push** : crée un commit avec la nouvelle version et le pousse sur le dépôt distant
5. **Création du tag** : `prod-vX.Y.Z` pour le bureau. Le suffixe `-mobile` ou `-desktop-mobile` est ajouté quand la cible n'est pas le bureau seul. Le canal `preprod` remplace le préfixe `prod`.
6. **Push du tag** : pousse le tag pour déclencher `.github/workflows/publish.yml`

### Pipeline CI/CD

Le workflow `.github/workflows/publish.yml` lit le tag (`scripts/release-tag.sh`), puis lance les jobs demandés. Le job bureau utilise toujours l'environnement GitHub `deploy`, là où sont les certificats Electron. Le job mobile utilise `deploy` en production et `preprod` en préproduction.

Le bureau produit les installeurs Electron et une release GitHub. En `preprod`, cette release est marquée prerelease, donc les clients Electron de production ne la prennent pas.

### Android

`bash scripts/publish.sh prod mobile` enchaîne la publication mobile :

1. Il incrémente `mobile/package.json` et `mobile/src-capacitor/package.json`, puis pousse le tag `prod-vX.Y.Z-mobile`.
2. La CI réécrit cette version dans les deux `package.json`. Gradle en déduit `versionName` et `versionCode` (`major * 10000 + minor * 100 + patch`, donc `0.0.96` donne `96`).
3. `scripts/build-android.sh release --aab` produit `mobile/actograph-mobile-release.aab`, signé avec le keystore.
4. L'AAB est envoyé sur l'application `com.actograph.mobile`. La piste est `production` pour `prod`, et `beta` (test ouvert) pour `preprod`.
5. Le même AAB est joint à la release GitHub.

Secrets des environnements `deploy` et `preprod` :

| Secret | Rôle |
|--------|------|
| `ANDROID_KEYSTORE_BASE64` | keystore d'envoi, fichier `actograph-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | alias de la clé |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé |
| `PLAY_SERVICE_ACCOUNT_JSON` | clé du compte `actograph-play-service-account@actograph-play.iam.gserviceaccount.com` |

Le `versionCode` envoyé doit être strictement supérieur à celui déjà présent sur Play. Le script refuse aussi de recréer un tag qui existe déjà.

`desktop-mobile` n'est possible que si `front`, `api` et `mobile` sont déjà au même numéro. Le script les incrémente alors ensemble.

## Déploiement manuel

### Prérequis

- Docker et Docker Compose installés
- Fichiers `.env` configurés pour la production
- Accès au serveur de déploiement

### Configuration

1. **Variables d'environnement**

   Créez un fichier `.env` à la racine du projet avec les variables suivantes :

   ```env
   # Base de données
   DB_TYPE=postgres
   DB_HOST=actograph-v3-api-db
   DB_PORT=5432
   DB_USERNAME=votre_utilisateur
   DB_PASSWORD=votre_mot_de_passe
   DB_NAME=actograph
   DB_SSLCERT=

   # JWT
   JWT_SECRET=votre_secret_jwt_tres_securise

   # Ports
   BACKEND_DOCKER_APP_PORT_EXPOSED=3235
   BACKEND_DOCKER_PSQL_PORT_EXPOSED=5633
   ```

2. **Build des images Docker**

   ```bash
   # Build de l'image de la base de données
   docker compose -f api/docker/docker-compose.yml build actograph-v3-api-db

   # Build de l'image de l'API
   docker compose -f api/docker/docker-compose.yml build actograph-v3-api
   ```

### Démarrage

Pour démarrer l'application en mode production :

```bash
# Définir le mode production
export COMPOSE_MODE=production

# Démarrer les conteneurs
sh compose.sh up -d
```

Ou directement :

```bash
COMPOSE_MODE=production sh compose.sh up -d
```

### Migrations de base de données

Les migrations TypeORM doivent être exécutées avant le premier démarrage ou après chaque mise à jour :

```bash
# Accéder au conteneur API
docker exec -it actograph-v3-api bash

# Exécuter les migrations
yarn migration:run
```

### Vérification

Vérifiez que les conteneurs sont bien démarrés :

```bash
docker ps
```

Vous devriez voir :
- `actograph-v3-api` : Conteneur de l'API
- `actograph-v3-api-db` : Conteneur de la base de données PostgreSQL

### Logs

Pour consulter les logs :

```bash
# Logs de l'API
docker logs -f actograph-v3-api

# Logs de la base de données
docker logs -f actograph-v3-api-db
```

## Configuration Docker Compose Production

Le fichier `api/docker/docker-compose.yml` définit les services de production :

- **actograph-v3-api** : Service de l'API NestJS
  - Port exposé : `BACKEND_DOCKER_APP_PORT_EXPOSED` (défaut : 3235)
  - Volumes : `.env` et `uploads`
  - Dépend de : `actograph-v3-api-db`

- **actograph-v3-api-db** : Service PostgreSQL
  - Port exposé : `BACKEND_DOCKER_PSQL_PORT_EXPOSED` (défaut : 5633)
  - Volume persistant : `actograph-v3-api-db`

## Mise à jour

Pour mettre à jour l'application :

1. **Récupérer les dernières modifications**

   ```bash
   git pull origin main
   ```

2. **Rebuild les images**

   ```bash
   docker compose -f api/docker/docker-compose.yml build
   ```

3. **Redémarrer les conteneurs**

   ```bash
   COMPOSE_MODE=production sh compose.sh down
   COMPOSE_MODE=production sh compose.sh up -d
   ```

4. **Exécuter les migrations** (si nécessaire)

   ```bash
   docker exec -it actograph-v3-api yarn migration:run
   ```

## Sauvegarde de la base de données

### Sauvegarde manuelle

```bash
# Créer une sauvegarde
docker exec actograph-v3-api-db pg_dump -U $DB_USERNAME $DB_NAME > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurer une sauvegarde
docker exec -i actograph-v3-api-db psql -U $DB_USERNAME $DB_NAME < backup_YYYYMMDD_HHMMSS.sql
```

### Sauvegarde automatique

Configurez un cron job pour effectuer des sauvegardes régulières :

```bash
# Ajouter au crontab
0 2 * * * docker exec actograph-v3-api-db pg_dump -U $DB_USERNAME $DB_NAME > /backups/actograph_$(date +\%Y\%m\%d).sql
```

## Rollback

En cas de problème après un déploiement :

1. **Identifier le tag de la version précédente**

   ```bash
   git tag -l "prod-v*" | sort -V | tail -n 2
   ```

2. **Checkout la version précédente**

   ```bash
   git checkout prod-vX.Y.Z
   ```

3. **Rebuild et redémarrer**

   ```bash
   docker compose -f api/docker/docker-compose.yml build
   COMPOSE_MODE=production sh compose.sh down
   COMPOSE_MODE=production sh compose.sh up -d
   ```

## Sécurité

### Recommandations

1. **JWT Secret** : Utilisez un secret JWT fort et unique pour la production
2. **Mots de passe** : Utilisez des mots de passe forts pour la base de données
3. **Ports** : Limitez l'accès aux ports exposés avec un firewall
4. **HTTPS** : Configurez un reverse proxy (nginx) avec SSL/TLS
5. **Backups** : Effectuez des sauvegardes régulières de la base de données

### Reverse Proxy (Nginx)

Exemple de configuration Nginx pour HTTPS :

```nginx
server {
    listen 443 ssl;
    server_name votre-domaine.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3235;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring

### Health Check

L'API expose un endpoint de health check :

```bash
curl http://localhost:3235/health
```

### Logs applicatifs

Les logs de l'application sont disponibles via Docker :

```bash
# Logs en temps réel
docker logs -f actograph-v3-api

# Dernières 100 lignes
docker logs --tail 100 actograph-v3-api
```

## Dépannage

### Conteneur ne démarre pas

1. Vérifiez les logs : `docker logs actograph-v3-api`
2. Vérifiez les variables d'environnement
3. Vérifiez la connectivité à la base de données

### Erreurs de migration

1. Vérifiez que la base de données est accessible
2. Vérifiez les permissions de l'utilisateur de la base de données
3. Consultez les logs de migration dans les logs de l'API

### Problèmes de performance

1. Vérifiez l'utilisation des ressources : `docker stats`
2. Optimisez les requêtes de base de données
3. Augmentez les ressources allouées aux conteneurs

