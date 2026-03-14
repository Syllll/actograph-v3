import { onMounted, onUnmounted, reactive, watch } from 'vue';
import { PixiApp } from '@actograph/graph';
import { useObservation } from 'src/composables/use-observation';
import { IObservation, IProtocol, IReading } from '@services/observations/interface';
import type { IObservation as ICoreObservation } from '@actograph/core';

/**
 * État partagé du graphique.
 * Permet de conserver une référence à l'instance PixiApp entre les différents
 * composants qui utilisent le composable useGraph.
 */
const sharedState = reactive({
  pixiApp: null as PixiApp | null,
});

/**
 * Composable Vue pour gérer le graphique d'activité avec PixiJS.
 * 
 * Ce composable encapsule toute la logique d'initialisation, de chargement des données
 * et de rendu du graphique. Il gère le cycle de vie de l'application PixiJS :
 * - Création lors du montage du composant
 * - Initialisation avec le canvas HTML
 * - Chargement des données d'observation
 * - Rendu du graphique
 * - Nettoyage lors du démontage
 * 
 * @param options - Options d'initialisation du graphique
 * @param options.init - Configuration d'initialisation
 * @param options.init.canvasRef - Référence Vue au canvas HTML qui sera utilisé par PixiJS
 * 
 * @example
 * ```typescript
 * const canvasRef = ref<HTMLCanvasElement | null>(null);
 * const graph = useGraph({
 *   init: {
 *     canvasRef,
 *   },
 * });
 * ```
 */
export const useGraph = (options?: {
  init?: {
    canvasRef: any;
  };
}) => {
  // Récupération du composable d'observation pour accéder aux données
  const observation = useObservation();

  const redrawFromObservation = (pixiApp: PixiApp): void => {
    const obs = observation.sharedState.currentObservation as IObservation;
    if (!obs) return;

    const readings = observation.readings?.sharedState?.currentReadings ?? [];
    const protocol = observation.protocol?.sharedState?.currentProtocol ?? null;
    if (!protocol) return;

    try {
      obs.readings = readings as IReading[];
      obs.protocol = protocol as IProtocol;
      pixiApp.setData(obs as ICoreObservation);
      pixiApp.draw();
    } catch (error) {
      // Guard rail: don't break the page on transient/partial data while editing.
      console.warn('Graph redraw skipped due to inconsistent data:', error);
    }
  };

  // Si des options d'initialisation sont fournies, créer et initialiser PixiApp
  if (options?.init) {
    // Création de l'instance PixiApp qui gère tout le rendu graphique
    const pixiApp = new PixiApp();
    sharedState.pixiApp = pixiApp;

    /**
     * Hook appelé lorsque le composant est monté dans le DOM.
     * À ce moment, le canvas est disponible et on peut initialiser PixiJS.
     */
    onMounted(async () => {
      // Validation des options d'initialisation
      if (!options.init) {
        throw new Error('No init options provided');
      }

      if (!options.init.canvasRef) {
        throw new Error('No canvasRef provided');
      }

      // Initialisation de l'application PixiJS avec le canvas HTML
      // Le canvas sera utilisé pour le rendu WebGL
      await pixiApp.init({
        view: options.init.canvasRef.value.canvasRef,
      });

      // Récupération de l'observation courante depuis le composable
      redrawFromObservation(pixiApp);

      console.info('Pixi app initialized');
    });

    /**
     * Watch pour rafraîchir le graphe quand les relevés changent (bug 3.4 : horodatage modifié)
     */
    watch(
      () => observation.readings?.sharedState?.currentReadings ?? [],
      () => {
        if (!sharedState.pixiApp) return;
        redrawFromObservation(sharedState.pixiApp);
      },
      { deep: true }
    );

    watch(
      () => observation.protocol?.sharedState?.currentProtocol,
      () => {
        if (!sharedState.pixiApp) return;
        redrawFromObservation(sharedState.pixiApp);
      },
      { deep: true }
    );

    /**
     * Hook appelé lorsque le composant est démonté du DOM.
     * On nettoie les ressources PixiJS pour éviter les fuites mémoire.
     */
    onUnmounted(() => {
      // Destruction de l'application PixiJS et libération des ressources
      pixiApp.destroy();
      sharedState.pixiApp = null;
    });
  }

  return {
    sharedState,
  };
}