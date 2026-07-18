# Graphiques d'activité

Ce document décrit le système de visualisation des graphiques d'activité dans ActoGraph v3, utilisant PixiJS pour le rendu graphique.

## Vue d'ensemble

Les **graphiques d'activité** visualisent les données d'observation sur un axe temporel. Ils affichent :
- Les **observables** du protocole sur l'axe vertical (Y)
- Le **temps** sur l'axe horizontal (X)
- Les **readings** comme des marqueurs ou des segments sur le graphique

## Architecture

### Technologies

- **PixiJS** : Bibliothèque de rendu graphique 2D WebGL
- **Vue.js 3** : Framework pour l'intégration dans l'interface
- **TypeScript** : Typage statique

### Structure du code

Le moteur vit dans le package `@actograph/graph`. L’UI analyse consomme ce package.

```
packages/graph/src/
├── pixi-app/
│   ├── index.ts                 # PixiApp (viewport zoom/pan, draw, render)
│   ├── axis/
│   │   ├── x-axis.ts            # Axe temporel (X)
│   │   └── y-axis.ts            # Axe des observables (Y)
│   └── data-area/
│       └── index.ts             # Segments + hover (croix / label temps)
├── utils/                       # Viewport, crosshair, pauses, etc.
└── lib/                         # BaseGraphic, BaseGroup, defaults

front/src/pages/userspace/analyse/_components/graph/
├── Index.vue                    # Shell Vue (boutons zoom, export, format temps)
└── use-graph.ts                 # Cycle de vie, coalescing des redraws
```

## Classe PixiApp

### Initialisation

```typescript
import { PixiApp } from '@actograph/graph';

const pixiApp = new PixiApp();

await pixiApp.init({
  view: canvasElement, // Référence au canvas HTML
});
```

### Configuration

L'application PixiJS est configurée avec :
- **Background** : Fond blanc
- **Dimensions** : contrôlées manuellement (pas de `resizeTo` Pixi)
- **View** : Canvas HTML fourni
- **preserveDrawingBuffer** : activé pour les exports image

### Formatage selon le mode

Le graphique s'adapte automatiquement au mode de l'observation :
- **Mode chronomètre** : Les labels de l'axe X et le label de temps affichent des durées au format compact (ex: "2j 3h 15m 30s 500ms")
  - Les durées sont calculées depuis CHRONOMETER_T0 (9 février 1989) définie dans `@utils/chronometer.constants.ts`
  - Format identique à celui utilisé dans le tableau des relevés en mode chronomètre
- **Mode calendrier** : Les labels de l'axe X et le label de temps affichent des dates/heures au format français (ex: "15-01-2024 10:30:45.123")

### Structure du graphique

Hiérarchie de scènes :

```
stage
  └─ viewport (Container)   ← scale + translation (zoom / pan caméra)
       └─ plot
            ├─ xAxis
            ├─ yAxis
            └─ DataArea
```

```typescript
this.yAxis = new YAxis(this.app);
this.xAxis = new xAxis(this.app, this.yAxis);
this.dataArea = new DataArea(this.app, this.yAxis, this.xAxis);

this.viewport = new Container();
this.plot = new Container();
this.plot.addChild(this.xAxis);
this.plot.addChild(this.yAxis);
this.plot.addChild(this.dataArea);
this.viewport.addChild(this.plot);
this.app.stage.addChild(this.viewport);
```

### Zoom, pan et contrat de rendu

**Zoom actuel = caméra**, pas zoom données :
- Molette, pinch et boutons appliquent `viewport.scale` (limites 0.1×–5×) et `viewport.x/y`.
- Les axes, labels et traits sont **dans** le viewport : ils grossissent avec le zoom.
- `updateTimeScale()` est un stub : les graduations X ne se recalculent **pas** encore selon le zoom (`pixelsPerMsec` reste basé sur la plage complète). Un vrai zoom données reste une évolution future.

**Contrat draw / hover** (anti-sautes) :
1. `draw()` coalesce via `requestAnimationFrame`, attend un export éventuel **hors** chaîne, puis enfile `executeDrawBody()` via `drawChain`.
2. `executeDrawBody()` est **exclusif** : `drawChain` / `enqueueDrawBody` garantissent qu’aucun second draw complet ne démarre avant la fin du précédent.
3. Pendant le draw, `drawInProgress === true` : le hover ne doit pas appeler `app.render()`.
4. Le hover passe par `requestRender()` (no-op si draw/export en cours).
5. Au début du draw, l’overlay hover est masqué sans annuler l’événement pointeur en attente ; après un draw **réussi**, `resumeHoverAfterDraw()` peut relancer le rAF hover.
6. Après pan/zoom, `getGlobalTransform()` force la mise à jour des matrices monde (requis pour `toGlobal` / `toLocal` du crosshair). Ne pas réintroduire de nudge artificiel du type `scale ± 0.0001`.
7. Le rendu final du draw complet appelle `app.render()` **directement** (car `requestRender` no-op pendant le draw).
8. **`axesGraphicsDirty`** : dès qu’un full draw commence (clear des axes), le flag est `true` jusqu’après `app.render()` réussi. Tant qu’il est sale, `requestRender`, `redrawCategory` et `redrawObservable` **ne peignent pas** la scène partielle : ils forcent un full `draw()`. C’est la garde contre le symptôme « axes absents + crosshair / fragments ».
9. Un `draw()` en échec **reject** sa Promise (les callers comme `redrawFromObservation` le voient) ; le flag dirty reste `true` et le hover n’est pas repris.

