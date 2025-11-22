# Refonte de la toolbar d'observation - Plan de développement

## Contexte et problème

La page Observation dépasse verticalement de l'écran car elle contient trop d'éléments empilés :
- Zone vidéo avec contrôles intégrés (en mode chronomètre)
- Zone principale (boutons + relevés)
- Toolbar d'observation en bas (play/pause/stop + modes)

**Objectif** : Optimiser l'utilisation de l'espace vertical en supprimant le footer et en intégrant les contrôles dans les zones appropriées selon le mode.

---

## Objectifs

1. **Supprimer la toolbar d'observation en bas** pour libérer de l'espace vertical
2. **En mode Chronomètre** : Conserver les contrôles vidéo sous la vidéo (déjà implémenté)
3. **En mode Calendrier** : Créer une barre de contrôles en haut de la zone principale avec play/pause/stop
4. **Ajouter un toggle de mode** : Créer un composant réutilisable pour basculer entre Calendrier/Chronomètre
5. **Intégrer le toggle** : Utiliser ce composant dans les deux contextes (barre vidéo et barre calendrier)

---

## Plan d'implémentation

### Phase 1 : Créer le composant ModeToggle

**Fichier à créer** : `front/src/pages/userspace/observation/_components/ModeToggle.vue`

**Fonctionnalités** :
- Toggle switch ou boutons groupés pour basculer entre "Calendrier" et "Chronomètre"
- Affiche le mode actuel de manière claire
- Permet de changer de mode uniquement si l'observation n'a pas été démarrée
- Affiche un message d'interdiction si changement impossible
- Style cohérent avec le reste de l'application

**Props** :
- `currentMode: ObservationModeEnum | null` : Mode actuel
- `canChangeMode: boolean` : Si le mode peut être changé (pas de relevés START)
- `disabled: boolean` : Si le toggle est désactivé

**Events** :
- `@mode-change: (mode: ObservationModeEnum) => void` : Émis quand l'utilisateur change de mode

**Design proposé** :
- Deux boutons côte à côte : "Calendrier" et "Chronomètre"
- Bouton actif : Couleur primaire, non-outline
- Bouton inactif : Couleur grise, outline
- Icônes : `event` pour Calendrier, `timer` pour Chronomètre
- Taille : `sm` ou `md` selon le contexte

---

### Phase 2 : Créer la barre de contrôles Calendrier

**Fichier à créer** : `front/src/pages/userspace/observation/_components/CalendarToolbar.vue`

**Fonctionnalités** :
- Barre horizontale en haut de la zone principale (boutons + relevés)
- Contient : Bouton Play/Pause, Bouton Stop, ModeToggle, Timer
- Style cohérent avec les contrôles vidéo
- Position : Entre le header et le splitter vertical (boutons/relevés)

**Éléments** :
1. **Bouton Play/Pause** : 
   - Rond, couleur primaire (ou negative si en cours)
   - Icône : `play_arrow` ou `pause`
   - Taille : `md` ou `sm`
   
2. **Bouton Stop** :
   - Rond, couleur grise
   - Icône : `stop`
   - Désactivé si l'observation n'est pas active
   
3. **ModeToggle** :
   - Utilise le composant créé en Phase 1
   - Visible uniquement si `canChangeMode` est vrai
   
4. **Timer** :
   - Chip avec icône `access_time`
   - Affiche le temps écoulé formaté
   - Couleur accent

**Layout** :
```
[Play/Pause] [Stop] ... [ModeToggle] [Timer]
```

**Position** : En haut de la zone principale, avant le splitter vertical

---

### Phase 3 : Intégrer ModeToggle dans VideoPlayer

**Fichier à modifier** : `front/src/pages/userspace/observation/_components/VideoPlayer.vue`

**Modifications** :
- Ajouter le composant `ModeToggle` dans la barre de contrôles vidéo
- Position : Entre les contrôles de volume et l'affichage du temps (ou à la fin)
- Utiliser les mêmes props que pour la barre calendrier

**Layout proposé** :
```
[Play/Pause] [Volume] [Speed] [ModeToggle] [Time]
```

---

### Phase 4 : Modifier Index.vue pour intégrer CalendarToolbar

**Fichier à modifier** : `front/src/pages/userspace/observation/Index.vue`

**Modifications** :
1. **Supprimer** : `<ObservationToolbar />` du bas de la page
2. **Ajouter** : `<CalendarToolbar />` en haut de la zone principale (dans le slot `after` du splitter vidéo, ou directement dans la zone principale si pas de vidéo)
3. **Condition** : Afficher `CalendarToolbar` uniquement en mode Calendrier (ou si pas de vidéo)

