# Spécifications UX/Design - Restructuration de la page Observation

## Contexte

La page **Observation** (accessible via le menu "Observation") nécessite une restructuration pour améliorer l'expérience utilisateur, notamment concernant :
- La gestion de la vidéo en mode chronomètre
- La clarté du mode actif (Calendrier/Chronomètre)
- La navigation et l'interaction avec la vidéo
- La cohérence visuelle et l'ergonomie générale

**Note importante** : Il s'agit d'une **seule page** avec deux panneaux côte à côte :
- **Panneau gauche** : Boutons observables ("Tableau de bord d'observation")
- **Panneau droit** : Relevés ("Relevés")

Il n'y a **pas** d'onglets séparés "Observation" et "Relevés" - c'est une seule page avec un splitter vertical.

## Objectifs

1. **Clarté du mode** : L'utilisateur doit immédiatement savoir s'il est en mode Calendrier ou Chronomètre
2. **Vidéo redimensionnable** : Zone vidéo agrandissable/diminissable horizontalement (comme le tableau des relevés mais en horizontal)
3. **Barre de défilement unique** : Une seule barre de défilement vidéo, cliquable pour positionner la vidéo
4. **Gestion du changement de mode** : Permettre le changement de mode avec message d'interdiction si des relevés existent

---

## Structure proposée

### Layout général