**Contrat resume / export / mutex** :
1. **Mutex draw** : les appels `draw()` externes attendent un export **hors** de `drawChain`, puis enfilent `executeDrawBody` ; l’export appelle `enqueueDrawBody()` directement (jamais `draw()`), ce qui évite un deadlock `drawChain ↔ exportQueue`.
2. **`resizeFromCanvas({ skipRender?: boolean })`** : en chemin resume/refresh, appeler avec `skipRender: true` puis un seul `draw()` pour peindre. Évite un `app.render()` intermédiaire sur une scène partiellement effacée.
3. **Canvas dégénéré** (`isDegenerateCanvasSize`, width ou height ≤ 2) : mémorisé via `wasDegenerateCanvas` ; au retour à une taille utile, `needsInitialFit = true` pour éviter un scale microscopique conservé par `preserveViewportOnResize`.
4. **`refreshAfterResume()`** (mobile, `webglcontextrestored`) : garde `isInitialized` → `clearHoverOverlay` (cancel pending) → marque `needsPatternTextureRefresh` + `needsInitialFit` → réapplication de `lastObservation` → `resizeFromCanvas({ skipRender: true })` → `draw()`. Le cache motifs est vidé **au début de `executeDrawBody`**, après détachement des sprites.
5. **`refreshGraph()` desktop** (visibility resume) : retry si canvas pas encore visible → `prepareForResumeRefresh()` (force `needsInitialFit`) → `waitForIdle()` → `resizeFromCanvas({ skipRender: true })` → `redrawFromObservation()`. Un fit systématique au resume évite la caméra coincée sur une zone vide (axes hors écran + fragment de données).
6. **`webglcontextlost`** : `preventDefault()` + `clearHoverOverlay` + `needsPatternTextureRefresh` + `axesGraphicsDirty` + `wasDegenerateCanvas = true`.
7. **Export** : au début, hover supprimé (cancel pending) ; paints via `enqueueDrawBody` ; après `finally`, hover unsuppressed.
8. **`waitForIdle()`** : `redrawFromObservation` / `refreshGraph` attendent la fin des draws/exports en cours avant un nouveau setData+draw.
9. **Échec de draw** : pas de `resumeHoverAfterDraw` (évite de peindre axes clearés + crosshair orphelin) ; `axesGraphicsDirty` + `needsInitialFit` remis pour un retry.
## Chargement des données

### Données requises

Le graphique nécessite une observation complète avec :
- **readings** : Tous les readings de l'observation
- **protocol** : Le protocole avec sa structure d'items

```typescript
const observation: IObservation = {
  id: 1,
  name: 'Observation',
  readings: [
    {
      id: 1,
      name: 'Reading 1',
      type: ReadingTypeEnum.DATA,
      dateTime: new Date('2024-01-15T10:00:00'),
    },
    // ...
  ],
  protocol: {
    id: 1,
    items: [
      {
        id: 'uuid-1',
        name: 'Observable 1',
        type: ProtocolItemTypeEnum.Observable,
        // ...
      },
      // ...
    ],
  },
};
```

### Configuration du graphique

```typescript
// Définir les données
pixiApp.setData(observation);

// Dessiner le graphique
await pixiApp.draw();
```

### Validation

Le système valide que les données nécessaires sont présentes :

```typescript
if (!observation.readings) {
  throw new Error('Observation must have readings');
}
if (!observation.protocol) {
  throw new Error('Observation must have protocol');
}
```

## Axe Y (Observables)

### Structure

L'axe Y (`YAxis`) affiche les observables du protocole :
- Chaque observable est une ligne horizontale (tick)
- Les observables sont organisés selon la structure du protocole
- L'ordre respecte la hiérarchie (catégories puis observables)
- L'axe est dessiné de bas en haut avec une flèche en haut

**Modes d'affichage supportés** :
- **Normal** : un tick par observable (comportement par défaut)
- **Frieze** : un bandeau unique pour toute la catégorie
- **Background** : catégorie non visible sur l'axe Y (rendu en arrière-plan)

### Architecture interne

La classe `YAxis` utilise des constantes configurables pour une meilleure maintenabilité :

```typescript
// Configuration de l'axe
const AXIS_CONFIG = {
  OFFSET_X: 150,      // Offset X depuis la gauche (espace pour labels)
  OFFSET_Y: 20,       // Offset Y depuis le haut (marge supérieure)
  LINE_WIDTH: 2,      // Épaisseur de la ligne d'axe
  COLOR: 'black',     // Couleur de l'axe
};

// Configuration des ticks
const TICK_CONFIG = {
  OBSERVABLE_HEIGHT: 30,    // Hauteur par observable en mode Normal
  FRIEZE_HEIGHT: 40,        // Hauteur du bandeau en mode Frieze
  CATEGORY_SPACING: 15,     // Espacement entre catégories
  TICK_LENGTH: 10,          // Longueur du tick (de chaque côté)
  FRIEZE_TICK_LENGTH: 5,    // Longueur du tick mode Frieze
  TICK_WIDTH: 1,            // Épaisseur du tick
  COLOR: 'black',           // Couleur du tick
};

// Configuration des labels
const LABEL_CONFIG = {
  OFFSET: 12,               // Offset du label par rapport à l'axe
  FONT_SIZE: 12,            // Taille de police
  FONT_FAMILY: 'Arial',     // Police
  COLOR: 'black',           // Couleur
};
```

