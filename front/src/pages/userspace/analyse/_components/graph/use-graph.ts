import { onMounted, onUnmounted, reactive, ref, watch } from 'vue';
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
      const obs = observation.sharedState.currentObservation as IObservation;
      if (!obs) {
        throw new Error('No observation found (use-graph.ts)');
      }

      // Récupération des readings et du protocole depuis les états partagés
      // Ces données sont nécessaires pour construire le graphique
      const readings = observation.readings?.sharedState?.currentReadings ?? [];
      const protocol = observation.protocol?.sharedState?.currentProtocol ?? null;
      
      // Vérification que le protocole est disponible
      if (!protocol) {
        console.warn('No protocol found, cannot draw graph');
        return;
      }
      
      // Enrichissement de l'observation avec les readings et le protocole
      // (ces données peuvent ne pas être directement dans l'observation)
      obs.readings = readings as IReading[];
      obs.protocol = protocol as IProtocol;

      // Configuration des données dans PixiApp
      // Cette méthode prépare les données pour le rendu (calcul des positions, etc.)
      pixiApp.setData(obs as ICoreObservation);

      // Rendu du graphique
      // Cette méthode dessine tous les éléments : axes, données, labels, etc.
      pixiApp.draw();

      console.info('Pixi app initialized');
    });

    /**
     * Watch pour rafraîchir le graphe quand les relevés changent (bug 3.4 : horodatage modifié)
     */
    watch(
      () => observation.readings?.sharedState?.currentReadings ?? [],
      (readings) => {
        if (!sharedState.pixiApp || !readings.length) return;

        const obs = observation.sharedState.currentObservation as IObservation;
        if (!obs) return;

        const protocol = observation.protocol?.sharedState?.currentProtocol ?? null;
        if (!protocol) return;

        obs.readings = readings as IReading[];
        obs.protocol = protocol as IProtocol;

        sharedState.pixiApp.setData(obs as ICoreObservation);
        sharedState.pixiApp.draw();
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