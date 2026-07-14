import { onMounted, onUnmounted, shallowReactive, watch } from 'vue';
import { PixiApp } from '@actograph/graph';
import type { IGraphRenderOptions } from '@actograph/graph';
import { DEFAULT_GRAPH_RENDER_OPTIONS } from '@actograph/graph';
import { useObservation } from 'src/composables/use-observation';
import { useAppResume } from 'src/composables/use-app-resume';
import { isElementVisible } from 'src/utils/dom.utils';
import { IObservation, IProtocol, IReading } from '@services/observations/interface';
import type { IObservation as ICoreObservation, IReading as ICoreReading } from '@actograph/core';

/** API may deserialize dateTime as string; normalize before graph helpers. */
function normalizeReadingsForGraph(readings: IReading[]): ICoreReading[] {
  return readings.map((reading) => ({
    ...reading,
    dateTime:
      reading.dateTime instanceof Date ? reading.dateTime : new Date(reading.dateTime),
  }));
}

/**
 * État partagé du graphique.
 * Permet de conserver une référence à l'instance PixiApp entre les différents
 * composants qui utilisent le composable useGraph.
 */
// shallowReactive : garder le type nominal PixiApp (reactive() applique UnwrapNestedRefs
// et vue-tsc voit alors un simple objet de méthodes publiques, plus assignable à PixiApp).
const sharedState = shallowReactive({
  pixiApp: null as PixiApp | null,
  // true tant que PixiJS n'a pas fini son init() + premier rendu.
  // Sert à afficher un overlay pour masquer le buffer GPU noir.
  loading: false,
  // true une fois que init() a abouti (renderer + axes/dataArea créés).
  // Garde pour éviter les setData()/draw() avant que PixiApp soit prêt.
  ready: false,
  graphRenderOptions: {
    ...DEFAULT_GRAPH_RENDER_OPTIONS,
  } as IGraphRenderOptions,
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

  const redrawFromObservation = async (pixiApp: PixiApp): Promise<void> => {
    const obs = observation.sharedState.currentObservation as IObservation;
    if (!obs) return;

    const readings = observation.readings?.sharedState?.currentReadings ?? [];
    const protocol = observation.protocol?.sharedState?.currentProtocol ?? null;
    if (!protocol) return;

    try {
      const normalizedReadings = normalizeReadingsForGraph(readings as IReading[]);
      obs.readings = normalizedReadings as IReading[];
      obs.protocol = protocol as IProtocol;
      pixiApp.setGraphRenderOptions(sharedState.graphRenderOptions, { redraw: false });
      pixiApp.setData({
        ...(obs as ICoreObservation),
        readings: normalizedReadings,
      });
      await pixiApp.draw();
    } catch (error) {
      // Guard rail: don't break the page on transient/partial data while editing.
      console.warn('Graph redraw skipped due to inconsistent data:', error);
    }
  };

  const getCanvasElement = (): HTMLCanvasElement | null => {
    return options?.init?.canvasRef?.value?.canvasRef ?? null;
  };

  const refreshGraph = (): void => {
    if (!sharedState.ready || !sharedState.pixiApp || !isElementVisible(getCanvasElement())) {
      return;
    }
    sharedState.pixiApp.resizeFromCanvas();
    void redrawFromObservation(sharedState.pixiApp);
  };

  const onCanvasResize = (): void => {
    // Tant que PixiApp n'est pas initialisé, resizeFromCanvas()/draw() n'ont
    // pas de renderer ni d'axes : on évite des appels qui lèveraient une
    // exception silencieuse (et du travail gaspillé) pendant l'init.
    if (!sharedState.ready || !sharedState.pixiApp) {
      return;
    }
    const didResize = sharedState.pixiApp.resizeFromCanvas();
    if (didResize) {
      void redrawFromObservation(sharedState.pixiApp);
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

      // overlay actif jusqu'au premier rendu : masque le buffer GPU noir
      sharedState.loading = true;
      sharedState.ready = false;

      try {
        // Initialisation de l'application PixiJS avec le canvas HTML
        // Le canvas sera utilisé pour le rendu WebGL
        await pixiApp.init({
          view: options.init.canvasRef.value.canvasRef,
        });

        // À partir d'ici le renderer et les axes existent : les redraws sont sûrs.
        sharedState.ready = true;

        // Récupération de l'observation courante depuis le composable
        await redrawFromObservation(pixiApp);

        console.info('Pixi app initialized');

        // On garde l'overlay jusqu'à ce qu'une frame ait réellement été peinte,
        // sinon le canvas WebGL (buffer non initialisé = noir) reste visible
        // pendant le tout premier rendu. Deux rAF = au moins une frame composée.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
      } catch (error) {
        console.error('Failed to initialize Pixi app:', error);
      } finally {
        // masque l'overlay une fois la première frame peinte (ou en cas d'échec)
        sharedState.loading = false;
      }
    });

    useAppResume(refreshGraph);

    /**
     * Watch pour rafraîchir le graphe quand les relevés changent (bug 3.4 : horodatage modifié)
     */
    watch(
      () => observation.readings?.sharedState?.currentReadings ?? [],
      () => {
        if (!sharedState.ready || !sharedState.pixiApp) return;
        void redrawFromObservation(sharedState.pixiApp);
      },
      { deep: true }
    );

    watch(
      () => observation.protocol?.sharedState?.currentProtocol,
      () => {
        if (!sharedState.ready || !sharedState.pixiApp) return;
        void redrawFromObservation(sharedState.pixiApp);
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
      sharedState.ready = false;
      sharedState.loading = false;
    });
  }

  return {
    sharedState,
    onCanvasResize,
  };
}