**Interface `ITick`** : Représente un marqueur sur l'axe Y :
```typescript
interface ITick {
  label: string;              // Nom affiché
  pos?: number;               // Position Y (relative puis absolue après draw())
  category: ProtocolItem;     // Catégorie parente
  observable: ProtocolItem;   // Observable représenté
  isFrieze?: boolean;         // Si mode bandeau
  friezeHeight?: number;      // Hauteur du bandeau
  friezeStartY?: number;      // Position Y du BAS du bandeau
  friezeEndY?: number;        // Position Y du HAUT du bandeau
}
```

### Positionnement

L'axe Y est positionné avec un décalage fixe (configuré via `AXIS_CONFIG`) :
- **X** : 150px depuis la gauche (espace pour les labels)
- **Y début** : Calculé dynamiquement selon le nombre d'observables
- **Y fin** : 20px depuis le haut (marge supérieure)

### Calcul de la hauteur

La hauteur de l'axe Y est calculée dynamiquement selon (configuré via `TICK_CONFIG`) :
- **30px par observable** : Espace pour chaque observable en mode Normal
- **40px par catégorie** : Espace pour un bandeau en mode Frieze
- **15px entre catégories** : Espacement entre les groupes d'observables
- **20px de marge supérieure** : Marge en haut de l'axe
- **20px de marge supplémentaire** : Marge de confort visuel

```typescript
const requiredHeight = this.yAxis.getRequiredHeight();
if (requiredHeight > canvas.height) {
  canvas.height = requiredHeight;
  canvas.style.height = `${requiredHeight}px`;
}
```

### Calcul des ticks

La méthode privée `computeAxisLengthAndTicks()` parcourt toutes les catégories et leurs observables :

**Mode Normal** (par défaut) :
1. Pour chaque observable : ajoute `TICK_CONFIG.OBSERVABLE_HEIGHT` (30px) et crée un tick
2. Entre chaque catégorie : ajoute `TICK_CONFIG.CATEGORY_SPACING` (15px)
3. Retourne la longueur totale et la liste des `ITick` avec leurs positions relatives

**Mode Frieze** :
1. Pour la catégorie entière : ajoute `TICK_CONFIG.FRIEZE_HEIGHT` (40px)
2. Crée un seul tick au centre du bandeau avec `isFrieze: true`
3. Les propriétés `friezeStartY`, `friezeEndY` et `friezeHeight` sont définies

**Mode Background** :
- Les catégories sont ignorées (pas d'espace alloué sur l'axe Y)
- Le rendu est géré par `DataArea`

**Conversion des positions** :
- La méthode `convertTicksToAbsolutePositions()` transforme les positions relatives en positions absolues après calcul de l'axe
- Cela garantit que `getPosFromLabel()` retourne toujours des positions absolues correctes

### Affichage

- **Ligne principale** : Ligne verticale de 2px de largeur en noir
- **Flèche** : Triangle rempli en haut de l'axe pointant vers le haut
- **Ticks** : Lignes horizontales de 1px de largeur, s'étendant de 10px à gauche à 10px à droite de l'axe
- **Labels** : Noms des observables affichés à gauche de l'axe, alignés à droite et centrés verticalement
  - Police : Arial, 12px
  - Position : 12px à gauche de l'axe

### Méthodes publiques

**Getters** :
- `getPosFromLabel(label: string): number` : Retourne la position Y d'un observable (-1 si mode Background)
- `getAxisStart(): IPosition | null` : Retourne la position de départ de l'axe (en bas)
- `getAxisEnd(): IPosition | null` : Retourne la position de fin de l'axe (en haut)
- `getRequiredHeight(): number` : Calcule la hauteur minimale requise pour le canvas
- `getFriezeInfo(categoryId: string)` : Retourne les infos de bandeau pour une catégorie Frieze
- `isCategoryBackground(categoryId: string): boolean` : Vérifie si une catégorie est en mode Background
- `isCategoryFrieze(categoryId: string): boolean` : Vérifie si une catégorie est en mode Frieze

**Setters** :
- `setData(observation: IObservation)` : Configure les données de l'observation
- `setProtocol(protocol)` : Met à jour le protocole (pour changements de préférences graphiques)

**Actions** :
- `draw()` : Dessine l'axe Y complet (ligne, flèche, ticks, labels)
- `clear()` : Efface tous les éléments de l'axe Y

## Axe X (Temps)

### Structure

L'axe X affiche la timeline :
- Plage de temps basée sur les readings
- Graduations temporelles adaptatives
- Labels de dates/heures ou durées (selon le mode de l'observation) inclinés à 45°
- L'axe est positionné horizontalement en bas du graphique, aligné avec le début de l'axe Y

### Positionnement

L'axe X est positionné :
- **Début** : Aligné avec le début de l'axe Y (point d'origine du graphique)
- **Fin** : 90% de la largeur de l'écran (10% réservé pour la flèche et les labels)
- **Y** : Même hauteur que le début de l'axe Y (ligne horizontale)

