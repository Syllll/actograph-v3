# Feature #27 - Autosave

**Issue GitHub** : [#27](https://github.com/Syllll/actograph-v3/issues/27)  
**Priorité** : P2-Should Have  
**Statut** : ✅ **Implémenté**

## Description

Système de sauvegarde automatique périodique des observations pour permettre la restauration en cas d'arrêt inattendu de l'application.

---

## Fonctionnalités implémentées

### 1. Sauvegarde automatique périodique

**Composable** : `front/src/composables/use-autosave/index.ts`

**Fonctionnalités** :
- ✅ Sauvegarde automatique toutes les 5 minutes
- ✅ Détection intelligente des changements avec hash amélioré
- ✅ Sauvegarde uniquement si des modifications détectées
- ✅ Gestion de l'état partagé entre toutes les instances

**Détection de changements** :
- Hash complet incluant TOUTES les entités liées à l'observation
- Comparaison avec le dernier hash sauvegardé
- Évite les sauvegardes inutiles
- Détecte les changements même si l'`updatedAt` de l'observation ne change pas

### 2. Service autosave

**Service** : `front/src/services/observations/autosave.service.ts`

**Fonctionnalités** :
- ✅ `saveToAutosave()` : Sauvegarde dans le dossier autosave
- ✅ `listAutosaveFiles()` : Liste tous les fichiers autosave
- ✅ `deleteAutosaveFile()` : Supprime un fichier spécifique
- ✅ `cleanupOldFiles()` : Nettoie les fichiers anciens (>7 jours)

**Format des fichiers** :
- Nom : `autosave_{observationId}_{nom_observation}_{timestamp}.jchronic`
- Format : JSON identique aux exports manuels (.jchronic)
- Emplacement : `{userData}/autosave/` (dossier de données Electron)

### 3. Restauration automatique au démarrage

**Fichier** : `front/src/pages/Index.vue`

**Fonctionnalités** :
- ✅ Détection des fichiers autosave récents (<24h)
- ✅ Vérification si l'observation actuelle a une sauvegarde manuelle récente (<1h)
- ✅ Proposition de restauration via dialogue
- ✅ Sélection du fichier à restaurer via `AutosaveFilePicker`
- ✅ Import et création d'une nouvelle observation avec préfixe "Restauration auto - "
- ✅ Suppression du fichier autosave après restauration réussie

### 4. Dialogue de sélection de fichier

**Composant** : `front/src/components/autosave-file-picker/Index.vue`

**Fonctionnalités** :
- ✅ Liste des fichiers autosave disponibles
- ✅ Affichage du nom de l'observation extrait du nom de fichier
- ✅ Date et heure de sauvegarde formatées
- ✅ Taille du fichier
- ✅ Tri par date (plus récent en premier)
- ✅ Sélection visuelle avec highlight

### 5. Nettoyage automatique

**Fonctionnalités** :
- ✅ Suppression des fichiers autosave après sauvegarde manuelle réussie
- ✅ Nettoyage des fichiers anciens (>7 jours) au démarrage
- ✅ Conservation des 5 fichiers les plus récents par observation
- ✅ Nettoyage automatique au démarrage de l'application

---

## Architecture technique

### Backend

Aucun backend nécessaire, tout est géré côté Electron.

### Frontend

**IPC Handlers** (dans `front/src-electron/electron-main.ts`) :
- `get-autosave-folder` : Retourne le chemin du dossier autosave
- `list-autosave-files` : Liste les fichiers dans le dossier autosave
- `delete-autosave-file` : Supprime un fichier autosave
- `cleanup-old-autosave` : Nettoie les fichiers anciens

**Composable** : `front/src/composables/use-autosave/index.ts`
- État partagé réactif
- Méthodes : `start()`, `stop()`, `performAutosave()`, `cleanupOnStartup()`
- Watchers pour détecter les changements d'observation
- Fonction `generateObservationHash()` : génère un hash complet incluant toutes les entités liées
  - Utilise les données depuis `useObservation()`, `useReadings()`, `useProtocol()` pour garantir la fraîcheur des données
  - Hash JSON de toutes les propriétés pertinentes pour détecter tous les changements

**Service** : `front/src/services/observations/autosave.service.ts`
- Méthodes pour interagir avec les fichiers autosave
- Réutilise `observationService.exportObservation()` pour le format

---

## Fichiers créés/modifiés

### Créés

- `front/src/composables/use-autosave/index.ts`
- `front/src/services/observations/autosave.service.ts`
- `front/src/components/autosave-file-picker/Index.vue`

### Modifiés

- `front/src/pages/Index.vue` : Ajout de la logique de restauration au démarrage
- `front/src-electron/electron-main.ts` : Ajout des handlers IPC
- `front/src-electron/electron-preload.ts` : Exposition des APIs autosave
- `front/src/services/observations/export.service.ts` : Suppression des fichiers autosave après export manuel

---

## Configuration

**Constantes** :
- `AUTOSAVE_INTERVAL_MS` : 5 minutes (300 000 ms)
- `MAX_AUTOSAVE_FILES` : 5 fichiers par observation
- `MAX_AUTOSAVE_AGE_DAYS` : 7 jours

**Dossier autosave** :
- Windows : `%APPDATA%/Actograph/autosave/`
- macOS : `~/Library/Application Support/Actograph/autosave/`
- Linux : `~/.config/Actograph/autosave/`

---

## Flux d'utilisation

### Sauvegarde automatique

1. L'utilisateur modifie une observation
2. Toutes les 5 minutes, le système vérifie les changements
3. Si des changements détectés, sauvegarde dans le dossier autosave
4. Nettoyage des anciens fichiers (garder seulement les 5 plus récents)

### Restauration après crash

1. Au démarrage, l'application vérifie les fichiers autosave récents
2. Si des fichiers trouvés et pas de sauvegarde manuelle récente :
   - Dialogue : "Des sauvegardes automatiques récentes ont été trouvées..."
3. Si l'utilisateur accepte :
   - Ouverture du dialogue de sélection de fichier
   - L'utilisateur choisit le fichier à restaurer
4. Import du fichier sélectionné
5. Création d'une nouvelle observation avec préfixe "Restauration auto - "
6. Suppression du fichier autosave restauré

---

## Notes techniques

### Hash de détection de changements

Le système utilise un hash complet qui inclut **TOUTES les entités associées à l'observation** pour garantir la détection de tous les changements, même si l'`updatedAt` de l'observation elle-même ne change pas.

#### Propriétés de l'observation incluses :
- ID, nom, description, videoPath, mode
- `createdAt` et `updatedAt`

#### Toutes les lectures (readings) incluses :
- **Chaque lecture** avec ses propriétés complètes :
  - ID (ou tempId pour les lectures non sauvegardées)
  - `updatedAt` (détecte les modifications)
  - `dateTime` (détecte les changements de timing)
  - `type` (START, STOP, PAUSE_START, PAUSE_END, DATA)
  - `name` (nom de l'observable)
- Les lectures sont triées par ID pour un hash cohérent
- **Détecte** : ajouts, modifications, suppressions de lectures

#### Protocole inclus :
- ID et `updatedAt` du protocole
- **Hash du contenu des items** (pas seulement la longueur)
  - Utilise un algorithme de hash simple mais efficace sur le contenu JSON
  - Détecte les changements même si `updatedAt` ne change pas
- Longueur du contenu pour une détection rapide

#### ActivityGraph inclus (si présent) :
- ID et `updatedAt` de l'activity graph

#### Sources de données :
Le hash utilise les données depuis les composables Vue (`useObservation`, `useReadings`, `useProtocol`) plutôt que directement depuis l'objet observation, car :
- Les composables maintiennent toujours les données à jour
- Les lectures peuvent être modifiées sans que `observation.readings` soit mis à jour immédiatement
- Le protocole peut être modifié sans que `observation.protocol` soit mis à jour

#### Avantages de cette approche :
- ✅ Détecte **tous** les changements, même si l'`updatedAt` de l'observation ne change pas
- ✅ Détecte les ajouts de lectures (problème résolu)
- ✅ Détecte les modifications de lectures existantes
- ✅ Détecte les suppressions de lectures
- ✅ Détecte les changements de protocole même si `updatedAt` ne change pas
- ✅ Évite les sauvegardes inutiles quand rien n'a changé
- ✅ Performant : utilise un hash plutôt qu'une comparaison complète des données

### Format de fichier

Les fichiers autosave utilisent le même format que les exports manuels (.jchronic), ce qui permet :
- Réutilisation du code d'export/import existant
- Cohérence du format
- Facilité de restauration

### Gestion des erreurs

- Gestion silencieuse des erreurs (pas de notification si l'autosave échoue)
- Logs dans la console pour le debugging
- L'application continue de fonctionner même si l'autosave échoue

---

## Améliorations apportées

### Hash complet pour détection de tous les changements (2025-01-XX)

**Problème identifié** : Le système de hash initial ne détectait pas les ajouts de lectures car il se basait uniquement sur `readingsCount` et `lastReadingTime`, et sur `updatedAt` de l'observation qui ne change pas lors de l'ajout de lectures.

**Solution implémentée** :
- Hash complet incluant **toutes** les lectures avec leurs propriétés complètes
- Utilisation des données depuis les composables Vue (plus fiables que `observation.readings`)
- Hash du contenu du protocole (pas seulement `updatedAt`)
- Inclusion de toutes les entités liées (observation, readings, protocol, activityGraph)

**Résultat** : Le système détecte maintenant **tous** les changements, même si l'`updatedAt` de l'observation ne change pas.

---

## Améliorations futures possibles

- Configuration de l'intervalle d'autosave par l'utilisateur
- Notification visuelle lors de l'autosave (optionnelle)
- Compression des fichiers autosave pour économiser l'espace
- Sauvegarde différentielle (seulement les changements)

---

## Date d'implémentation

**Date** : 2025-01-XX  
**Statut** : ✅ Complété

