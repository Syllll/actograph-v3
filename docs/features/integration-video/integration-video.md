# Feature - Intégration vidéo

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

## État actuel du projet

### Ce qui existe déjà

✅ **Page Readings** :
- Page principale : `front/src/pages/userspace/observation/Index.vue`
- Composant Readings : `front/src/pages/userspace/observation/_components/readings-side/Index.vue`
- Table des relevés : `front/src/pages/userspace/observation/_components/readings-side/ReadingsTable.vue`
- Structure avec splitter pour séparer les boutons et les relevés

✅ **Composable Observation** :
- `front/src/composables/use-observation/index.ts` : Gestion de l'état de l'observation
- `front/src/composables/use-observation/use-readings.ts` : Gestion des relevés
- Méthodes pour démarrer/pause/stop l'observation
- Gestion du timer avec `elapsedTime` et `startTime`
- Formatage de durée : `formatDuration(seconds: number)`

✅ **Toolbar d'observation** :
- `front/src/pages/userspace/observation/_components/ObservationToolbar.vue`
- Boutons play/pause/stop
- Affichage du temps écoulé

✅ **Gestion des dates dans ReadingsTable** :
- Édition des dates/heures dans le tableau
- Format : `DD/MM/YYYY HH:mm:ss.SSS`
- Utilisation de `q-date` et `q-time` pour l'édition

✅ **Composants de sélection de fichier** :
- `front/lib-improba/components/app/buttons/DFileSelectBtn.vue` : Bouton pour sélectionner un fichier
- `front/lib-improba/components/app/inputs/DFilePicker.vue` : Input pour sélectionner un fichier
- Support Electron pour accéder aux fichiers locaux

✅ **Interface IReading** :
- `front/src/services/observations/interface.ts`
- Propriété `dateTime: Date` pour stocker la date/heure

### Ce qui existe maintenant

✅ **Composant vidéo** :
- Composant VideoPlayer créé avec contrôles complets
- Gestion du redimensionnement avec slider horizontal
- Conservation du ratio d'aspect
- Timeline personnalisée avec encoches (traits verticaux)

✅ **Mode chronomètre** :
- Détection du mode chronomètre via `currentObservation.mode`
- Conversion des dates en durées depuis t0 (9 février 1989)
- Affichage des durées dans le tableau (format compact : "Xj Yh Zm Ws Vms")
- Édition des durées avec champs séparés (days, hours, min, sec, msec)

✅ **Synchronisation vidéo/observation** :
- Démarrer l'observation quand la vidéo démarre
- Synchroniser le temps de la vidéo avec `elapsedTime`
- Encoches sur la barre de défilement de la vidéo pour chaque relevé
- Mise à jour des boutons lors du déplacement du curseur vidéo

✅ **Stockage du chemin vidéo** :
- Champ `videoPath` ajouté dans l'entité Observation (backend)
- Sauvegarde du chemin du fichier vidéo dans l'observation
- Chargement du fichier vidéo depuis le chemin sauvegardé

✅ **Mode de l'observation** :
- Champ `mode` ajouté dans l'entité Observation (backend) : `Calendar` ou `Chronometer`
- Le mode est figé une fois choisi (ne peut pas être changé)
- État dans le composable observation pour indiquer le mode
- t0 (9 février 1989) géré pour le mode chronomètre

✅ **Activation automatique des boutons** :
- Activation automatique des boutons selon la position de la vidéo
- Détection du relevé actuel basé sur le temps de la vidéo
- Gestion correcte des observables continus par catégorie
- Un observable reste actif jusqu'à ce qu'un autre de la même catégorie soit activé

### Ce qui reste à faire

✅ **Toutes les fonctionnalités principales sont implémentées**

Les fonctionnalités suivantes ont été complétées :
- ✅ Gestion des erreurs si le fichier vidéo n'existe plus
- ✅ Interface pour choisir le mode lors de la création d'observation
- ✅ Indicateur visuel pour le mode chronomètre
- ✅ Améliorations du slider de redimensionnement

Voir `integration-video-done.md` pour les détails complets de l'implémentation.

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
- [ ] Exécuter la migration dans le conteneur Docker (à faire quand le conteneur sera démarré)
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
- `front/src/pages/userspace/observation/_components/ObservationToolbar.vue` (ou créer un nouveau composant)

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

#### 4.4 Activation automatique des boutons lors de la lecture vidéo
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

