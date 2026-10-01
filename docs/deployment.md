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
| `prod-vX.Y.Z-mobile` | production | Android (Play production) et iOS (soumission App Review, publication après approbation) |
| `preprod-vX.Y.Z-mobile` | préproduction | Android (Play beta) et téléversement iOS vers App Store Connect |
| `prod-vX.Y.Z-android` / `preprod-vX.Y.Z-android` | selon préfixe | Android uniquement |
| `prod-vX.Y.Z-ios` / `preprod-vX.Y.Z-ios` | selon préfixe | iOS uniquement : soumission App Review en `prod`, téléversement en `preprod` |
| `prod-vX.Y.Z-desktop-mobile` | production | bureau, Android et iOS |
| `preprod-vX.Y.Z-desktop-mobile` | préproduction | bureau, Android et iOS |

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

# Les deux plateformes mobiles, Android seul, iOS seul, ou bureau + mobile
bash scripts/publish.sh prod mobile
bash scripts/publish.sh prod android
bash scripts/publish.sh preprod ios
bash scripts/publish.sh preprod desktop-mobile patch
```

### Ce que fait le script

1. **Vérification des versions** : le bureau compare frontend et API. Le mobile compare `mobile/package.json` et `mobile/src-capacitor/package.json`. `desktop-mobile` exige que les trois lignes soient déjà au même numéro.
2. **Vérification des tags existants** : compare avec les tags du même canal qui embarquent la même plateforme. Un tag `-mobile` compte pour Android et iOS.
3. **Incrémentation de version** : met à jour les `package.json` de la cible
4. **Commit et push** : crée un commit avec la nouvelle version et le pousse sur le dépôt distant
5. **Création du tag** : `prod-vX.Y.Z` pour le bureau. Le suffixe `-mobile`, `-android`, `-ios` ou `-desktop-mobile` sélectionne les autres cibles. Le canal `preprod` remplace le préfixe `prod`.
6. **Push du tag** : pousse le tag pour déclencher `.github/workflows/publish.yml`

### Pipeline CI/CD

Le workflow `.github/workflows/publish.yml` lit le tag (`scripts/release-tag.sh`), puis lance les jobs demandés. Le job bureau utilise toujours l'environnement GitHub `deploy`, là où sont les certificats Electron. Les jobs Android et iOS utilisent `deploy` en production et `preprod` en préproduction.

Le bureau produit les installeurs Electron et une release GitHub. En `preprod`, cette release est marquée prerelease, donc les clients Electron de production ne la prennent pas.

### Diagnostic de notarisation macOS et reprise

Le workflow manuel `desktop-notary-check.yml` vérifie l'accès à `notarytool`
avec les deux méthodes configurées dans l'environnement `deploy` : Apple ID
et clé API App Store Connect. Il ne construit ni ne publie d'application,
et ne journalise pas les secrets ni l'historique des soumissions.

```bash
gh workflow run desktop-notary-check.yml --ref main
gh run list --workflow desktop-notary-check.yml --limit 1
gh run view <run-id> --log-failed
```

Une erreur JSON d'`@electron/notarize` peut masquer la réponse réelle d'Apple.
Si le diagnostic affiche HTTP 403 avec « A required agreement is missing or
has expired », le titulaire du compte (Account Holder) doit accepter l'accord
demandé sur [Apple Developer](https://developer.apple.com/account/).
Apple précise que [le titulaire signe les accords mis à jour pour son équipe](https://developer.apple.com/help/account/access/roles/).
Changer de méthode d'authentification ne résout pas cet accord manquant.

Après résolution et réussite du diagnostic, relancer **tout** le workflow de
publication existant, car l'échec d'une plateforme peut annuler les autres :

```bash
gh run rerun <publication-run-id>
```

Ne pas relancer `scripts/publish.sh` pour cette reprise : le tag existe déjà et
le script créerait une nouvelle version. Vérifier ensuite la réussite de toutes
les plateformes, la publication effective de la release GitHub, ses installeurs
et ses fichiers de mise à jour. Un tag poussé ou un build Linux réussi ne suffit
pas à confirmer la mise en production.

### Android

`bash scripts/publish.sh prod android` publie Android seul ; `prod mobile` déclenche Android et iOS :

1. Il incrémente `mobile/package.json` et `mobile/src-capacitor/package.json`, puis pousse le tag correspondant.
2. La CI réécrit cette version dans les deux `package.json`. Gradle en déduit `versionName` et `versionCode` (`major * 10000 + minor * 100 + patch`, donc `0.0.96` donne `96`).
3. Java 21 et les lockfiles Yarn figés sont utilisés pour produire `mobile/actograph-mobile-release.aab`, signé avec le keystore, via `scripts/build-android.sh release --aab`.
4. `scripts/verify-android-16k.sh` contrôle l'alignement ZIP de l'AAB et les segments ELF de toutes les bibliothèques natives. La publication s'arrête si la compatibilité avec les pages mémoire de 16 Ko n'est pas démontrée.
5. L'AAB est envoyé sur l'application `com.actograph.mobile`. La piste est `production` pour `prod`, et `beta` (test ouvert) pour `preprod`.
6. Le même AAB est joint à la release GitHub.

Secrets des environnements `deploy` et `preprod` :

| Secret | Rôle |
|--------|------|
| `ANDROID_KEYSTORE_BASE64` | keystore d'envoi, fichier `actograph-release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | mot de passe du keystore |
| `ANDROID_KEY_ALIAS` | alias de la clé |
| `ANDROID_KEY_PASSWORD` | mot de passe de la clé |
| `PLAY_SERVICE_ACCOUNT_JSON` | clé du compte `actograph-play-service-account@actograph-play.iam.gserviceaccount.com` |

