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
├── use-graph.ts                 # Composable Vue
├── pixi-app/
│   ├── index.ts                 # Classe principale PixiApp
│   ├── axis/
│   │   ├── x-axis.ts           # Axe temporel (X)
│   │   └── y-axis.ts            # Axe des observables (Y)
│   └── data-area/
│       └── index.ts             # Zone de données
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
- Chaque observable est une ligne horizontale
- Les observables sont organisés selon la structure du protocole
- L'ordre respecte la hiérarchie (catégories puis observables)

### Calcul de la hauteur

La hauteur de l'axe Y est calculée dynamiquement :

```typescript
const requiredHeight = this.yAxis.getRequiredHeight();
if (requiredHeight > canvas.height) {
  canvas.height = requiredHeight;
  canvas.style.height = `${requiredHeight}px`;
}
```

### Affichage

- **Labels** : Noms des observables
- **Lignes de grille** : Lignes horizontales pour chaque observable
- **Espacement** : Espacement uniforme entre les observables

## Axe X (Temps)

### Structure

L'axe X affiche la timeline :
- Plage de temps basée sur les readings
- Graduations temporelles
- Labels de dates/heures

### Calcul de la plage

La plage temporelle est calculée à partir des readings :

```typescript
const minDate = Math.min(...readings.map(r => r.dateTime.getTime()));
const maxDate = Math.max(...readings.map(r => r.dateTime.getTime()));
```

### Graduations

Les graduations sont adaptatives selon la plage :
- **Secondes** : Pour les plages courtes (< 1 minute)
- **Minutes** : Pour les plages moyennes (< 1 heure)
- **Heures** : Pour les plages longues (< 1 jour)
- **Jours** : Pour les plages très longues

## Zone de données (Data Area)

### Affichage des readings

La zone de données affiche les readings selon leur type :

- **START/STOP** : Marqueurs de début/fin
- **PAUSE_START/PAUSE_END** : Zones de pause
- **DATA** : Points ou segments sur les observables correspondants

### Mapping readings ↔ observables

Les readings sont associés aux observables selon :
- Le nom du reading correspondant au nom de l'observable
- La position sur l'axe Y correspondant à l'observable
- La position sur l'axe X correspondant à la date/heure

### Rendu

Le rendu utilise des primitives PixiJS :
- **Graphics** : Pour les lignes et formes
- **Text** : Pour les labels
- **Sprites** : Pour les icônes et marqueurs

## Intégration Vue

### Composable use-graph

```typescript
import { useGraph } from '@composables/use-observation/use-graph';

const { init } = useGraph({
  init: {
    canvasRef: canvasRef, // Référence Vue au canvas
  },
});
```

### Cycle de vie

```typescript
onMounted(async () => {
  // Initialisation du graphique
  await pixiApp.init({ view: canvasRef.value.canvasRef });
  
  // Chargement des données
  const observation = getCurrentObservation();
  pixiApp.setData(observation);
  
  // Dessin
  await pixiApp.draw();
});

onUnmounted(() => {
  // Nettoyage
  pixiApp.destroy();
});
```

### Réactivité

Le graphique se met à jour automatiquement lorsque :
- Les readings changent
- Le protocole change
- L'observation change

## Redimensionnement

### Redimensionnement automatique

Le canvas se redimensionne automatiquement selon son conteneur :

```typescript
await this.app.init({
  resizeTo: canvasElement, // Redimensionnement automatique
});
```

### Ajustement de la hauteur

La hauteur est ajustée pour contenir tous les observables :

```typescript
const requiredHeight = this.yAxis.getRequiredHeight();
if (requiredHeight > this.app.canvas.height) {
  this.app.canvas.style.height = `${requiredHeight}px`;
  this.app.canvas.height = requiredHeight;
}
```

## Performance

### Optimisations

- **Rendu WebGL** : Utilisation de WebGL pour le rendu accéléré
- **Containers** : Organisation hiérarchique pour un rendu efficace
- **Caching** : Mise en cache des éléments statiques
- **Dirty flags** : Redessin uniquement des parties modifiées

### Gestion de la mémoire

```typescript
public destroy() {
  // Nettoyer les ressources PixiJS
  this.yAxis.clear();
  this.xAxis.clear();
  this.dataArea.clear();
  
  // Détruire l'application
  this.app.destroy();
}
```

## Interactions

### Zoom (futur)

Le système peut être étendu pour supporter :
- Zoom sur la timeline
- Zoom sur les observables
- Pan (déplacement)

### Sélection (futur)

Possibilités d'extension :
- Clic sur un reading pour le sélectionner
- Surbrillance des readings sélectionnés
- Affichage des détails au survol

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

