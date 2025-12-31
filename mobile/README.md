# ActoGraph Mobile

Application mobile **gratuite** et **100% offline** pour observations comportementales, basée sur Quasar + Capacitor.

## 🎁 Gratuit et accessible

- **Aucune licence requise** - L'app mobile est entièrement gratuite
- **Pas de compte utilisateur** - Utilisation immédiate sans inscription
- **100% local** - Vos données restent privées sur votre appareil
- **Pas de connexion internet** - Fonctionne entièrement hors ligne

## Fonctionnalités

- ✅ Créer et charger des chroniques (observations)
- ✅ Observation en temps réel avec catégories et boutons
- ✅ Consultation des relevés (tableau read-only)
- ✅ Visualisation du graphique d'activité
- ✅ Import de fichiers `.chronic` et `.jchronic`
- ✅ Mode 100% offline avec SQLite

## Navigation

L'application propose 4 onglets principaux :

| Onglet | Description |
|--------|-------------|
| **Accueil** | Créer/charger une chronique, voir les statistiques |
| **Observation** | Enregistrer des relevés avec les boutons de catégories |
| **Relevés** | Consulter tous les relevés dans un tableau |
| **Graph** | Visualiser le graphique d'activité |

## Différences avec la version web

| Fonctionnalité | Mobile | Web |
|----------------|--------|-----|
| Prix | Gratuit | Licence requise |
| Connexion | Offline | Online |
| Statistiques | ❌ | ✅ |
| Customisation graphique | ❌ | ✅ |
| Mode vidéo | ❌ | ✅ |

---

## 🚀 Setup sur une nouvelle machine

### 1. Prérequis système

- **Node.js** 18 ou 20
- **Yarn** 1.22+
- **Java JDK** 17+ (OpenJDK recommandé)
- **Android Studio** (dernière version stable)

### 2. Configuration du `.bashrc` (ou `.zshrc`)

Ajoutez ces variables d'environnement à votre fichier `~/.bashrc` :

```bash
# Android SDK (ajuster le chemin selon votre installation)
export ANDROID_HOME="$HOME/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export PATH="$PATH:$ANDROID_HOME/emulator"
export PATH="$PATH:$ANDROID_HOME/platform-tools"
export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"

# Android Studio (pour Quasar/Capacitor)
# Ajuster le chemin selon votre installation d'Android Studio
export CAPACITOR_ANDROID_STUDIO_PATH="/chemin/vers/android-studio/bin/studio.sh"
# Exemple : export CAPACITOR_ANDROID_STUDIO_PATH="$HOME/programs/android-studio/bin/studio.sh"

# Java (si pas déjà configuré)
# export JAVA_HOME="/usr/lib/jvm/java-17-openjdk"
```

Après modification, rechargez le fichier :
```bash
source ~/.bashrc
```

### 3. Configuration Android Studio

1. **Ouvrir Android Studio** et aller dans `Settings > Languages & Frameworks > Android SDK`
2. **Installer** les SDK Platform pour Android 13 (API 33) ou supérieur
3. **Installer** les outils : Android SDK Build-Tools, Android Emulator, Android SDK Platform-Tools
4. **Créer un émulateur** : Tools > Device Manager > Create Device
   - Recommandé : Pixel 6 avec Android 14 (API 34)

### 4. Configuration JDK dans Android Studio

Si vous avez l'erreur "Invalid Gradle JDK configuration" :
1. Dans Android Studio, cliquez sur le lien **"Use Embedded JDK"**
2. Ou allez dans `File > Settings > Build > Gradle` et sélectionnez le JDK intégré

### 5. Installation des dépendances

```bash
# Depuis la racine du monorepo
yarn install

# Ou depuis le dossier mobile
cd mobile
yarn install
```

---

## 💻 Développement

### Mode développement Android

```bash
cd mobile
yarn dev
# ou
./node_modules/.bin/quasar dev -m capacitor -T android
```

Quasar va :
1. Compiler l'application Vue.js
2. Démarrer un serveur de développement
3. Demander quelle IP utiliser (appuyer sur Entrée pour accepter)
4. Ouvrir Android Studio automatiquement
5. Lancer l'app sur l'émulateur

### Mode développement iOS (macOS uniquement)

```bash
yarn dev:ios
# ou
quasar dev -m capacitor -T ios
```

### Résolution de problèmes courants

#### L'app affiche un écran blanc ou le logo Quasar
- Vérifiez que le serveur de dev est bien démarré
- Vérifiez que l'émulateur peut accéder à l'IP de votre machine
- Essayez de relancer avec un "Cold Boot" de l'émulateur

#### "Channel is unrecoverably broken"
- Faites un Cold Boot de l'émulateur (Device Manager > 3 points > Cold Boot Now)
- Ou désinstallez l'app : `adb uninstall com.actograph.mobile`

#### Erreur Gradle JDK
- Dans Android Studio, cliquez sur "Use Embedded JDK"

#### Nettoyer le cache
```bash
cd mobile
rm -rf src-capacitor/android/app/build src-capacitor/android/.gradle node_modules/.cache .quasar
npx cap sync android
```

---

## 📦 Build

### Build Android (APK de debug)

```bash
yarn build
# ou
quasar build -m capacitor -T android
```

L'APK sera généré dans `src-capacitor/android/app/build/outputs/apk/debug/`