Le `versionCode` envoyé doit être strictement supérieur à celui déjà présent sur Play. Le script refuse aussi de recréer un tag qui existe déjà.
Avec cette formule, les composantes `minor` et `patch` doivent rester inférieures à 100 ; après `0.0.99`, utiliser un incrément `minor` plutôt qu'un `patch`.

### iOS

`bash scripts/publish.sh preprod ios` crée une release iOS seule. `-mobile` et `-desktop-mobile` lancent le même job iOS en plus des autres cibles.

1. Le runner `macos-26` utilise Xcode 26 et CocoaPods pour synchroniser le projet Capacitor versionné dans `mobile/src-capacitor/ios/`.
2. `scripts/build-ios.sh` construit les packages partagés, l'application Quasar, une archive Xcode signée et `mobile/actograph-mobile-release.ipa`. `MARKETING_VERSION` vient du tag ; `CURRENT_PROJECT_VERSION` suit la formule `major * 10000 + minor * 100 + patch`.
3. La CI envoie l'IPA à App Store Connect avec une clé API. En `preprod`, le build reste disponible dans App Store Connect : l'affectation à un groupe TestFlight n'est pas automatisée. En `prod`, la CI attend que **ce build et cette version** soient traités, crée ou retrouve la version App Store, affecte le build, renseigne les notes de version de `mobile/app-store-release-notes.json`, choisit la publication automatique après approbation et soumet la version à l'App Review. Il n'est pas nécessaire de se connecter à App Store Connect à chaque sortie si la fiche est déjà complète.
4. L'IPA est conservée comme artefact de la CI et jointe à la release GitHub.

La release iOS met à jour la fiche App Store existante (Apple ID `1320016064`, Bundle ID `com.symalgo-tech.actograph`). Le projet Xcode, le profil de provisioning et la soumission API utilisent cet identifiant iOS. Android conserve `com.actograph.mobile` dans Gradle et dans la configuration Capacitor partagée. Les tags `mobile`, `android` et `ios` incrémentent la même version mobile.

Avant la soumission à l'App Review, la fiche App Store doit avoir des captures d'écran pour les tailles d'appareils actuellement exigées, un questionnaire d'âge complet, des réponses de confidentialité publiées et une déclaration de chiffrement pour le build. Apple peut exiger de nouveaux formats ou de nouvelles réponses même si une ancienne version est déjà en ligne. En cas de refus, le script de soumission affiche les erreurs détaillées renvoyées par Apple. Une fois la fiche corrigée, il peut reprendre la même version et le même build sans réimporter l'IPA.

