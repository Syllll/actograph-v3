# Feature - Intégration vidéo

**Statut** : ✅ **Implémenté**

## Description

Cette feature permet d'intégrer une vidéo dans l'application au niveau de la page Readings. La vidéo permet de travailler en mode "chronomètre" où les dates sont présentées comme des durées depuis un point de référence (t0).

### Fonctionnalités principales

1. **Sélection et affichage de vidéo** :
   - Permettre de choisir un fichier vidéo local
   - Sauvegarder le chemin du fichier en mémoire
   - Afficher la vidéo dans une vue en haut de la page Readings
   - Permettre de redimensionner la vue vidéo via un bouton glissant (slider)
   - La vidéo doit conserver son ratio d'aspect lors du redimensionnement

2. **Mode chronomètre** :
   - Activer un mode "chronomètre" quand une vidéo est chargée
   - Le Reading passe en mode "chronometer"
   - Une date pré-définie (9 février 1989) représente le t0
   - Dans ce mode, les dates affichées et manipulées au niveau des relevés sont présentées comme des durées
   - Le user manipule une durée avec msec, sec, min, hour, days

3. **Synchronisation vidéo/observation** :
   - Quand on démarre la vidéo, c'est équivalent au "Démarrer observation"
   - On peut alors saisir des relevés via les boutons
   - Chaque relevé introduit une encoche au niveau de son horodatage sur la barre de défilement de la vidéo

---

## Plan d'implémentation

### Phase 0 : Backend - Ajouter les champs dans l'entité Observation

#### 0.1 Ajouter videoPath et mode dans l'entité Observation
**Fichiers à modifier** :
- `api/src/core/observations/entities/observation.entity.ts`
- `api/src/core/observations/controllers/observation.controller.ts` (DTOs)
- `front/src/services/observations/interface.ts`

**Fichiers à créer** :
- Migration pour ajouter les champs

**Tâches** :
- [x] Créer un enum `ObservationModeEnum` avec `Calendar` et `Chronometer`
- [x] Ajouter `@Column({ nullable: true }) videoPath?: string | null` dans l'entité
- [x] Ajouter `@Column({ type: 'varchar', enum: ObservationModeEnum, nullable: true }) mode?: ObservationModeEnum` dans l'entité
- [x] Créer la migration : `api/migrations/1746000000000-add-video-path-and-mode-to-observation.ts`
- [x] Mettre à jour les DTOs (CreateObservationDto, UpdateObservationDto)
- [x] Mettre à jour l'interface `IObservation` dans le frontend
- [x] Ajouter la route PATCH pour mettre à jour l'observation
- [x] Ajouter la méthode `update()` dans ObservationService

### Phase 1 : Infrastructure de base - Mode chronomètre

#### 1.1 Ajouter l'état du mode chronomètre dans le composable observation
**Fichiers à modifier** :
- `front/src/composables/use-observation/index.ts`

**Tâches** :
- [x] Détecter le mode depuis `currentObservation.mode` (via `isChronometerMode` computed)
- [x] Ajouter `CHRONOMETER_T0: Date` (9 février 1989) comme constante
- [x] Ajouter une méthode pour convertir une date en durée depuis t0 (`dateToDuration`)
- [x] Ajouter une méthode pour convertir une durée en date depuis t0 (`durationToDate`)
- [x] Ajouter une méthode pour formater une date comme durée (`formatDateAsDuration`)
- [x] Le mode est figé une fois défini (ne peut pas être changé)

#### 1.2 Créer un composable pour gérer les durées
**Fichiers à créer** :
- `front/src/composables/use-duration/index.ts`

**Tâches** :
- [x] Créer un composable pour formater les durées (msec, sec, min, hour, days)
- [x] Créer des méthodes pour parser les durées depuis un string (`parseCompact`)
- [x] Créer des méthodes pour convertir entre différentes unités (`millisecondsToParts`, `partsToMilliseconds`)
- [x] Créer des méthodes pour convertir date ↔ durée (`dateToDuration`, `durationToDate`)
- [x] Créer une méthode de validation (`validateParts`)

