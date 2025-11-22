# Architecture technique - Intégration vidéo

## Vue d'ensemble

Cette documentation décrit l'architecture technique de la fonctionnalité d'intégration vidéo dans l'application ActoGraph v3. Elle explique comment les différents composants interagissent pour permettre l'analyse vidéo en mode chronomètre.

## Architecture générale

### Structure des composants

```
Index.vue (Page principale)
├── VideoPlayer.vue (Lecteur vidéo)
│   ├── Élément <video> HTML5
│   ├── Timeline personnalisée avec encoches
│   └── Contrôles vidéo (play/pause, volume, vitesse)
├── CalendarToolbar.vue (Toolbar mode calendrier)
│   └── ModeToggle.vue (Bascule entre modes)
├── ButtonsSideIndex.vue (Boutons observables)
└── ReadingsSideIndex.vue (Tableau des relevés)
    └── ReadingsTable.vue
```

### Flux de données

```
Observation (Backend)
    ↓
useObservation (Composable)
    ↓
VideoPlayer → Synchronise elapsedTime
    ↓
ReadingsTable → Affiche durées en mode chronomètre
    ↓
ButtonsSideIndex → Active boutons selon temps vidéo
```

## Composants principaux

### 1. Index.vue - Page principale

**Rôle** : Orchestre l'affichage de tous les composants et gère le layout avec les splitters.

**Fonctionnalités clés** :
- Gestion de deux modes d'affichage (avec/sans vidéo)
- Splitter horizontal pour redimensionner la zone vidéo
- Splitter vertical pour séparer boutons et relevés
- ResizeObserver pour calculer dynamiquement la hauteur du splitter

**Points techniques importants** :
- Le `q-splitter` horizontal nécessite une hauteur explicite en pixels
- Le `ResizeObserver` met à jour cette hauteur dynamiquement
- La structure utilise flexbox (`column no-wrap`) pour éviter les débordements

**Code clé** :
```typescript
// ResizeObserver pour calculer la hauteur dynamiquement
const updateContainerHeight = () => {
  if (containerRef.value) {
    const height = containerRef.value.clientHeight;
    if (height > 0) {
      state.containerHeight = height;
    }
  }
};
```

### 2. VideoPlayer.vue - Lecteur vidéo

**Rôle** : Affiche et contrôle la vidéo, synchronise avec l'observation, active les boutons.

**Fonctionnalités clés** :
- Chargement vidéo via protocole `file://` (streaming natif)
- Timeline personnalisée avec encoches pour chaque relevé
- Synchronisation avec `elapsedTime` en mode chronomètre
- Activation automatique des boutons selon le temps vidéo
- Contrôles vidéo (play/pause, volume, vitesse de lecture)

**Points techniques importants** :

#### Chargement vidéo optimisé
- Utilisation du protocole `file://` au lieu de chargement en mémoire
- Avantage : Streaming natif, consommation mémoire réduite (~5-10 MB vs 1.5 GB)
- Vérification de taille de fichier avant chargement (avertissement si > 500 MB)