Pour reprendre une version déjà téléversée après correction de la fiche, lancer le workflow manuel `ios-submit.yml` avec son numéro de version, par exemple `gh workflow run ios-submit.yml -f version=1.3.4`. Il recherche le build Apple correspondant, réutilise le brouillon de revue existant et soumet la version avec publication automatique après approbation. Ne pas créer un nouveau tag pour cette reprise : Apple refuse un second téléversement avec le même numéro de build.

Avant le premier tag iOS de production, installer la version App Store `1.3.1` sur un appareil avec des données réelles, puis installer le nouveau build via TestFlight et vérifier que ces données restent accessibles. Le Bundle ID identique conserve le conteneur de l'app, mais ne valide pas à lui seul la migration de la base SQLite ou des préférences de l'ancienne version.

Retrouver l'App ID explicite existant `com.symalgo-tech.actograph` dans Apple Developer, puis vérifier qu'un certificat **Apple Distribution** avec sa clé privée et un profil **App Store** valide sont disponibles pour cet App ID. Ajouter les secrets suivants dans les environnements GitHub `deploy` et `preprod` (les mêmes valeurs peuvent servir aux deux) :

Configuration actuelle : équipe Apple `JZ2M998YMV`, profil `ActoGraph App Store CI`, certificat et profil valides jusqu'au 29 septembre 2027. Leurs fichiers privés sont conservés hors du dépôt, dans le dossier `ios-signing` du workspace parent.

| Secret | Rôle |
|--------|------|
| `IOS_TEAM_ID` | Team ID Apple Developer |
| `IOS_CERTIFICATE_BASE64` | certificat de distribution `.p12` encodé en Base64 |
| `IOS_CERTIFICATE_PASSWORD` | mot de passe du `.p12` |
| `IOS_PROVISIONING_PROFILE_BASE64` | profil App Store `.mobileprovision` encodé en Base64 |
| `IOS_PROVISIONING_PROFILE_NAME` | nom exact du profil dans Apple Developer |
| `APP_STORE_CONNECT_API_KEY_ID` | identifiant de la clé API App Store Connect |
| `APP_STORE_CONNECT_API_ISSUER_ID` | issuer ID de cette clé |
| `APP_STORE_CONNECT_API_KEY_BASE64` | contenu du fichier `AuthKey_*.p8` encodé en Base64 |

La clé API d'équipe doit pouvoir téléverser les builds **et soumettre les versions à l'App Review** (rôle App Manager). Une clé d'équipe a accès à toutes les apps du compte selon son rôle ; elle ne peut pas être limitée à ActoGraph. Le numéro de build iOS doit être inédit pour cette version dans App Store Connect. Les secrets ne sont jamais versionnés.

Avant le premier tag iOS, vérifier la fiche iOS existante dans App Store Connect : contrats, informations de confidentialité, classement par âge, captures, disponibilité, détails nécessaires à l'examen et conformité du chiffrement. Au moins une localisation de la version doit être présente. La CI met à jour « Nouveautés » pour chaque localisation : ajouter toute nouvelle langue à `mobile/app-store-release-notes.json`, puis adapter les textes avant chaque tag `prod-ios` ou `prod-mobile`. `scripts/publish.sh` inclut les notes modifiées dans le commit du tag iOS de production. Si Apple signale une information manquante ou rejette la version, la CI échoue avec l'erreur API et une intervention dans App Store Connect peut être nécessaire. L'approbation humaine d'Apple reste obligatoire ; avec `AFTER_APPROVAL`, la mise en ligne se fait ensuite automatiquement selon la disponibilité configurée. Un nouveau tag `prod-ios` reconstruit et retéléverse une nouvelle version ; il ne promeut pas le build TestFlight précédent.

Le premier `pod install` sur macOS génère `mobile/src-capacitor/ios/App/Podfile.lock`. Versionner ce fichier après un build local validé pour figer les dépendances natives avant la release CI.

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