```
┌─────────────────────────────────────────────────────────────┐
│  Header (ActoGraph)                                         │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Zone Vidéo (redimensionnable horizontalement)        │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │  [Vidéo avec contrôles intégrés]                │ │ │
│  │  │  ┌───────────────────────────────────────────┐ │ │ │
│  │  │  │  Timeline unique avec encoches            │ │ │ │
│  │  │  └───────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  │  [Slider horizontal pour redimensionner]               │ │
│  └───────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌──────────────────────┬────────────────────────────────┐ │
│  │  Boutons             │  Relevés                       │ │
│  │  (observables)       │  ┌──────────────────────────┐  │ │
│  │                      │  │  [Indicateur Mode]      │  │ │
│  │                      │  │  [Toolbar: recherche,   │  │ │
│  │                      │  │   actions]              │  │ │
│  │                      │  ├──────────────────────────┤  │ │
│  │                      │  │  [Tableau des relevés]   │  │ │
│  │                      │  └──────────────────────────┘  │ │
│  └──────────────────────┴────────────────────────────────┘ │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐ │
│  │  Toolbar Observation (play/pause/stop, mode, timer)     │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Zone Vidéo

### 1.1 Structure

**Position** : En haut de la page, au-dessus de la zone principale (boutons + relevés)

**Composants** :
- **Conteneur vidéo** : Zone principale avec la vidéo
- **Contrôles vidéo intégrés** : Play/pause, volume, temps (dans la vidéo ou juste en dessous)
- **Timeline unique** : Barre de progression avec encoches, cliquable pour positionner la vidéo
- **Slider de redimensionnement** : Slider horizontal en bas de la zone vidéo

### 1.2 Comportement du redimensionnement

**Slider horizontal** :
- Position : En bas de la zone vidéo, sur toute la largeur
- Type : `q-slider` horizontal classique
- Valeurs : 
  - Min : 100px (hauteur minimale)
  - Max : 600px (hauteur maximale)
  - Par défaut : 300px
- Label : Afficher la hauteur actuelle (ex: "300px")
- Icône : `height` ou `resize` à gauche du slider

**Conservation du ratio** :
- La largeur s'ajuste automatiquement pour maintenir le ratio d'aspect de la vidéo
- Le conteneur vidéo utilise `object-fit: contain`

**État réduit** :
- Quand la vidéo est réduite au minimum, elle reste visible mais compacte
- Les contrôles restent accessibles

### 1.3 Timeline unique

**Design** :
- Barre horizontale unique, intégrée dans la zone vidéo (en bas, superposée ou juste en dessous)
- Hauteur : ~40px pour la zone cliquable
- Couleur de fond : Semi-transparente (rgba(0, 0, 0, 0.5))
- Barre de progression : Couleur primaire, indique le temps actuel

**Encoches (notches)** :
- Traits verticaux de couleur accent (orange)
- Position : Basée sur la dateTime du relevé (calculée depuis t0)
- Hauteur : ~16px (dépasse légèrement au-dessus de la barre)
- Largeur : 2px (3px au survol)
- Tooltip : Affiche la durée formatée au survol

**Interaction** :
- **Clic sur la timeline** : Positionne la vidéo à ce moment
- **Clic sur une encoche** : Positionne la vidéo exactement à ce relevé
- **Curseur** : `pointer` pour indiquer la cliquabilité

**Synchronisation** :
- La position du curseur vidéo est synchronisée avec le temps de la vidéo
- Les boutons s'activent automatiquement selon la position du curseur

### 1.4 Contrôles vidéo

**Position** : Intégrés dans la zone vidéo (overlay en bas ou barre séparée juste en dessous)

**Éléments** :
- **Bouton Play/Pause** : Icône ronde, couleur primaire
- **Volume** : Slider horizontal + icône volume
- **Temps** : Format `MM:SS / MM:SS` (temps actuel / durée totale)
- **Bouton plein écran** (optionnel) : Pour agrandir la vidéo

**Style** :
- Fond semi-transparent pour la lisibilité
- Espacement cohérent entre les éléments
- Taille adaptée pour ne pas masquer la vidéo

### 1.5 Affichage conditionnel

**Règles** :
- **Mode Chronomètre** : Toujours afficher la zone vidéo (même si pas de vidéo chargée)
  - Si pas de vidéo : Afficher un message "Aucune vidéo chargée" avec bouton "Sélectionner une vidéo"
- **Mode Calendrier** : Masquer la zone vidéo (ou la réduire au minimum si une vidéo est chargée)

**Message "Pas de vidéo"** :
- Icône : `videocam_off`
- Texte : "Aucune vidéo chargée"
- Sous-texte : "En mode chronomètre, vous pouvez analyser une vidéo enregistrée"
- Bouton : "Sélectionner une vidéo" (couleur primaire)

---

## 2. Indicateur de Mode

### 2.1 Position et visibilité

**Emplacements** :
1. **Dans la toolbar des relevés** : Chip permanent à côté du titre "Relevés"
2. **Dans la toolbar d'observation** : Chip à côté du timer
3. **Dans le header de la zone vidéo** (si visible) : Chip discret

**Style** :
- **Mode Calendrier** :
  - Couleur : `grey-7`
  - Icône : `event`
  - Texte : "Mode Calendrier"
- **Mode Chronomètre** :
  - Couleur : `primary`
  - Icône : `timer`
  - Texte : "Mode Chronomètre"

**Taille** : `sm` pour ne pas être trop intrusif

### 2.2 Boutons de changement de mode

**Position** : Dans la toolbar d'observation (ObservationToolbar) en bas de la page

**Visibilité** :
- **Afficher uniquement si** :
  - L'observation n'a pas été démarrée (pas de relevé de type START)
  - Le mode actuel est `null` ou différent du mode souhaité

**Design** :
- Deux boutons côte à côte : "Calendrier" et "Chronomètre"
- Bouton actif : Couleur primaire, non-outline
- Bouton inactif : Couleur grise, outline
- Icônes : `event` pour Calendrier, `timer` pour Chronomètre

**Comportement** :
- **Clic sur un bouton** : 
  - Si l'observation n'a pas été démarrée : Afficher une confirmation, puis changer le mode
  - Si l'observation a été démarrée : Afficher un message d'interdiction

**Message d'interdiction** :
```
Titre : "Impossible de changer de mode"
Message : "L'observation a déjà été démarrée. Le mode ne peut pas être modifié une fois que des relevés ont été enregistrés."
Bouton : "OK"
Type : Notification négative (negative)
```

**Message de confirmation** :
```
Titre : "Passer en mode [Calendrier/Chronomètre]"
Message : "Voulez-vous passer cette observation en mode [calendrier/chronomètre] ? Cette action est irréversible."
Boutons : "Annuler" | "Changer" (couleur primaire)
```

### 2.3 Mode par défaut

**Règle** :
- **Sans relevés** : Par défaut en mode Calendrier
- **Avec relevés** : Le mode est figé selon ce qui a été choisi initialement

**Changement de mode** :
- **Depuis la toolbar d'observation** (en bas) : Possible si pas de relevés START
- **Depuis le panneau Relevés** (à droite) : Bouton "Mode chronomètre" visible dans la toolbar des relevés si conditions remplies

---

## 3. Zone principale (Boutons + Relevés)

### 3.1 Splitter vertical

**Structure** : `q-splitter` vertical (comme actuellement)

**Comportement** :
- **Gauche (before)** : Zone des boutons observables
- **Séparateur** : Avatar avec icône `drag_indicator`, couleur accent
- **Droite (after)** : Zone des relevés

**Limites** :
- Min : 20% pour chaque panneau
- Max : 80% pour chaque panneau
- Par défaut : 40% gauche / 60% droite

### 3.2 Zone Relevés (Panneau droit)

**Position** : Panneau droit du splitter vertical, à côté des boutons observables

**Header** :
- Titre : "Relevés"
- Chip mode : À côté du titre (permanent, toujours visible)
- Bouton "Mode chronomètre" : Visible dans la toolbar si `canActivateChronometerMode` est vrai

**Toolbar** :
- Recherche : Input avec icône search
- Boutons d'action : Ajouter, Supprimer sélectionné, Supprimer tout
- Bouton "Mode chronomètre" : Si conditions remplies (visible uniquement si l'observation n'a pas été démarrée et n'est pas déjà en mode Calendrier)

**Tableau** :
- Affichage des relevés avec colonnes : N°, Type, Date & heure (ou Durée en mode chronomètre)
- Édition inline des dates/durées
- Sélection par clic sur une ligne

---

## 4. Toolbar d'observation (bas de page)

### 4.1 Structure

**Position** : En bas de la page, fixe ou sticky

**Éléments** :
1. **Indicateur d'enregistrement** : Point rouge pulsant + texte "Enregistrement en cours" / "Prêt"
2. **Contrôles principaux** : Bouton Play/Pause (grand), Bouton Stop
3. **Indicateur de mode** : Chip avec mode actuel
4. **Boutons de changement de mode** : Si conditions remplies
5. **Timer** : Chip avec temps écoulé formaté

**Layout** :
```
[Indicateur] [Play/Pause] [Stop] ... [Mode Chip] [Boutons Mode] [Timer]
```

### 4.2 Comportement

**Synchronisation** :
- Si vidéo en lecture : Les contrôles de la toolbar synchronisent avec la vidéo
- Si pas de vidéo : Les contrôles gèrent uniquement le timer d'observation

**États** :
- **Prêt** : Bouton Play visible, indicateur gris
- **En cours** : Bouton Pause visible, indicateur rouge pulsant
- **Arrêté** : Bouton Play visible, indicateur gris

---

## 5. Interactions et comportements

### 5.1 Synchronisation vidéo/observation

**Démarrage** :
- Clic sur Play vidéo → Démarre l'observation automatiquement
- Clic sur Play toolbar → Démarre la vidéo si en mode chronomètre

**Pause** :
- Clic sur Pause vidéo → Met en pause l'observation
- Clic sur Pause toolbar → Met en pause la vidéo si en mode chronomètre

**Positionnement** :
- Clic sur timeline → Met à jour le temps vidéo ET le temps d'observation
- Clic sur encoche → Saute au relevé correspondant, met à jour les boutons

**Activation des boutons** :
- Lors de la lecture : Les boutons s'activent automatiquement selon le temps vidéo
- Lors du positionnement manuel : Les boutons se mettent à jour immédiatement

### 5.2 Gestion des erreurs

**Vidéo introuvable** :
- Overlay sur la zone vidéo avec message d'erreur
- Bouton "Sélectionner un nouveau fichier"
- Icône d'erreur visible

**Chargement** :
- Indicateur de chargement (spinner) pendant le chargement
- Message "Chargement de la vidéo..."

---

## 6. Responsive et accessibilité

### 6.1 Responsive

**Petits écrans** :
- La zone vidéo peut être réduite au minimum
- Le splitter peut être masqué si nécessaire
- Les contrôles restent accessibles

**Grands écrans** :
- La zone vidéo peut être agrandie jusqu'au maximum
- Le splitter permet un meilleur équilibre entre boutons et relevés

### 6.2 Accessibilité

**Clavier** :
- Navigation au clavier dans les contrôles vidéo
- Raccourcis clavier pour Play/Pause (Espace)

**ARIA** :
- Labels appropriés pour tous les boutons
- Descriptions pour les zones interactives
- États annoncés (lecture, pause, erreur)

---

## 7. États et transitions

### 7.1 États de la zone vidéo

1. **Vidéo chargée et prête** : Affichage normal avec contrôles
2. **Vidéo en chargement** : Overlay avec spinner
3. **Erreur de chargement** : Overlay avec message d'erreur
4. **Pas de vidéo (mode chronomètre)** : Message avec bouton de sélection
5. **Mode calendrier** : Zone vidéo masquée ou réduite

### 7.2 Transitions

**Redimensionnement** :
- Transition fluide lors du changement de taille (0.3s ease)
- Le ratio d'aspect est maintenu pendant la transition

**Changement de mode** :
- Animation douce lors du changement de mode
- Mise à jour immédiate des indicateurs

---

## 8. Implémentation technique

### 8.1 Composants à modifier/créer

**Composants existants à modifier** :
- `front/src/pages/userspace/observation/Index.vue` : Restructurer le layout
- `front/src/pages/userspace/observation/_components/VideoPlayer.vue` : Intégrer timeline unique, slider horizontal
- `front/src/pages/userspace/observation/_components/ObservationToolbar.vue` : Ajouter indicateur mode et boutons
- `front/src/pages/userspace/observation/_components/readings-side/ReadingsToolbar.vue` : Ajouter chip mode permanent
- `front/src/pages/userspace/observation/_components/readings-side/Index.vue` : Gérer l'activation du mode chronomètre

**Nouveaux composants** (optionnels) :
- `VideoTimeline.vue` : Composant dédié pour la timeline avec encoches
- `VideoControls.vue` : Composant pour les contrôles vidéo intégrés

### 8.2 Modifications de layout

**Structure principale** :
```vue
<template>
  <DPage>
    <div class="fit column">
      <!-- Zone vidéo avec splitter horizontal -->
      <q-splitter
        v-if="showVideoZone"
        v-model="state.videoSplitterModel"
        horizontal
        class="col-auto"
        :limits="[100, 600]"
      >
        <template v-slot:before>
          <VideoPlayer />
        </template>
        <template v-slot:separator>
          <div class="video-resize-handle">
            <q-icon name="height" />
          </div>
        </template>
      </q-splitter>
      
      <!-- Zone principale (boutons + relevés) -->
      <div class="col">
        <q-splitter v-model="state.mainSplitterModel" ...>
          <!-- Boutons et relevés -->
        </q-splitter>
      </div>
      
      <!-- Toolbar observation -->
      <ObservationToolbar />
    </div>
  </DPage>