**Structure proposée** :
```vue
<template>
  <DPage>
    <div class="fit column">
      <!-- Video player (mode chronomètre) -->
      <q-splitter v-if="isChronometerMode" ...>
        <template v-slot:before>
          <VideoPlayer /> <!-- Contient déjà les contrôles + ModeToggle -->
        </template>
        <template v-slot:after>
          <div class="fit column">
            <CalendarToolbar v-if="!isChronometerMode" class="col-auto" />
            <q-splitter class="col" ...>
              <!-- Boutons + Relevés -->
            </q-splitter>
          </div>
        </template>
      </q-splitter>
      
      <!-- Mode calendrier (pas de vidéo) -->
      <template v-else>
        <CalendarToolbar class="col-auto" />
        <div class="col">
          <q-splitter ...>
            <!-- Boutons + Relevés -->
          </q-splitter>
        </div>
      </template>
    </div>
  </DPage>
</template>
```

---

### Phase 5 : Gérer la logique de changement de mode

**Fichiers à modifier** :
- `front/src/pages/userspace/observation/_components/ModeToggle.vue`
- `front/src/pages/userspace/observation/_components/CalendarToolbar.vue`
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue`

**Logique** :
1. **Vérification** : Avant de changer de mode, vérifier que `canChangeMode` est vrai
2. **Confirmation** : Afficher un dialog de confirmation (comme actuellement)
3. **Mise à jour** : Appeler `observation.methods.updateObservation()` avec le nouveau mode
4. **Feedback** : Afficher une notification de succès/erreur
5. **Synchronisation** : Le composable `useObservation` mettra à jour automatiquement l'état

**Messages** :
- **Confirmation** : "Voulez-vous passer en mode [calendrier/chronomètre] ? Cette action est irréversible."
- **Interdiction** : "Impossible de changer de mode. L'observation a déjà été démarrée."
- **Succès** : "Mode [calendrier/chronomètre] activé"

---

## Structure des fichiers

### Nouveaux fichiers

```
front/src/pages/userspace/observation/_components/
├── ModeToggle.vue              # Composant toggle pour changer de mode
└── CalendarToolbar.vue         # Barre de contrôles pour le mode calendrier
```

### Fichiers à modifier

```
front/src/pages/userspace/observation/
├── Index.vue                   # Supprimer ObservationToolbar, ajouter CalendarToolbar
└── _components/
    ├── VideoPlayer.vue         # Ajouter ModeToggle dans les contrôles
    └── ObservationToolbar.vue  # Peut être supprimé ou conservé pour référence
```

---

## Détails d'implémentation

### ModeToggle.vue

**Template** :
```vue
<template>
  <div class="mode-toggle row q-gutter-xs">
    <q-btn
      :color="currentMode === 'calendar' ? 'primary' : 'grey-5'"
      :outline="currentMode !== 'calendar'"
      icon="event"
      label="Calendrier"
      size="sm"
      dense
      :disable="disabled || !canChangeMode"
      @click="handleModeChange('calendar')"
    >
      <q-tooltip>Passer en mode calendrier</q-tooltip>
    </q-btn>
    <q-btn
      :color="currentMode === 'chronometer' ? 'primary' : 'grey-5'"
      :outline="currentMode !== 'chronometer'"
      icon="timer"
      label="Chronomètre"
      size="sm"
      dense
      :disable="disabled || !canChangeMode"
      @click="handleModeChange('chronometer')"
    >
      <q-tooltip>Passer en mode chronomètre</q-tooltip>
    </q-btn>
  </div>
</template>
```

**Props** :
- `currentMode: ObservationModeEnum | null`
- `canChangeMode: boolean`
- `disabled: boolean` (optionnel, défaut: false)

**Events** :
- `@mode-change: (mode: ObservationModeEnum) => void`

**Méthodes** :
- `handleModeChange(newMode)` : Vérifie les conditions, affiche confirmation, émet l'event

---

### CalendarToolbar.vue

**Template** :
```vue
<template>
  <div class="calendar-toolbar row items-center q-pa-sm q-gutter-md">
    <!-- Play/Pause button -->
    <q-btn
      round
      :color="isPlaying ? 'negative' : 'primary'"
      :icon="isPlaying ? 'pause' : 'play_arrow'"
      size="md"
      @click="handleTogglePlayPause"
    />
    
    <!-- Stop button -->
    <q-btn
      round
      color="grey-8"
      icon="stop"
      size="sm"
      :disable="!isActive"
      @click="handleStop"
    />
    
    <!-- Spacer -->
    <q-space />
    
    <!-- Mode toggle -->
    <ModeToggle
      :current-mode="currentMode"
      :can-change-mode="canChangeMode"
      @mode-change="handleModeChange"
    />
    
    <!-- Timer -->
    <q-chip color="accent" text-color="white" icon="access_time">
      {{ formatDuration(elapsedTime) }}
    </q-chip>
  </div>