#### 4.3 Synchroniser le temps de la vidéo avec elapsedTime
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`
- `front/src/composables/use-observation/index.ts`

**Tâches** :
- [x] Mettre à jour `elapsedTime` en fonction de `video.currentTime` (dans `handleTimeUpdate`)
- [x] Watcher sur `currentTime` pour détecter les changements même sans interaction utilisateur
- [x] Gérer la conversion entre le temps vidéo et le temps d'observation (via t0)

### Phase 5 : Persistance et améliorations

#### 5.1 Sauvegarder le chemin vidéo
**Fichiers à modifier** :
- `front/src/composables/use-observation/index.ts`
- `front/src/services/observations/index.service.ts`

**Tâches** :
- [x] Sauvegarder le chemin vidéo dans l'observation via l'API (PATCH observation)
- [x] Charger le chemin vidéo depuis l'observation au chargement (via `currentObservation.videoPath`)
- [ ] Gérer le cas où le fichier n'existe plus (à faire)
- [x] Permettre de définir le mode (Calendar/Chronometer) lors de la création/modification de l'observation
- [ ] Interface utilisateur pour choisir le mode lors de la création (à faire)

#### 5.2 Améliorer l'UX
**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`
- `front/src/pages/userspace/observation/_components/ObservationToolbar.vue`

**Tâches** :
- [ ] Afficher un indicateur visuel quand on est en mode chronomètre (à faire)
- [ ] Permettre de désactiver le mode chronomètre (retour au mode normal) - Note: Le mode est figé, donc cette fonctionnalité n'est pas nécessaire
- [ ] Améliorer le design du slider de redimensionnement (valeurs par défaut, limites) (à faire)
- [x] Ajouter des tooltips sur les encoches de la timeline
- [ ] Ajouter des messages d'aide et d'erreur (à faire)

---

## Structure des fichiers à créer/modifier

### Nouveaux fichiers

```
front/src/
├── composables/
│   └── use-duration/
│       └── index.ts                    # Composable pour gérer les durées
└── pages/userspace/observation/
    └── _components/
        └── VideoPlayer.vue             # Composant vidéo avec contrôles et timeline
```

### Fichiers à modifier

```
front/src/
├── composables/
│   └── use-observation/
│       └── index.ts                    # Ajouter état mode chronomètre et méthodes
└── pages/userspace/observation/
    ├── Index.vue                       # Intégrer VideoPlayer
    └── _components/
        ├── readings-side/
        │   └── ReadingsTable.vue       # Modifier affichage/édition dates en mode chronomètre
        └── ObservationToolbar.vue     # Optionnel : ajouter bouton sélection vidéo
```

---

## Priorités

### Priorité haute (MVP)
1. Phase 1 : Infrastructure de base - Mode chronomètre
2. Phase 2 : Composant vidéo et intégration dans la page
3. Phase 3 : Mode chronomètre - Affichage et édition des durées
4. Phase 4.1 : Synchroniser le démarrage de la vidéo avec l'observation

### Priorité moyenne
5. Phase 4.2 : Ajouter les encoches sur la barre de défilement de la vidéo
6. Phase 4.3 : Synchroniser le temps de la vidéo avec elapsedTime
7. Phase 5.1 : Sauvegarder le chemin vidéo

### Priorité basse (bonus)
8. Phase 5.2 : Améliorer l'UX

---

## Notes techniques

### Mode chronomètre
- Le t0 est fixé au **9 février 1989** (date pré-définie)
- En mode chronomètre, toutes les dates sont converties en durées depuis t0
- Les durées sont affichées avec les unités : msec, sec, min, hour, days
- La conversion se fait dans les deux sens : date → durée et durée → date

### Vidéo
- Utiliser l'élément HTML5 `<video>` natif
- Le chemin du fichier vidéo est sauvegardé localement (localStorage)
- Le fichier vidéo doit être accessible localement (pas de serveur nécessaire)
- Support Electron pour accéder aux fichiers locaux

### Synchronisation
- Quand la vidéo démarre, l'observation démarre automatiquement
- Le temps de la vidéo (`video.currentTime`) est synchronisé avec `elapsedTime`
- Les relevés créés pendant la lecture vidéo ont leur `dateTime` calculé comme : t0 + elapsedTime

### Redimensionnement
- Utiliser un slider horizontal pour ajuster la hauteur de la zone vidéo
- Slider classique (q-slider)
- Conserver le ratio d'aspect de la vidéo lors du redimensionnement
- La largeur s'ajuste automatiquement pour maintenir le ratio

