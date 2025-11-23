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

```
front/src/pages/userspace/analyse/_components/graph/
├── Index.vue                    # Composant Vue principal
├── use-graph.ts                 # Composable Vue gérant le cycle de vie
├── pixi-app/
│   ├── index.ts                 # Classe principale PixiApp
│   ├── axis/
│   │   ├── x-axis.ts           # Axe temporel (X) avec calcul automatique des graduations
│   │   └── y-axis.ts            # Axe des observables (Y) avec calcul dynamique de la hauteur
│   ├── data-area/
│   │   └── index.ts             # Zone de données avec interactions souris
│   └── lib/
│       ├── base-graphic.ts      # Classe de base pour les graphiques (lignes pointillés)
│       └── base-group.ts         # Classe de base pour les groupes de composants
```

## Classe PixiApp

### Initialisation

```typescript
import { PixiApp } from './pixi-app';

const pixiApp = new PixiApp();

await pixiApp.init({
  view: canvasElement, // Référence au canvas HTML
});
```

### Configuration

L'application PixiJS est configurée avec :
- **Background** : Fond blanc
- **ResizeTo** : Redimensionnement automatique selon le canvas
- **View** : Canvas HTML fourni

### Structure du graphique

Le graphique est composé de trois éléments principaux :

1. **Y-Axis** : Axe vertical avec les observables du protocole
2. **X-Axis** : Axe horizontal avec la timeline
3. **Data Area** : Zone centrale affichant les données

```typescript
this.yAxis = new yAxis(this.app);
this.xAxis = new xAxis(this.app, this.yAxis);
this.dataArea = new DataArea(this.app, this.yAxis, this.xAxis);

this.plot = new Container();
this.plot.addChild(this.xAxis);
this.plot.addChild(this.yAxis);
this.plot.addChild(this.dataArea);

this.app.stage.addChild(this.plot);
```

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

L'axe Y affiche les observables du protocole :
- Chaque observable est une ligne horizontale (tick)
- Les observables sont organisés selon la structure du protocole
- L'ordre respecte la hiérarchie (catégories puis observables)
- L'axe est dessiné de bas en haut avec une flèche en haut

### Positionnement

L'axe Y est positionné avec un décalage fixe :
- **X** : 150px depuis la gauche (espace pour les labels)
- **Y début** : Calculé dynamiquement selon le nombre d'observables
- **Y fin** : 20px depuis le haut (marge supérieure)

### Calcul de la hauteur

La hauteur de l'axe Y est calculée dynamiquement selon :
- **30px par observable** : Espace pour chaque observable
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

La méthode `computeAxisLengthAndTicks()` parcourt toutes les catégories et leurs observables :
1. Pour chaque observable : ajoute 30px à la longueur totale et crée un tick
2. Entre chaque catégorie : ajoute 15px d'espacement
3. Retourne la longueur totale et la liste des ticks avec leurs positions relatives

### Affichage

- **Ligne principale** : Ligne verticale de 2px de largeur en noir
- **Flèche** : Triangle rempli en haut de l'axe pointant vers le haut
- **Ticks** : Lignes horizontales de 1px de largeur, s'étendant de 10px à gauche à 10px à droite de l'axe
- **Labels** : Noms des observables affichés à gauche de l'axe, alignés à droite et centrés verticalement
  - Police : Arial, 12px
  - Position : 12px à gauche de l'axe

### Méthodes publiques

- `getPosFromLabel(label: string)`: Retourne la position Y d'un observable à partir de son nom
- `getAxisStart()`: Retourne la position de départ de l'axe (en bas)
- `getAxisEnd()`: Retourne la position de fin de l'axe (en haut)
- `getRequiredHeight()`: Calcule la hauteur minimale requise pour le canvas

## Axe X (Temps)

### Structure

L'axe X affiche la timeline :
- Plage de temps basée sur les readings
- Graduations temporelles adaptatives
- Labels de dates/heures inclinés à 45°
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
- **Labels** : Dates/heures affichées sous l'axe, inclinées à 45° pour éviter le chevauchement
  - Format : `dd-MM-yyyy HH:mm:ss.xxx` (format français)
  - Police : Arial, 12px
  - Position : 12px sous l'axe, légèrement décalés à gauche

### Méthodes publiques

- `getPosFromDateTime(dateTime: Date | string)`: Convertit une date/heure en position X sur le canvas
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

### Interactions souris

La zone de données gère les interactions avec la souris :

**Lignes de référence** :
- Lors du mouvement de la souris, deux lignes en pointillés sont affichées :
  - **Ligne verticale** : Depuis le curseur jusqu'à l'axe X (référence temporelle)
  - **Ligne horizontale** : Depuis le curseur jusqu'à l'axe Y (référence observable)
- Ces lignes aident l'utilisateur à lire les valeurs en suivant le curseur depuis l'origine
- Les lignes disparaissent lorsque la souris quitte la zone

**Zone interactive** :
- Un rectangle transparent couvre toute la zone de données
- Ce rectangle capture les événements souris pour afficher les lignes de référence
- Les coordonnées sont converties en coordonnées locales pour un positionnement précis

### Rendu

Le rendu utilise des primitives PixiJS :
- **BaseGraphic** : Pour les lignes et segments (avec support des lignes pointillés)
- **Container** : Pour organiser les graphiques par catégorie
- **Rectangle transparent** : Pour la zone interactive de détection souris

### Méthodes privées

- `drawCategory(categoryEntry)`: Dessine les readings d'une catégorie sous forme de segments

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

**Classes filles** : `yAxis`, `xAxis`, `DataArea`

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
- **Ligne verticale** : Depuis le curseur jusqu'à l'axe X (aide à lire la date/heure)
- **Ligne horizontale** : Depuis le curseur jusqu'à l'axe Y (aide à lire l'observable)
- Les lignes disparaissent lorsque la souris quitte la zone

### Zoom (futur)

Le système peut être étendu pour supporter :
- Zoom sur la timeline (modifier `pixelsPerMsec` et recalculer les ticks)
- Zoom sur les observables (modifier l'espacement entre les ticks de l'axe Y)
- Pan (déplacement) : Modifier les positions de départ des axes

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

### Configuration

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