</template>
```

### 8.3 Timeline unique

**Intégration dans VideoPlayer** :
- La timeline remplace les deux barres existantes (timeline-track et timeline-container)
- Un seul élément cliquable pour toute la timeline
- Les encoches sont superposées sur la barre de progression

**Calcul des positions** :
- Utiliser `getNotchPosition()` existant
- Position du curseur : `(currentTime / duration) * 100%`

---

## 9. Checklist d'implémentation

### Phase 1 : Restructuration du layout
- [ ] Modifier `Index.vue` pour ajouter le splitter horizontal pour la vidéo
- [ ] Intégrer le slider de redimensionnement horizontal dans VideoPlayer
- [ ] Tester le redimensionnement et la conservation du ratio

### Phase 2 : Timeline unique
- [ ] Fusionner les deux timelines en une seule barre cliquable
- [ ] Intégrer les encoches sur la timeline unique
- [ ] Tester le positionnement au clic sur la timeline et les encoches

### Phase 3 : Indicateurs de mode
- [ ] Ajouter le chip mode dans ReadingsToolbar (permanent)
- [ ] Ajouter le chip mode dans ObservationToolbar
- [ ] Ajouter les boutons de changement de mode dans ObservationToolbar
- [ ] Implémenter les messages d'interdiction et de confirmation

### Phase 4 : Gestion du changement de mode
- [ ] Implémenter la logique `canChangeMode` dans ObservationToolbar
- [ ] Implémenter la logique `canActivateChronometerMode` dans ReadingsSideIndex
- [ ] Tester les différents scénarios (avec/sans relevés, mode déjà défini)

### Phase 5 : Améliorations UX
- [ ] Améliorer les messages d'erreur et de chargement
- [ ] Ajouter des transitions fluides
- [ ] Tester l'accessibilité et la navigation au clavier

---

## 10. Notes de design

### Couleurs
- Utiliser les couleurs CSS de l'application (`var(--primary)`, `var(--accent)`, etc.)
- Ne pas utiliser les couleurs Quasar par défaut (`q-primary`, etc.)

### Espacements
- Utiliser le système de spacing Quasar (`q-pa-md`, `q-mt-sm`, etc.)
- Cohérence avec le reste de l'application

### Typographie
- Titres : `text-h6` pour les sections principales
- Labels : `text-caption` pour les informations secondaires
- Chips : Taille `sm` pour les indicateurs de mode

---

## Conclusion

Cette restructuration vise à :
1. **Clarifier le mode actif** avec des indicateurs visuels permanents
2. **Améliorer l'interaction avec la vidéo** avec une timeline unique et cliquable
3. **Permettre un redimensionnement flexible** de la zone vidéo
4. **Gérer intelligemment le changement de mode** avec des messages appropriés

L'implémentation doit être progressive, en commençant par la restructuration du layout, puis l'amélioration des interactions et enfin les finitions UX.