```typescript
// Conversion chemin → URL file://
const pathToFileUrl = (filePath: string): string => {
  // Normalisation et encodage du chemin
  const encodedPath = normalizedPath
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/');
  return `file:///${encodedPath}`;
};
```

#### Synchronisation vidéo/observation
- En mode chronomètre, `elapsedTime` = `video.currentTime`
- Les relevés créés utilisent `t0 + elapsedTime` comme `dateTime`
- Synchronisation via `handleTimeUpdate` appelé à chaque frame

#### Activation automatique des boutons
- Algorithme par catégorie continue :
  1. Convertit le temps vidéo en temps absolu (t0 + temps vidéo)
  2. Pour chaque catégorie, trouve le dernier relevé avant ou à l'instant t
  3. Active le bouton correspondant à l'observable de ce relevé
- Utilise `requestAnimationFrame` pour optimiser les performances
- Émet un événement `video-reading-active` avec les boutons actifs

**Code clé** :
```typescript
// Synchronisation du temps
handleTimeUpdate: () => {
  if (observation.isChronometerMode.value) {
    observation.sharedState.elapsedTime = state.currentTime;
    if (state.isPlaying) {
      requestAnimationFrame(() => {
        methods.activateButtonForCurrentReading();
      });
    }
  }
}
```

### 3. ModeToggle.vue - Bascule entre modes

**Rôle** : Permet de basculer entre mode Calendrier et Chronomètre.

**Fonctionnalités clés** :
- Affichage de deux boutons groupés (Calendrier / Chronomètre)
- Vérification que le mode peut être changé (observation non démarrée)
- Confirmation avant changement (action irréversible)
- Mise à jour de l'observation via API

**Points techniques importants** :
- Le mode ne peut être changé que si l'observation n'a pas été démarrée
- Une fois choisi, le mode est figé (contrainte métier)
- Utilise `updateObservation` pour persister le changement

### 4. CalendarToolbar.vue - Toolbar mode calendrier

**Rôle** : Affiche les contrôles d'observation en mode calendrier.

**Fonctionnalités clés** :
- Boutons play/pause et stop
- Bascule de mode (via ModeToggle)
- Affichage du timer (durée écoulée)

**Points techniques importants** :
- Affichée uniquement en mode calendrier
- Utilise les méthodes du composable `useObservation` pour contrôler l'observation

### 5. ReadingsTable.vue - Tableau des relevés

**Rôle** : Affiche et permet l'édition des relevés.

**Fonctionnalités clés** :
- Affichage conditionnel : durées en mode chronomètre, dates en mode calendrier
- Édition conditionnelle :
  - Mode chronomètre : champs séparés (jours, heures, minutes, secondes, millisecondes)
  - Mode calendrier : édition date/heure classique
- Conversion automatique entre durées et dates

**Points techniques importants** :
- Utilise `observation.isChronometerMode` pour déterminer le mode
- Conversion date ↔ durée via `chronometerMethods`
- Format d'affichage compact : "Xj Yh Zm Ws Vms"

### 6. ButtonsSideIndex.vue - Boutons observables

**Rôle** : Affiche les boutons pour créer des relevés.

**Fonctionnalités clés** :
- Affichage des catégories et observables du protocole
- Activation automatique selon le temps vidéo (en mode chronomètre)
- Création de relevés lors du clic sur un bouton

**Points techniques importants** :
- Écoute l'événement `video-reading-active` émis par VideoPlayer
- Active les boutons correspondants aux relevés actifs à l'instant t
- Gestion par catégorie pour respecter la logique des observables continus

## Composable useObservation

**Rôle** : Gère l'état global de l'observation.

**Fonctionnalités clés** :
- État de l'observation (currentObservation, isPlaying, elapsedTime)
- Méthodes chronomètre (dateToDuration, durationToDate, formatDateAsDuration)
- t0 fixé au 9 février 1989

**Points techniques importants** :
- `isChronometerMode` : computed qui vérifie `currentObservation.mode === 'chronometer'`
- `chronometerMethods` : méthodes pour convertir entre dates et durées
- `currentDate` : calculé différemment selon le mode (calendrier vs chronomètre)

## Composable useDuration

**Rôle** : Gère le formatage et la conversion des durées.

**Fonctionnalités clés** :
- Formatage compact : "Xj Yh Zm Ws Vms"
- Parsing de durées depuis un string
- Conversion entre différentes unités (millisecondes ↔ parties)
- Validation des valeurs saisies

## Gestion des modes

### Mode Calendrier (par défaut)
- Dates affichées et éditables comme dates/heures classiques
- Format : `DD/MM/YYYY HH:mm:ss.SSS`
- Utilise `q-date` et `q-time` pour l'édition

### Mode Chronomètre
- Dates affichées comme durées depuis t0 (9 février 1989)
- Format d'affichage : "Xj Yh Zm Ws Vms"
- Édition avec champs séparés (jours, heures, minutes, secondes, millisecondes)
- Conversion automatique : durée → date (t0 + durée)

**Contrainte importante** : Le mode est figé une fois choisi et ne peut pas être changé.

## Synchronisation vidéo/observation

### En mode chronomètre

1. **Démarrage vidéo** → Démarre l'observation (`startTimer()`)
2. **Pause vidéo** → Met en pause l'observation (`pauseTimer()`)
3. **Arrêt vidéo** → Arrête l'observation (`stopTimer()`)
4. **Temps vidéo** → Synchronisé avec `elapsedTime` de l'observation

### Calcul des dates des relevés

En mode chronomètre, les relevés créés utilisent :
```typescript
dateTime = t0 + elapsedTime
```

Où :
- `t0` = 9 février 1989 (date de référence)
- `elapsedTime` = temps écoulé depuis le début de l'observation (en secondes)

## Timeline personnalisée

### Encoches (notches)

Chaque relevé crée une encoche (trait vertical) sur la timeline de la vidéo.

**Calcul de position** :
```typescript
position = ((dateTime du relevé - t0) / durée totale de la vidéo) * 100
```

**Fonctionnalités** :
- Clic sur une encoche → Saute à ce moment de la vidéo
- Tooltip avec la durée formatée
- Mise à jour automatique quand les relevés changent

## Optimisations de performance

### Chargement vidéo
- **Avant** : Chargement complet en mémoire (base64 → blob) → ~1.5 GB RAM pour 500 MB vidéo
- **Après** : Streaming natif via `file://` → ~5-10 MB RAM (buffer de lecture uniquement)
- **Bénéfice** : Réduction de 99% de la consommation mémoire

### Synchronisation boutons
- Utilisation de `requestAnimationFrame` pour synchroniser avec le cycle de rendu
- Debounce de 100 ms sur le watcher `currentTime` pour éviter les mises à jour excessives
- Protection contre division par zéro dans les calculs

### Watchers optimisés
- Watcher sur `currentTime` avec debounce
- Watcher sur `readings` pour mettre à jour les encoches
- Nettoyage correct des timers dans `onUnmounted`

## Gestion des erreurs

### Fichier vidéo introuvable
- Vérification de l'existence du fichier avant chargement
- Overlay d'erreur avec message explicite
- Possibilité de sélectionner un nouveau fichier

### Fichier volumineux
- Vérification de la taille avant chargement
- Avertissement si fichier > 500 MB
- Affichage de la taille formatée (B, KB, MB, GB)

## Points d'attention pour la maintenance

1. **ResizeObserver** : Nécessaire pour le splitter horizontal, ne pas supprimer
2. **Mode figé** : Le mode ne peut pas être changé après création, s'assurer que l'utilisateur comprend cette contrainte
3. **Chemin vidéo** : Le chemin est sauvegardé mais il faut gérer le cas où le fichier n'existe plus
4. **Synchronisation** : La synchronisation vidéo/observation fonctionne uniquement en mode chronomètre
5. **Performance** : Le protocole `file://` est essentiel pour les gros fichiers, ne pas revenir au chargement en mémoire

## Évolutions futures possibles

1. Permettre de changer le mode avant la première sauvegarde
2. Améliorer la gestion des formats vidéo non supportés
3. Ajouter des raccourcis clavier pour contrôler la vidéo
4. Permettre de synchroniser plusieurs vidéos avec la même observation
5. Ajouter une prévisualisation de la vidéo avant chargement (durée, résolution, codec)