### Build iOS

```bash
yarn build:ios
# ou
quasar build -m capacitor -T ios
```

---

## 📁 Structure du projet

```
mobile/
├── src/
│   ├── boot/               # Fichiers de démarrage (i18n, capacitor, database)
│   ├── components/         # Composants Vue réutilisables
│   ├── composables/        # Composables Vue (useChronicle, useObservation)
│   ├── css/               # Styles SCSS
│   ├── database/          # Couche SQLite
│   │   ├── sqlite.service.ts
│   │   └── repositories/
│   ├── i18n/              # Internationalisation
│   ├── layouts/           # MainLayout avec navigation
│   ├── pages/             # Pages de l'application
│   │   ├── Index.vue      # Accueil
│   │   ├── observation/   # Page d'observation
│   │   ├── readings/      # Page des relevés
│   │   ├── graph/         # Page du graphique
│   │   └── settings/      # Paramètres
│   ├── router/            # Configuration du routeur
│   └── services/          # Services métier
├── src-capacitor/         # Configuration Capacitor
│   ├── capacitor.config.json  # ⚠️ Config principale (pas de .ts !)
│   └── android/           # Projet Android natif
├── public/                # Assets statiques
├── quasar.config.js       # Configuration Quasar
└── package.json
```

### ⚠️ Important : Configuration Capacitor

Utilisez **uniquement** `capacitor.config.json` (pas de fichier `.ts`).
Capacitor priorise le `.ts` sur le `.json`, ce qui peut causer des confusions.

---

## 🎨 Icônes et Splashscreens

Les icônes de l'application sont gérées avec **Icon Genie CLI**, l'outil officiel de Quasar.

### Image source

L'icône source se trouve dans `public/app-icon.png`. Pour une qualité optimale, utilisez une image **carrée** d'au moins **1024x1024 pixels** (idéalement 1240x1240).

### Générer l'icône source "AG"

L'icône "AG" est générée automatiquement avec un script Python pour garantir que le texte soit assez petit pour éviter que le cercle Android ne coupe les lettres :

```bash
cd mobile
python3 scripts/generate-icon.py
```

Ce script génère une icône 1024x1024 pixels avec le texte "AG" en orange centré et de taille réduite (28% de la taille de l'icône) pour laisser d'importantes marges blanches. Si vous devez ajuster la taille du texte, modifiez la valeur `0.28` dans le script (ligne 33).

### Installation de Icon Genie

```bash
npm install -g @quasar/icongenie
```

### Régénérer les icônes

Pour mettre à jour les icônes après modification de l'image source :

```bash
cd mobile
icongenie generate -i public/app-icon.png -m capacitor
```

Cette commande génère automatiquement :
- **Icônes Android** : `ic_launcher.png`, `ic_launcher_round.png`, `ic_launcher_foreground.png` (toutes densités)
- **Splashscreens Android** : Portrait et paysage (toutes densités)
- **Icônes iOS** : Toutes les tailles requises par l'App Store
- **Splashscreens iOS** : Format universel 2732x2732

### Options utiles

```bash
# Sans rogner l'image (garde les marges)
icongenie generate -i public/app-icon.png -m capacitor --skip-trim

# Avec une couleur de fond spécifique pour le splashscreen
icongenie generate -i public/app-icon.png -m capacitor --splashscreen-color "#ffffff"

# Avec un logo différent pour le splashscreen
icongenie generate -i public/app-icon.png -b public/splash-bg.png -m capacitor
```

### Fichiers générés

Les icônes sont générées dans :
- `src-capacitor/android/app/src/main/res/mipmap-*/` (icônes Android)
- `src-capacitor/android/app/src/main/res/drawable*/` (splashscreens Android)
- `src-capacitor/ios/App/App/Assets.xcassets/` (icônes et splashscreens iOS)

> 📖 Documentation complète : https://quasar.dev/icongenie/introduction

---

## 🏗️ Architecture

L'application utilise :
- **Quasar Framework** : UI et framework Vue.js 3
- **Capacitor** : Bridge natif pour Android/iOS
- **SQLite** : Base de données locale (@capacitor-community/sqlite)
- **@actograph/core** : Logique métier partagée (import, validation)
- **@actograph/graph** : Composant de visualisation du graphique

### Couleurs (cohérentes avec le frontend)

| Couleur | Valeur | Usage |
|---------|--------|-------|
| Primary | `#1f2937` | Header, footer |
| Accent | `#f97316` | Boutons principaux, highlights |
| Secondary | `#64748b` | Textes secondaires |
| Positive | `#10b981` | Succès, démarrage |
| Negative | `#ef4444` | Erreurs, arrêt |
| Warning | `#f59e0b` | Pause, attention |

---

## 🗄️ Base de données SQLite

Le schéma de base de données comprend :
- `observations` : Observations comportementales
- `protocols` : Protocoles d'observation
- `protocol_items` : Catégories et observables
- `readings` : Données enregistrées

Les migrations sont gérées automatiquement au démarrage de l'application.

---

## 📦 Dépendance aux packages partagés

Cette application utilise :

### @actograph/core
- Parser les fichiers `.chronic` (Chronic v1)
- Parser les fichiers `.jchronic` (JSON)
- Valider les données d'observation

### @actograph/graph
- Afficher le graphique d'activité
- Visualisation des relevés dans le temps
