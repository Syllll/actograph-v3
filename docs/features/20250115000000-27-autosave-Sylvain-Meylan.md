# Feature #27 - Autosave

**Issue GitHub** : [#27](https://github.com/Syllll/actograph-v3/issues/27)  
**Priorité** : P2-Should Have  
**Statut** : ✅ **Implémenté**

## Description

Système de sauvegarde automatique périodique des observations pour permettre la restauration en cas d'arrêt inattendu de l'application.

---

## Plan d'implémentation

### Phase 1 : Infrastructure de base

#### 1.1 Composable autosave
**Fichiers à créer** :
- `front/src/composables/use-autosave/index.ts`

**Tâches** :
- [x] Créer le composable avec état partagé réactif
- [x] Implémenter la sauvegarde automatique toutes les 5 minutes
- [x] Détecter les changements avec hash amélioré
- [x] Sauvegarder uniquement si des modifications détectées
- [x] Gérer l'état partagé entre toutes les instances

#### 1.2 Service autosave
**Fichiers à créer** :
- `front/src/services/observations/autosave.service.ts`

**Tâches** :
- [x] Créer le service pour interagir avec les fichiers autosave
- [x] Implémenter `saveToAutosave()` : Sauvegarde dans le dossier autosave
- [x] Implémenter `listAutosaveFiles()` : Liste tous les fichiers autosave
- [x] Implémenter `deleteAutosaveFile()` : Supprime un fichier spécifique
- [x] Implémenter `cleanupOldFiles()` : Nettoie les fichiers anciens (>7 jours)

### Phase 2 : Handlers IPC Electron

#### 2.1 Handlers IPC
**Fichiers à modifier** :
- `front/src-electron/electron-main.ts`
- `front/src-electron/electron-preload.ts`

**Tâches** :
- [x] Ajouter le handler `get-autosave-folder` : Retourne le chemin du dossier autosave
- [x] Ajouter le handler `list-autosave-files` : Liste les fichiers dans le dossier autosave
- [x] Ajouter le handler `delete-autosave-file` : Supprime un fichier autosave
- [x] Ajouter le handler `cleanup-old-autosave` : Nettoie les fichiers anciens

### Phase 3 : Restauration automatique

#### 3.1 Détection au démarrage
**Fichier à modifier** :
- `front/src/pages/Index.vue`

**Tâches** :
- [x] Détecter les fichiers autosave récents (<24h)
- [x] Vérifier si l'observation actuelle a une sauvegarde manuelle récente (<1h)
- [x] Proposition de restauration via dialogue
- [x] Sélection du fichier à restaurer via `AutosaveFilePicker`
- [x] Import et création d'une nouvelle observation avec préfixe "Restauration auto - "
- [x] Suppression du fichier autosave après restauration réussie

#### 3.2 Composant de sélection
**Fichiers à créer** :
- `front/src/components/autosave-file-picker/Index.vue`

**Tâches** :
- [x] Créer le composant pour lister les fichiers autosave disponibles
- [x] Afficher le nom de l'observation extrait du nom de fichier
- [x] Afficher la date et heure de sauvegarde formatées
- [x] Afficher la taille du fichier
- [x] Tri par date (plus récent en premier)
- [x] Sélection visuelle avec highlight

### Phase 4 : Nettoyage automatique

#### 4.1 Nettoyage
**Tâches** :
- [x] Suppression des fichiers autosave après sauvegarde manuelle réussie
- [x] Nettoyage des fichiers anciens (>7 jours) au démarrage
- [x] Conservation des 5 fichiers les plus récents par observation
- [x] Nettoyage automatique au démarrage de l'application

### Phase 5 : Amélioration du hash

#### 5.1 Hash complet
**Tâches** :
- [x] Améliorer le hash pour inclure TOUTES les entités liées à l'observation
- [x] Inclure les lectures (readings) avec toutes leurs propriétés
- [x] Inclure le protocole avec hash du contenu (pas seulement updatedAt)
- [x] Inclure l'activity graph si présent
- [x] Utiliser les données depuis les composables Vue (plus fiables)

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

## Notes techniques

### Hash de détection de changements

Le système utilise un hash complet qui inclut **TOUTES les entités associées à l'observation** pour garantir la détection de tous les changements, même si l'`updatedAt` de l'observation elle-même ne change pas.

#### Propriétés incluses :
- Observation : ID, nom, description, videoPath, mode, createdAt, updatedAt
- Readings : Toutes les lectures avec leurs propriétés complètes (ID, updatedAt, dateTime, type, name)
- Protocole : ID, updatedAt, hash du contenu des items
- ActivityGraph : ID, updatedAt (si présent)

#### Sources de données :
Le hash utilise les données depuis les composables Vue (`useObservation`, `useReadings`, `useProtocol`) plutôt que directement depuis l'objet observation, car :
- Les composables maintiennent toujours les données à jour
- Les lectures peuvent être modifiées sans que `observation.readings` soit mis à jour immédiatement
- Le protocole peut être modifié sans que `observation.protocol` soit mis à jour

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

## Améliorations futures possibles

- Configuration de l'intervalle d'autosave par l'utilisateur
- Notification visuelle lors de l'autosave (optionnelle)
- Compression des fichiers autosave pour économiser l'espace
- Sauvegarde différentielle (seulement les changements)