### Calcul de la plage

La plage temporelle est calculée à partir des readings :
- **Début** : Date/heure du premier reading
- **Fin** : Date/heure du dernier tick calculé (peut dépasser le dernier reading)

```typescript
const minDate = Math.min(...readings.map(r => r.dateTime.getTime()));
const maxDate = Math.max(...readings.map(r => r.dateTime.getTime()));
```

### Calcul des graduations adaptatives

Le système choisit automatiquement le pas de temps optimal parmi une liste de pas prédéfinis :

**Pas disponibles** : 10ms, 100ms, 1s, 10s, 1m, 10m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 2d, 3d, 4d, 5d, 6d, 7d, 8d, 1w, 2w, 3w, 4w, 1M, 2M, 3M, 6M, 1y, 2y, 3y, 4y, 5y, 6y, 10y, 20y

**Algorithme de sélection** :
1. Calcule le pas idéal pour avoir environ 5 ticks principaux : `(maxTime - minTime) / 5`
2. Trouve le pas prédéfini le plus proche de l'idéal
3. Aligne le premier tick sur une valeur "ronde" du pas choisi (arrondi)
4. Génère les ticks en avançant par pas jusqu'à dépasser la fin

### Conversion temps ↔ pixels

Le système calcule un facteur de conversion `pixelsPerMsec` :
- **Longueur disponible** : Largeur de l'axe moins 20px réservés pour la flèche
- **Plage temporelle** : Différence entre le dernier tick et le premier reading
- **Facteur** : `pixelsPerMsec = longueurPixels / plageTemporelleMs`

Ce facteur permet de convertir n'importe quelle date/heure en position X :
```typescript
const xPos = axisStart.x + (dateTimeInMsec - axisStartTimeInMsec) * pixelsPerMsec;
```

### Affichage

- **Ligne principale** : Ligne horizontale de 2px de largeur en noir
- **Flèche** : Triangle rempli à droite de l'axe pointant vers la droite
- **Ticks** : Lignes verticales de 1px de largeur, s'étendant de 10px au-dessus à 10px en-dessous de l'axe
- **Labels** : Dates/heures ou durées affichées sous l'axe, inclinées à 45° pour éviter le chevauchement
  - **Mode calendrier** : Format `dd-MM-yyyy HH:mm:ss.xxx` (format français, ex: "15-01-2024 10:30:45.123")
  - **Mode chronomètre** : Format compact de durée (ex: "2j 3h 15m 30s 500ms")
    - La durée est calculée depuis CHRONOMETER_T0 (définie dans @utils/chronometer.constants.ts)
    - Format identique à celui utilisé dans le tableau des relevés en mode chronomètre
  - Police : Arial, 12px
  - Position : 12px sous l'axe, légèrement décalés à gauche

### Méthodes publiques

- `getPosFromDateTime(dateTime: Date | string)`: Convertit une date/heure en position X sur le canvas
- `getDateTimeFromPos(xPos: number)`: Convertit une position X sur le canvas en date/heure (méthode inverse de `getPosFromDateTime`)
- `getAxisStart()`: Retourne la position de départ de l'axe (à gauche)
- `getAxisEnd()`: Retourne la position de fin de l'axe (à droite)

## Zone de données (Data Area)

### Structure

La zone de données affiche les readings sous forme de segments de ligne :
- Les readings sont groupés par catégorie du protocole
- Chaque catégorie a son propre graphique pour dessiner ses readings
- Les segments représentent les transitions entre observables dans le temps

### Groupement des readings