### Phase 2 : Composant vidéo et intégration dans la page

#### 2.1 Créer le composant vidéo avec redimensionnement
**Fichiers à créer** :
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`

**Tâches** :
- [x] Créer un composant vidéo avec `<video>` HTML5
- [x] Ajouter un slider horizontal pour redimensionner la hauteur de la vidéo
- [x] Conserver le ratio d'aspect lors du redimensionnement
- [x] Ajouter les contrôles vidéo de base (play/pause, volume, timeline)
- [x] Créer une timeline personnalisée avec des encoches (traits verticaux)
- [x] Gérer le chargement du fichier vidéo depuis un chemin
- [x] Ajouter la sélection de fichier vidéo via Electron API
- [x] **Optimisation performance : utilisation du protocole `file://` pour streaming natif**
- [x] **Vérification de taille de fichier avec avertissement pour fichiers volumineux**

#### 2.2 Intégrer le composant vidéo dans la page Readings
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/Index.vue`

**Tâches** :
- [x] Ajouter le composant VideoPlayer en haut de la page
- [x] Gérer l'affichage conditionnel (afficher seulement si vidéo chargée)
- [x] Le slider de redimensionnement est intégré dans VideoPlayer

#### 2.3 Ajouter la sélection de fichier vidéo
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`

**Tâches** :
- [x] Ajouter un bouton pour sélectionner un fichier vidéo (dans VideoPlayer)
- [x] Utiliser l'API Electron `showOpenDialog` pour sélectionner le fichier
- [x] Sauvegarder le chemin du fichier via `updateObservation()`
- [x] Charger le fichier vidéo depuis le chemin sauvegardé (`videoPath` dans l'observation)

### Phase 3 : Mode chronomètre - Affichage et édition des durées

#### 3.1 Modifier l'affichage des dates dans ReadingsTable en mode chronomètre
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/readings-side/ReadingsTable.vue`

**Tâches** :
- [x] Détecter si on est en mode chronomètre (via `observation.isChronometerMode.value`)
- [x] Afficher les durées au lieu des dates quand en mode chronomètre
- [x] Utiliser le composable duration pour formater les durées
- [x] Afficher le format compact : "Xj Yh Zm Ws Vms" (ex: "2j 3h 15m 30s 500ms")

#### 3.2 Modifier l'édition des dates en mode chronomètre
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/readings-side/ReadingsTable.vue`

**Tâches** :
- [x] Créer un popup d'édition pour les durées (au lieu de date/heure)
- [x] Permettre l'édition avec des champs séparés pour days, hours, min, sec, msec
- [x] Convertir la durée saisie en date (t0 + durée) avant de sauvegarder
- [x] Valider les valeurs saisies (via `validateParts`)

### Phase 4 : Synchronisation vidéo/observation

#### 4.1 Synchroniser le démarrage de la vidéo avec l'observation
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`
- `front/src/composables/use-observation/index.ts`

**Tâches** :
- [x] Démarrer l'observation (`startTimer`) quand la vidéo démarre
- [x] Mettre en pause l'observation quand la vidéo est en pause
- [x] Arrêter l'observation quand la vidéo s'arrête
- [x] Synchroniser `elapsedTime` avec le temps de la vidéo (`currentTime`)

#### 4.2 Ajouter les encoches sur la barre de défilement de la vidéo
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`

**Tâches** :
- [x] Créer une timeline personnalisée avec des encoches (traits verticaux)
- [x] Calculer la position de chaque encoche basée sur la dateTime du relevé
- [x] Afficher les encoches comme des traits verticaux sur la timeline
- [x] Permettre de cliquer sur une encoche pour aller à ce moment de la vidéo
- [x] Mettre à jour les encoches quand les relevés changent (watcher)
- [x] Ajouter des tooltips sur les encoches avec la durée formatée

#### 4.3 Activation automatique des boutons lors de la lecture vidéo
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`
- `front/src/pages/userspace/observation/_components/buttons-side/Index.vue`
- `front/src/composables/use-observation/index.ts`

**Tâches** :
- [x] Détecter le relevé actuel basé sur le temps de la vidéo (currentTime)
- [x] Trouver le dernier relevé par catégorie avant ou à l'instant t
- [x] Activer automatiquement le bouton correspondant à l'observable du relevé
- [x] Désactiver le bouton quand il n'y a pas de relevé pour cette catégorie
- [x] Gérer correctement les observables continus (un observable reste actif jusqu'à ce qu'un autre de la même catégorie soit activé)
- [x] Mise à jour des boutons lors du déplacement du curseur vidéo
- [x] **Optimisation : utilisation de `requestAnimationFrame` pour la synchronisation**

### Phase 5 : Persistance et améliorations

#### 5.1 Sauvegarder le chemin vidéo
**Fichiers à modifier** :
- `front/src/composables/use-observation/index.ts`
- `front/src/services/observations/index.service.ts`

**Tâches** :
- [x] Sauvegarder le chemin vidéo dans l'observation via l'API (PATCH observation)
- [x] Charger le chemin vidéo depuis l'observation au chargement (via `currentObservation.videoPath`)
- [x] Gérer le cas où le fichier n'existe plus
- [x] Permettre de définir le mode (Calendar/Chronometer) lors de la création/modification de l'observation
- [x] Interface utilisateur pour choisir le mode lors de la création

#### 5.2 Améliorer l'UX
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`
- `front/src/pages/userspace/observation/_components/ObservationToolbar.vue`

**Tâches** :
- [x] Afficher un indicateur visuel quand on est en mode chronomètre (chip dans la toolbar)
- [x] Améliorer le design du slider de redimensionnement (valeurs par défaut, limites, bouton reset)
- [x] Ajouter des tooltips sur les encoches de la timeline
- [x] Ajouter des messages d'aide et d'erreur
- [x] Indicateur de chargement pendant le chargement de la vidéo
- [x] Overlay d'erreur avec possibilité de sélectionner un nouveau fichier

### Phase 6 : Optimisations de performance

#### 6.1 Refactorisation du chargement vidéo
**Tâches** :
- [x] **Refactorisation : utilisation du protocole `file://` au lieu du chargement en mémoire**
  - Avant : Chargement complet en mémoire via `readFileBinary` (base64 → blob) → ~1.5 GB RAM pour 500 MB vidéo
  - Après : Streaming natif via `file://` → ~5-10 MB RAM (buffer de lecture uniquement)
  - Bénéfices : Chargement instantané, pas de blocage UI, consommation mémoire réduite de 99%

#### 6.2 Vérification de taille de fichier
**Tâches** :
- [x] Vérification de l'existence et du type de fichier
- [x] Avertissement si fichier > 500 MB
- [x] Affichage de la taille formatée (B, KB, MB, GB)

#### 6.3 Optimisations des watchers
**Tâches** :
- [x] Utilisation de `requestAnimationFrame` pour la synchronisation des boutons
- [x] Debounce de 100 ms sur le watcher `currentTime` pour éviter les mises à jour excessives
- [x] Protection contre division par zéro dans le calcul de progression
- [x] Nettoyage correct des timers dans `onUnmounted`

### Phase 7 : Restructuration UX de la page Observation

#### 7.1 Restructuration du layout
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/Index.vue`

**Tâches** :
- [x] Restructuration complète du layout avec splitters horizontaux et verticaux
- [x] Création de `CalendarToolbar` et `ModeToggle` pour séparer les responsabilités
- [x] Implémentation de `ResizeObserver` pour gérer dynamiquement la hauteur du splitter
- [x] Correction des problèmes de scrollbar verticale indésirable
- [x] Correction du redimensionnement de la vidéo lors du drag du séparateur

---

## Fichiers créés/modifiés

### Backend

**Créés** :
- `api/migrations/1746000000000-add-video-path-and-mode-to-observation.ts`

**Modifiés** :
- `api/src/core/observations/entities/observation.entity.ts`
- `api/src/core/observations/controllers/observation.controller.ts`
- `api/src/core/observations/services/observation/index.service.ts`

### Frontend

**Créés** :
- `front/src/composables/use-duration/index.ts`
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`

**Modifiés** :
- `front/src/composables/use-observation/index.ts`
- `front/src/composables/use-observation/use-readings.ts`
- `front/src/pages/userspace/observation/Index.vue`
- `front/src/pages/userspace/observation/_components/readings-side/ReadingsTable.vue`
- `front/src/pages/userspace/observation/_components/buttons-side/Index.vue`
- `front/src/pages/userspace/observation/_components/ObservationToolbar.vue`
- `front/src/pages/userspace/home/_components/active-chronicle/CreateObservationDialog.vue`
- `front/src/services/observations/interface.ts`
- `front/src/services/observations/index.service.ts`
- `front/src-electron/electron-main.ts`
- `front/src-electron/electron-preload.ts`

---

## Notes techniques

### Mode chronomètre
- Le t0 est fixé au **9 février 1989** (date pré-définie)
- En mode chronomètre, toutes les dates sont converties en durées depuis t0
- Les durées sont affichées avec les unités : msec, sec, min, hour, days
- La conversion se fait dans les deux sens : date → durée et durée → date

### Vidéo
- Utiliser l'élément HTML5 `<video>` natif
- **Optimisation performance : utilisation du protocole `file://` pour streaming natif**
- Le chemin du fichier vidéo est sauvegardé dans l'entité Observation (backend)
- Support Electron pour accéder aux fichiers locaux

### Synchronisation
- Quand la vidéo démarre, l'observation démarre automatiquement
- Le temps de la vidéo (`video.currentTime`) est synchronisé avec `elapsedTime`
- Les relevés créés pendant la lecture vidéo ont leur `dateTime` calculé comme : t0 + elapsedTime

### Redimensionnement
- Utiliser un slider horizontal pour ajuster la hauteur de la zone vidéo
- Slider avec limites min/max (100px-600px), valeur par défaut (300px)
- Conserver le ratio d'aspect de la vidéo lors du redimensionnement
- Bouton de réinitialisation pour revenir à la valeur par défaut

### ResizeObserver
- Le `ResizeObserver` est CRITIQUE pour le bon fonctionnement du splitter
- Il permet au splitter de s'adapter aux changements de taille de la fenêtre
- Nettoyage correct dans `onUnmounted` pour éviter les fuites mémoire

---

## Problèmes rencontrés

### Migration SQLite - Type enum
- **Problème** : SQLite ne supporte pas le type "Object" pour les enums TypeORM
- **Solution** : Ajout explicite de `type: 'varchar'` dans la définition de la colonne `mode`

### Performance - Chargement vidéo en mémoire
- **Problème** : Le chargement vidéo via `readFileBinary` chargeait tout le fichier en mémoire
- **Impact** : Pour une vidéo de 500 MB → ~1.5 GB RAM, blocage UI pendant le chargement
- **Solution** : Refactorisation pour utiliser le protocole `file://` directement, permettant le streaming natif
- **Résultat** : Consommation mémoire réduite de 99% (~5-10 MB au lieu de 1.5 GB), chargement instantané

### Logique d'activation des boutons
- **Problème** : La logique initiale ne gérait pas correctement les observables continus par catégorie
- **Solution** : Refactorisation pour trouver le dernier relevé par catégorie séparément

---

## Améliorations futures possibles

- Permettre de changer le mode avant la première sauvegarde
- Améliorer la gestion des formats vidéo non supportés
- Ajouter des raccourcis clavier pour contrôler la vidéo
- Permettre de synchroniser plusieurs vidéos avec la même observation
- Ajouter une prévisualisation de la vidéo avant chargement (durée, résolution, codec)