</template>
```

**Composables utilisés** :
- `useObservation()` : Pour accéder à l'état et aux méthodes
- `useQuasar()` : Pour les notifications

**Méthodes** :
- `handleTogglePlayPause()` : Toggle play/pause via `observation.timerMethods.togglePlayPause()`
- `handleStop()` : Stop via `observation.timerMethods.stopTimer()`
- `handleModeChange(mode)` : Passe l'event au parent ou gère directement
- `formatDuration(seconds)` : Utilise `observation.timerMethods.formatDuration()`

---

### Intégration dans VideoPlayer.vue

**Modification de la barre de contrôles** :
```vue
<!-- Controls bar -->
<div class="video-controls col-auto">
  <div class="row items-center q-pa-sm q-gutter-md">
    <!-- Play/Pause button -->
    <q-btn ... />
    
    <!-- Volume controls -->
    <div class="row items-center q-gutter-xs">
      ...
    </div>
    
    <!-- Playback speed control -->
    <q-select ... />
    
    <!-- Mode toggle -->
    <ModeToggle
      :current-mode="currentMode"
      :can-change-mode="canChangeMode"
      @mode-change="handleModeChange"
    />
    
    <!-- Time display -->
    <div class="row items-center q-gutter-xs">
      ...
    </div>
  </div>
</div>
```

**Ajouts dans le script** :
- Importer `ModeToggle`
- Calculer `currentMode` et `canChangeMode` depuis `observation`
- Créer `handleModeChange` pour gérer le changement de mode

---

### Modification de Index.vue

**Structure proposée** :
```vue
<template>
  <DPage>
    <div class="fit column">
      <!-- Video player section (mode chronomètre) -->
      <q-splitter
        v-if="observation.isChronometerMode.value || observation.sharedState.currentObservation?.videoPath"
        v-model="state.videoSplitterModel"
        horizontal
        class="fit"
        :limits="[10, 75]"
      >
        <template v-slot:before>
          <VideoPlayer />
        </template>
        <template v-slot:separator>
          <q-avatar ... />
        </template>
        <template v-slot:after>
          <div class="fit column">
            <!-- Calendar toolbar (si pas en mode chronomètre) -->
            <CalendarToolbar
              v-if="!observation.isChronometerMode.value"
              class="col-auto"
            />
            
            <!-- Main area with splitter -->
            <q-splitter class="col" ...>
              <!-- Boutons + Relevés -->
            </q-splitter>
          </div>
        </template>
      </q-splitter>
      
      <!-- Mode calendrier (pas de vidéo) -->
      <template v-else>
        <CalendarToolbar class="col-auto" />
        <div class="col">
          <q-splitter ...>
            <!-- Boutons + Relevés -->
          </q-splitter>
        </div>
      </template>
    </div>
  </DPage>
</template>
```

**Suppression** :
- Retirer `<ObservationToolbar />` du bas de la page

---

## Checklist d'implémentation

### Phase 1 : ModeToggle
- [ ] Créer `ModeToggle.vue` avec les props et events
- [ ] Implémenter la logique de changement de mode avec confirmation
- [ ] Ajouter les messages d'interdiction
- [ ] Tester le composant isolément

### Phase 2 : CalendarToolbar
- [ ] Créer `CalendarToolbar.vue`
- [ ] Intégrer les boutons play/pause/stop
- [ ] Intégrer le ModeToggle
- [ ] Intégrer le timer
- [ ] Tester la barre complète

### Phase 3 : Intégration VideoPlayer
- [ ] Ajouter ModeToggle dans VideoPlayer.vue
- [ ] Gérer le changement de mode depuis VideoPlayer
- [ ] Tester l'intégration

### Phase 4 : Modification Index.vue
- [ ] Supprimer ObservationToolbar du bas
- [ ] Ajouter CalendarToolbar en haut de la zone principale
- [ ] Gérer l'affichage conditionnel selon le mode
- [ ] Tester les deux modes (calendrier et chronomètre)

### Phase 5 : Tests et ajustements
- [ ] Tester le changement de mode depuis les deux toolbars
- [ ] Vérifier que les messages d'interdiction fonctionnent
- [ ] Vérifier que l'espace vertical est optimisé
- [ ] Ajuster les styles si nécessaire

---

## Notes techniques

### Gestion de l'état
- Le composable `useObservation` gère déjà l'état du mode
- Les computed `isChronometerMode` et `canChangeMode` sont disponibles
- La méthode `updateObservation()` existe déjà pour mettre à jour le mode

### Styles
- Utiliser les couleurs du projet (`var(--primary)`, `var(--accent)`, etc.)
- Utiliser les classes Quasar pour l'espacement (`q-pa-sm`, `q-gutter-md`, etc.)
- La CalendarToolbar doit avoir un style cohérent avec les contrôles vidéo

### Responsive
- Les toolbars doivent s'adapter aux petits écrans
- Le ModeToggle peut devenir un menu déroulant sur mobile si nécessaire

---

## Résultat attendu

**Mode Chronomètre** :
- Vidéo en haut avec contrôles intégrés (play, volume, vitesse, toggle mode, temps)
- Zone principale (boutons + relevés) en dessous
- Pas de footer

**Mode Calendrier** :
- Barre de contrôles en haut (play, stop, toggle mode, timer)
- Zone principale (boutons + relevés) en dessous
- Pas de footer

**Avantages** :
- Gain d'espace vertical (suppression du footer)
- Contrôles accessibles selon le contexte
- Interface plus cohérente et intuitive
- Toggle de mode réutilisable et accessible depuis les deux contextes