Les readings sont organisés par catégorie lors de `setData()` :
1. Parse le protocole pour obtenir les catégories
2. Crée une entrée vide pour chaque catégorie
3. Parcourt tous les readings de type `DATA` et les groupe par catégorie selon le nom de l'observable
4. Ajoute le reading `STOP` à toutes les catégories (marque la fin de l'observation)

### Visualisation des segments

Les readings sont visualisés comme une ligne qui :
1. **Commence** au premier reading sur son observable (position Y de l'observable, position X du début de l'axe)
2. **Se déplace horizontalement** vers la droite jusqu'à la date du reading suivant (maintien sur le même observable)
3. **Se déplace verticalement** vers le nouvel observable si le reading suivant change d'observable (transition)
4. **Continue** ainsi jusqu'au reading STOP qui ferme le segment

**Couleurs des segments** :
- **Vert épais (2px)** : Segments horizontaux (maintien sur le même observable)
- **Gris fin (1px)** : Segments verticaux (transitions entre observables)

Les relevés `PAUSE_START` et `PAUSE_END` ne coupent pas les segments continus : les lignes restent continues à travers les pauses. Voir la section [Pauses](#pauses) pour la sémantique et le rendu de l'overlay.

### Interactions souris

La zone de données gère les interactions avec la souris :

**Lignes de référence** :
- Lors du mouvement de la souris, deux lignes en pointillés sont affichées :
  - **Ligne verticale** : Depuis le curseur jusqu'à l'axe X (référence temporelle)
  - **Ligne horizontale** : Depuis le curseur jusqu'à l'axe Y (référence observable)
- Ces lignes aident l'utilisateur à lire les valeurs en suivant le curseur depuis l'origine
- La ligne verticale pointe vers l'axe X où la valeur temporelle (date/heure ou durée selon le mode) est affichée
- Les lignes disparaissent lorsque la souris quitte la zone

**Affichage du temps sur l'axe X** :
- Lors du mouvement de la souris, un label affiche la date/heure ou la durée correspondant à la position du curseur
- **Position** :
  - Horizontalement : Centré sur la position du curseur (aligné avec la ligne verticale pointillée)
  - Verticalement : Juste sous l'axe X (abscisse), avec un décalage de 15px
- **Style** :
  - Fond blanc pour améliorer la lisibilité et créer un contraste avec le fond du graphique
  - Texte noir, police Arial, taille 12px
  - Padding de 4px autour du texte pour l'espace blanc
- **Format selon le mode** :
  - **Mode chronomètre** : Durée formatée au format compact (ex: `2j 3h 15m 30s 500ms`)
    - La durée est calculée depuis t0 (9 février 1989) jusqu'à la date/heure correspondant à la position
    - Format identique à celui utilisé dans le tableau des relevés en mode chronomètre
  - **Mode calendrier** : Date/heure au format français (ex: `15-01-2024 10:30:45.123`)
    - Format : `dd-MM-yyyy HH:mm:ss.xxx` (identique aux labels des ticks de l'axe X)
- **Fonctionnement** :
  - La position X du curseur est convertie en date/heure via `xAxis.getDateTimeFromPos()`
  - Le formatage dépend du mode de l'observation (`observation.mode`)
  - En mode chronomètre, la durée est calculée avec `useDuration().formatFromDate(date, CHRONOMETER_T0)`
  - Le label est mis à jour dynamiquement lors du mouvement de la souris
  - Le fond blanc s'adapte automatiquement à la taille du texte affiché
  - Le label disparaît lorsque la souris quitte la zone de données

**Zone interactive** :
- Un rectangle transparent couvre toute la zone de données
- Ce rectangle capture les événements souris pour afficher les lignes de référence et le label de temps
- Les coordonnées sont converties en coordonnées locales pour un positionnement précis

### Rendu

Le rendu utilise des primitives PixiJS :
- **BaseGraphic** : Pour les lignes et segments (avec support des lignes pointillés)
- **Container** : Pour organiser les graphiques par catégorie
- **Rectangle transparent** : Pour la zone interactive de détection souris

### Méthodes privées

- `drawCategory(categoryEntry)`: Dessine les readings d'une catégorie sous forme de segments

## Pauses

### Sémantique

Une pause est une **métadonnée temporelle**, matérialisée par deux relevés `PAUSE_START` et `PAUSE_END`. Elle ne constitue pas une frontière d'état.

Pour les catégories à observables **continus** (Lieu, Action) :
- Les segments traversent les pauses **sans coupure**.
- La fin d'un état actif reste déduite au relevé `DATA` ou `STOP` suivant, comme en dehors d'une pause.
- Les relevés `PAUSE_START` et `PAUSE_END` sont ignorés par la boucle de rendu continu : ils ne dessinent pas de géométrie et ne scindent pas les segments.

Pour les catégories **discrètes** (Évènements, observables one-shot) :
- Les pauses n'ont aucun effet sur le rendu : chaque relevé `DATA` reste un événement ponctuel, indépendamment des pauses.

### Overlay `maskPauses`

L'option de rendu `maskPauses` (défaut `true`) contrôle l'affichage visuel des pauses sur le graphe.

Quand `maskPauses` est activé (défaut) :
- Les pauses sont **masquées** : aucun overlay n'est dessiné, seuls les segments et marqueurs habituels sont visibles. Les lignes restent continues à travers les pauses, sans indication visuelle qu'une pause a eu lieu.

Quand `maskPauses` est désactivé (`false`) :
- Un **overlay semi-transparent** (rectangle gris, pleine hauteur de la zone de données) est dessiné sur chaque intervalle de pause, **au-dessus** des segments, pour révéler où se situent les pauses.
- Les segments continus restent visibles en dessous : l'overlay se superpose, il ne coupe pas les lignes.

L'option est exposée via `IGraphRenderOptions.maskPauses` (défaut dans `DEFAULT_GRAPH_RENDER_OPTIONS`). Dans l'interface, le toggle **« Masquer les pauses »** du drawer de personnalisation du graphe (`graph-customization-drawer`) pilote cette option.

Les intervalles de pause sont calculés à partir des paires `PAUSE_START` / `PAUSE_END` (logique partagée avec `@actograph/core`, module `calculatePausePeriods`).

### Statistiques

Les pauses interagissent aussi avec les statistiques, indépendamment du rendu graphique.

Une **option unique** dans la barre d'outils des statistiques : **« Traiter les pauses comme un état séparé »** (défaut activé, composable `use-statistics`, état `treatPausesAsSeparateState`).

Quand l'option est **activée** (défaut) :
- Les temps de pause sont **exclus** des durées des observables continus.
- Un segment **« Pause »** apparaît dans le camembert lorsque `pauseDuration > 0`.
- Le camembert utilise un **dénominateur unique** : durée totale d'observation incluant les pauses. Parts observables = durée active / durée totale ; part Pause = durée de pause / durée totale. La somme fait 100 %.

Quand l'option est **désactivée** (pauses transparentes) :
- Les temps de pause sont **inclus** dans les durées des observables.
- Aucun segment « Pause » séparé n'est affiché dans le camembert.

En interne : `includePauses = !treatPausesAsSeparateState` pour les appels à `@actograph/core`.

Voir `docs/features/20250115000000-22-23-statistiques-Sylvain-Meylan.md` pour le détail des calculs.

### Limitation : mode chronomètre + vidéo

En mode chronomètre avec une vidéo chargée (`videoPath` renseigné), les relevés `PAUSE_START` et `PAUSE_END` ne sont **pas** créés lors d'une pause de l'observation (comportement préexistant, voir `use-readings.ts`, méthodes `addPauseStartReading` / `addPauseEndReading`).

Conséquences :
- Aucun intervalle de pause n'est disponible pour le graphe ni pour les statistiques.
- L'option `maskPauses` et le toggle « Masquer les pauses » n'ont **aucun effet**.
- L'option « Traiter les pauses comme un état séparé » n'a **aucun effet** non plus.

Voir `docs/reading.md` (section intégration vidéo) pour le contexte d'enregistrement en mode vidéo.

## Intégration Vue

### Composant DCanvas

Le composant `DCanvas` (`front/lib-improba/components/app/canvas/DCanvas.vue`) fournit un canvas HTML avec redimensionnement automatique.

**Fonctionnalités** :
- **Redimensionnement automatique** : Utilise `ResizeObserver` pour détecter les changements de taille du conteneur parent
- **Deux modes de redimensionnement** :
  - **Mode square** (`square=true`) : Le canvas prend la plus petite dimension (largeur ou hauteur) pour créer un carré
  - **Mode normal** (`square=false`) : Le canvas s'adapte à toutes les dimensions du conteneur parent
- **Événements souris** : Émet des événements `canvasMouseEnter`, `canvasMouseMove`, `canvasMouseLeave`
- **Événement resize** : Émet un événement `resize` lors du redimensionnement (avec la taille en mode square)

**Props** :
- `canvasId` (String, optionnel) : ID HTML pour le canvas
- `square` (Boolean, défaut: false) : Active le mode carré

**Événements** :
- `resize` : Émis lors du redimensionnement (avec `size` en mode square)
- `canvasMouseEnter` : Émis lorsque la souris entre dans le canvas
- `canvasMouseMove` : Émis lorsque la souris se déplace sur le canvas
- `canvasMouseLeave` : Émis lorsque la souris quitte le canvas

**Références exposées** :
- `containerRef` : Référence au conteneur div (interne)
- `canvasRef` : Référence au canvas HTML (pour PixiJS)

**Gestion du cycle de vie** :
- Le composant nettoie automatiquement le `ResizeObserver` lors du démontage (`onBeforeUnmount`)
- Vérifie que les références existent avant d'y accéder pour éviter les erreurs lors du démontage
- Évite les fuites mémoire en arrêtant l'observation lors du changement d'onglet ou du démontage

**Exemple d'utilisation** :
```vue
<template>
  <d-canvas ref="canvasRef" @resize="onResize" />
</template>

<script lang="ts">
import { defineComponent, ref } from 'vue';

export default defineComponent({
  setup() {
    const canvasRef = ref<any>(null);
    
    const onResize = (size?: number) => {
      console.log('Canvas resized', size);
    };
    
    return {
      canvasRef,
      onResize,
    };
  },
});
</script>
```

### Composant Index.vue

Le composant principal (`Index.vue`) est très simple :
- Affiche un composant `d-canvas` qui fournit le canvas HTML
- Passe la référence au canvas au composable `use-graph`
- Le composant délègue toute la logique au composable

### Composable use-graph

Le composable `use-graph.ts` gère tout le cycle de vie du graphique :

**État partagé** :
- Conserve une référence à l'instance `PixiApp` dans un état réactif partagé
- Permet d'accéder à l'instance depuis d'autres composants si nécessaire

**Initialisation** :
- Crée une instance `PixiApp` lors de l'appel avec `init`
- Initialise PixiJS dans `onMounted` lorsque le canvas est disponible
- Récupère les données depuis `useObservation` (readings et protocol)
- Configure et dessine le graphique

**Nettoyage** :
- Détruit l'application PixiJS dans `onUnmounted`
- Libère toutes les ressources pour éviter les fuites mémoire

```typescript
import { useGraph } from './use-graph';

const canvasRef = ref<HTMLCanvasElement | null>(null);

const graph = useGraph({
  init: {
    canvasRef,
  },
});
```

### Cycle de vie

```typescript
onMounted(async () => {
  // 1. Initialisation de PixiJS avec le canvas HTML
  await pixiApp.init({ view: canvasRef.value.canvasRef });
  
  // 2. Récupération des données depuis le composable d'observation
  const obs = observation.sharedState.currentObservation;
  const readings = observation.readings.sharedState.currentReadings;
  const protocol = observation.protocol.sharedState.currentProtocol;
  obs.readings = readings;
  obs.protocol = protocol;
  
  // 3. Configuration des données dans tous les composants
  pixiApp.setData(obs);
  
  // 4. Rendu du graphique
  pixiApp.draw();
});

onUnmounted(() => {
  // Nettoyage complet : destruction de PixiJS et libération des ressources
  pixiApp.destroy();
  sharedState.pixiApp = null;
});
```

### Réactivité

Actuellement, le graphique ne se met pas à jour automatiquement. Pour mettre à jour le graphique lorsque les données changent, il faudrait ajouter un `watch` :

```typescript
watch(() => observation.readings.sharedState.currentReadings, async () => {
  const obs = observation.sharedState.currentObservation;
  if (obs && sharedState.pixiApp) {
    sharedState.pixiApp.setData(obs);
    await sharedState.pixiApp.draw();
  }
});
```

## Redimensionnement

### Redimensionnement automatique du conteneur

Le composant `DCanvas` gère automatiquement le redimensionnement du canvas selon son conteneur parent :
- Utilise `ResizeObserver` pour détecter les changements de taille
- Ajuste dynamiquement les dimensions du canvas
- Émet un événement `resize` pour notifier les composants parents

Le canvas HTML est redimensionné automatiquement par le composant, et PixiJS suit ce redimensionnement :

```typescript
await this.app.init({
  resizeTo: canvasElement, // Redimensionnement automatique selon le canvas HTML
});
```

**Important** : Le composant `DCanvas` nettoie automatiquement le `ResizeObserver` lors du démontage pour éviter les fuites mémoire et les erreurs lors du changement d'onglet.

### Ajustement de la hauteur

La hauteur est ajustée pour contenir tous les observables :

```typescript
const requiredHeight = this.yAxis.getRequiredHeight();
if (requiredHeight > this.app.canvas.height) {
  this.app.canvas.style.height = `${requiredHeight}px`;
  this.app.canvas.height = requiredHeight;
}
```

Cette logique s'exécute après le redimensionnement automatique du `DCanvas`, permettant d'ajuster la hauteur si nécessaire pour afficher tous les observables.

## Classes de base

### BaseGroup

Classe abstraite étendant `Container` de PixiJS pour tous les groupes d'éléments du graphique.

**Fonctionnalités** :
- Référence à l'application PixiJS
- Stockage de l'observation courante
- Méthode `clear()` pour nettoyer tous les graphiques enfants
- Méthode `init()` pour l'initialisation (peut être surchargée)
- Méthode abstraite `draw()` à implémenter par les classes filles

**Classes filles** : `YAxis`, `xAxis`, `DataArea`

### BaseGraphic

Classe étendant `Graphics` de PixiJS pour ajouter des fonctionnalités personnalisées.

**Fonctionnalités** :
- Suivi de la position du "stylo" graphique (`_pen`)
- Méthode `dashedLineTo()` pour dessiner des lignes en pointillés
- Surcharge de `moveTo()` et `lineTo()` pour mettre à jour la position du stylo

**Lignes pointillés** :
- Pattern par défaut : `[10, 5]` (10px dessinés, 5px d'espace)
- Calcule automatiquement les segments selon le pattern
- Alternance entre dessin et espacement

## Performance

### Optimisations

- **Rendu WebGL** : Utilisation de WebGL pour le rendu accéléré par le GPU
- **Containers** : Organisation hiérarchique pour un rendu efficace (stage → plot → axes/dataArea)
- **Graphiques séparés** : Chaque catégorie a son propre graphique pour faciliter le nettoyage
- **Calculs optimisés** : Les positions sont calculées une seule fois et mises en cache

### Gestion de la mémoire

```typescript
public destroy() {
  // Nettoyage de tous les composants
  this.yAxis.clear();
  this.xAxis.clear();
  this.dataArea.clear();
  
  // Destruction de l'application PixiJS
  // Cela libère automatiquement toutes les ressources WebGL
  this.app.destroy();
}
```

**Bonnes pratiques** :
- Toujours appeler `destroy()` lors du démontage du composant
- Utiliser `clear()` pour redessiner sans recréer les objets
- Les conteneurs PixiJS gèrent automatiquement la libération des ressources enfants

## Interactions

### Lignes de référence (implémenté)

Lors du mouvement de la souris dans la zone de données :
- **Ligne verticale** : Depuis le curseur jusqu'à l'axe X (aide à lire la date/heure ou la durée selon le mode)
  - En mode chronomètre : affiche la durée depuis t0
  - En mode calendrier : affiche la date/heure
- **Ligne horizontale** : Depuis le curseur jusqu'à l'axe Y (aide à lire l'observable)
- Les lignes disparaissent lorsque la souris quitte la zone

### Zoom et pan (implémenté — caméra)

Disponible en mode interactif :
- **Molette** : zoom centré sous le curseur (`viewport.scale`, 0.1×–5×)
- **Clic-glisser / touch** : pan (`viewport.x/y`)
- **Pinch** : zoom tactile
- **Boutons UI** : zoom in / out / reset (fit)

Ce n’est **pas** encore un zoom données (pas de recalcul de `pixelsPerMsec` ni de fenêtre temporelle). Voir la section [Zoom, pan et contrat de rendu](#zoom-pan-et-contrat-de-rendu).

Évolutions possibles :
- Zoom données sur la timeline (`pixelsPerMsec` + ticks)
- Chrome à taille fixe (axes/labels hors viewport scalé, ou contre-échelle)

### Sélection (futur)

Possibilités d'extension :
- Clic sur un reading pour le sélectionner
- Surbrillance des readings sélectionnés (changer la couleur des segments)
- Affichage des détails au survol (tooltip avec informations du reading)
- Sélection multiple avec Ctrl/Cmd

## Personnalisation

### Styles

Les styles peuvent être personnalisés :
- Couleurs des axes
- Couleurs des readings par type
- Taille des marqueurs
- Police et taille des labels
- Overlay des pauses (`maskPauses`, voir section [Pauses](#pauses))

### Options de rendu du graphe

```typescript
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '@actograph/graph';

// maskPauses : true par défaut — pauses masquées (pas d'overlay, segments continus)
const renderOptions = {
  ...DEFAULT_GRAPH_RENDER_OPTIONS,
  maskPauses: false, // false pour révéler les pauses via un overlay semi-transparent
};

pixiApp.setGraphRenderOptions(renderOptions);
```

Le drawer de personnalisation du graphe expose le toggle **« Masquer les pauses »**, qui met à jour `maskPauses` via `use-graph` (`setMaskPauses`).

### Configuration (couleurs)

```typescript
const config = {
  axisColor: 0x000000,
  gridColor: 0xcccccc,
  readingColors: {
    [ReadingTypeEnum.START]: 0x00ff00,
    [ReadingTypeEnum.STOP]: 0xff0000,
    [ReadingTypeEnum.DATA]: 0x0000ff,
  },
  // ...
};
```

## Dépannage

### Axes / traits qui disparaissent après zoom, hover ou changement d’onglet

**Cause typique** : un full draw efface les graphics des axes en premier (`yAxis.draw` / `xAxis.draw`), puis un chemin **partiel** (`requestRender` hover/pan, `redrawCategory`) peignait la scène avant la fin du redraw. Au resume d’onglet, un refresh trop tôt (canvas 0×0) ou un viewport conservé hors cadre aggravait le symptôme.

**Contrat à respecter** :
- Ne pas appeler `app.render()` depuis le hover : utiliser `PixiApp.requestRender()`
- Respecter `axesGraphicsDirty` : tant que les axes ne sont pas redessinés + rendus, forcer un full `draw()`
- Ne pas réintroduire de nudge `viewport.scale ± 0.0001`
- Après pan/zoom, laisser `setViewportTransform` appeler `updateWorldTransforms()` (`getGlobalTransform`)
- Au resume visibility : `prepareForResumeRefresh` + fit (`needsInitialFit`) + `redrawFromObservation`

Logs utiles : `[PixiApp] Full draw failed:`, `[use-graph] refreshGraph failed:`, `Graph redraw skipped due to inconsistent data:`.

### Canvas non affiché

Si le canvas n'apparaît pas :

1. Vérifiez que le canvas est bien monté dans le DOM
2. Vérifiez que la référence au canvas est correcte
3. Vérifiez les dimensions du conteneur parent
4. Consultez la console pour les erreurs PixiJS

### Erreur "Cannot read properties of null (reading 'parentElement')"

Si vous rencontrez cette erreur lors du changement d'onglet ou du démontage du composant :

**Cause** : Le `ResizeObserver` continue d'observer après le démontage du composant.

**Solution** : Le composant `DCanvas` nettoie automatiquement le `ResizeObserver` dans `onBeforeUnmount`. Si l'erreur persiste, vérifiez que :
- Le composant utilise bien `DCanvas` et non un canvas HTML directement
- La version de `DCanvas` inclut le nettoyage du `ResizeObserver`
- Aucun autre code ne crée de `ResizeObserver` sans le nettoyer

### Données non affichées

Si les données ne s'affichent pas :

1. Vérifiez que l'observation contient des readings
2. Vérifiez que le protocole contient des observables
3. Vérifiez que les dates des readings sont valides
4. Vérifiez les logs de la console

### Problèmes de performance

Si le rendu est lent :

1. Réduisez le nombre de readings affichés
2. Réduisez le nombre d'observables
3. Vérifiez que WebGL est activé
4. Optimisez les calculs de position

### Erreurs PixiJS

Si vous recevez des erreurs PixiJS :

1. Vérifiez que WebGL est supporté par le navigateur
2. Vérifiez la version de PixiJS
3. Consultez la documentation PixiJS
4. Vérifiez les logs détaillés

## Exemples

### Graphique simple

```vue
<template>
  <div class="graph-container">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { useGraph } from '@composables/use-observation/use-graph';
import { useObservation } from '@composables/use-observation';

export default defineComponent({
  name: 'GraphView',
  setup() {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const observation = useObservation();
    
    const { init } = useGraph({
      init: {
        canvasRef: canvasRef,
      },
    });
    
    return {
      canvasRef,
    };
  },
});
</script>
```

### Mise à jour dynamique

```typescript
// Lorsque les readings changent
watch(() => observation.readings.sharedState.currentReadings, async () => {
  const obs = observation.sharedState.currentObservation;
  if (obs && pixiApp) {
    pixiApp.setData(obs);
    await pixiApp.draw();
  }
});
```