### Encoches sur la timeline
- Chaque relevé crée une encoche (trait vertical) sur la barre de défilement de la vidéo
- Les encoches sont des traits verticaux indiquant la présence d'un relevé à cet endroit
- La position de l'encoche = (dateTime du relevé - t0) / durée totale de la vidéo
- Permettre de cliquer sur une encoche pour sauter à ce moment de la vidéo

### Mode de l'observation
- Le mode peut être `Calendar` (par défaut) ou `Chronometer`
- Le mode est figé une fois choisi (ne peut pas être changé)
- Si une observation existe déjà, le mode est figé selon ce qui a été choisi
- En mode Chronometer, les dates sont affichées comme des durées depuis t0

### Format des durées
- Format d'affichage : Format compact "Xj Yh Zm Ws Vms" (ex: "2j 3h 15m 30s 500ms")
- Format compact : "Xj Yh Zm Ws Vms" ou "HH:mm:ss.SSS" si < 24h
- Format d'édition : Champs séparés pour chaque unité (days, hours, min, sec, msec)

---

## Décisions prises

1. **Stockage du chemin vidéo** : 
   - ✅ Ajouter le champ `videoPath` dans l'entité Observation (backend)

2. **Format d'affichage des durées** :
   - ✅ Format compact : "Xj Yh Zm Ws Vms" (ex: "2j 3h 15m 30s 500ms")

3. **Comportement du slider de redimensionnement** :
   - ✅ Slider horizontal classique (q-slider)
   - ✅ Pour ajuster la hauteur de la zone vidéo

4. **Encoches sur la timeline** :
   - ✅ Traits verticaux indiquant la présence d'un relevé

5. **Mode de l'observation** :
   - ✅ Le mode peut être `Calendar` ou `Chronometer`
   - ✅ Le mode est figé une fois choisi (ne peut pas être changé)
   - ✅ Si une observation existe déjà, le mode est figé selon ce qui a été choisi

6. **Activation automatique des boutons** :
   - ✅ Quand la vidéo passe sur un relevé, activer automatiquement le bouton correspondant
   - ✅ Si on passe un relevé A alors le bouton A doit s'enclencher
   - ✅ Gestion correcte des observables continus : un observable reste actif jusqu'à ce qu'un autre de la même catégorie soit activé
   - ✅ Mise à jour des boutons lors du déplacement du curseur vidéo

---

## État d'avancement

### ✅ Phases terminées

- **Phase 0** : Backend - Ajout des champs `videoPath` et `mode` dans l'entité Observation
- **Phase 1** : Infrastructure - Composable duration et gestion du mode chronomètre
- **Phase 2** : Composant vidéo et intégration dans la page
- **Phase 3** : Mode chronomètre - Affichage et édition des durées
- **Phase 4** : Synchronisation vidéo/observation et activation automatique des boutons

### ✅ Toutes les fonctionnalités sont implémentées

#### Gestion des erreurs et cas limites ✅
- ✅ Gestion du cas où le fichier vidéo n'existe plus (chemin invalide)
- ✅ Affichage d'un message d'erreur approprié avec overlay
- ✅ Possibilité de sélectionner un nouveau fichier si l'ancien n'existe plus
- ✅ Indicateur de chargement pendant le chargement de la vidéo

#### Interface utilisateur pour le mode ✅
- ✅ Sélecteur de mode (Calendar/Chronometer) dans le dialog de création d'observation
- ✅ Descriptions des modes pour aider l'utilisateur à choisir
- ✅ Validation que le mode est requis lors de la création
- ✅ Le mode est figé une fois l'observation créée

#### Améliorations UX ✅
- ✅ Indicateur visuel (chip "Mode Chronomètre") dans la toolbar d'observation
- ✅ Slider de redimensionnement amélioré (limites min/max 100px-600px, valeur par défaut 300px, bouton de réinitialisation)
- ✅ Messages d'erreur explicites avec actions possibles
- ✅ Affichage conditionnel du composant vidéo selon la présence de `videoPath`

#### Migration
- ⚠️ À exécuter dans le conteneur Docker quand il sera démarré

---

## Documentation de l'implémentation

- **`integration-video-done.md`** : Détails complets de ce qui a été implémenté, les problèmes rencontrés et les solutions apportées
- **`architecture-technique.md`** : Documentation technique détaillée de l'architecture, des composants et de leur interaction
- **`ux-refactor-toolbar.md`** : Documentation du refactoring de la toolbar d'observation

