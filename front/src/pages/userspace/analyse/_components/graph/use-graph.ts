import { onMounted, onUnmounted, shallowReactive, watch } from 'vue';
import { PixiApp } from '@actograph/graph';
import type { IGraphRenderOptions } from '@actograph/graph';
import { DEFAULT_GRAPH_RENDER_OPTIONS, TimeDisplayFormatEnum } from '@actograph/graph';
import { useObservation } from 'src/composables/use-observation';
import { useAppResume } from 'src/composables/use-app-resume';
import { isElementVisible } from 'src/utils/dom.utils';
import { IObservation, IReading } from '@services/observations/interface';
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
  // Miroir réactif de PixiApp.axisStretch, pour piloter les sliders du menu
  // de réglages d'échelle (graph/Index.vue). PixiApp reste la source de
  // vérité pour le rendu ; ceci n'est utile qu'à l'affichage des sliders.
  axisStretch: { x: 1, y: 1 },
});

/** Debounce partagé : Index (watches) et drawer coalescent ensemble. */
let scheduledRedrawId: ReturnType<typeof setTimeout> | null = null;
/** Invalide un setData/draw dépassé si un redraw plus récent a démarré. */
let redrawGeneration = 0;
/**
 * Compteur de suppression : pendant un edit de préférence visuelle optimiste,
 * l'assignation de currentProtocol ne doit pas enchaîner un full setData via
 * le watch (sinon flicker + double travail avec redrawCategory/Observable).
 */
let scheduledRedrawSuppressionCount = 0;

const clearScheduledRedraw = (): void => {
  if (scheduledRedrawId !== null) {
    clearTimeout(scheduledRedrawId);
    scheduledRedrawId = null;
  }
};

/**
 * Composable Vue pour gérer le graphique d'activité avec PixiJS.
 *
 * Contrat de redraw :
 * - Full (setData + draw) : chargement obs, relevés, protocole structurel, rollback, resize
 * - Partiel (setProtocol + redrawCategory/Observable) : prefs visuelles optimistes,
 *   enveloppées dans runWithoutScheduledRedraw pour ne pas déclencher le watch
 *
 * @param options - Options d'initialisation du graphique
 * @param options.init - Configuration d'initialisation
 * @param options.init.canvasRef - Référence Vue au canvas HTML qui sera utilisé par PixiJS
 */
export const useGraph = (options?: {
  init?: {
    canvasRef: any;
  };
}) => {
  const observation = useObservation();

  /**
   * Chemin unique de rendu cohérent : lit obs + protocole + relevés courants,
   * puis setData + draw. Ne pas appeler setProtocol/draw seuls pour un sync
   * structurel : dataArea ne reconstruit readingsPerCategory que dans setData.
   */
  const redrawFromObservation = async (pixiApp: PixiApp): Promise<void> => {
    // Pendant `_loadObservation`, relevés puis protocole sont hydratés alors que
    // `currentObservation` est encore null ; un rendu partiel serait incohérent.
    if (observation.sharedState.loading) return;

    const obs = observation.sharedState.currentObservation as IObservation;
    if (!obs) return;

    const readings = observation.readings?.sharedState?.currentReadings ?? [];
    const protocol = observation.protocol?.sharedState?.currentProtocol ?? null;
    if (!protocol) return;

    // Tout redraw immédiat (resize, requestRedraw, callback debounce) annule
    // un éventuel timer concurrent pour éviter un second full redraw 50 ms plus tard.
    clearScheduledRedraw();

    const generation = ++redrawGeneration;

    try {
      await pixiApp.waitForIdle();
      if (generation !== redrawGeneration || sharedState.pixiApp !== pixiApp) return;

      const normalizedReadings = normalizeReadingsForGraph(readings as IReading[]);
      pixiApp.setGraphRenderOptions(sharedState.graphRenderOptions, { redraw: false });
      if (generation !== redrawGeneration || sharedState.pixiApp !== pixiApp) return;

      pixiApp.setData({
        ...(obs as ICoreObservation),
        readings: normalizedReadings,
        protocol: protocol as unknown as ICoreObservation['protocol'],
      });
      if (generation !== redrawGeneration || sharedState.pixiApp !== pixiApp) return;

      await pixiApp.draw();
      if (generation !== redrawGeneration || sharedState.pixiApp !== pixiApp) return;
    } catch (error) {
      // Guard rail: don't break the page on transient/partial data while editing.
      console.warn('Graph redraw skipped due to inconsistent data:', error);
    }
  };

  const getCanvasElement = (): HTMLCanvasElement | null => {
    return options?.init?.canvasRef?.value?.canvasRef ?? null;
  };

  /**
   * Planifie un redessin complet (setData + draw) après coalescence 50 ms.
   */
  const scheduleRedraw = (): void => {
    if (!sharedState.ready || !sharedState.pixiApp) return;
    if (observation.sharedState.loading) return;
    if (scheduledRedrawSuppressionCount > 0) return;
    clearScheduledRedraw();
    scheduledRedrawId = setTimeout(() => {
      scheduledRedrawId = null;
      if (!sharedState.ready || !sharedState.pixiApp) return;
      if (observation.sharedState.loading) return;
      void redrawFromObservation(sharedState.pixiApp);
    }, 50);
  };

  /**
   * Redessin complet immédiat (bypass debounce) — rollback / sync structurel.
   */
  const requestRedraw = (): void => {
    if (!sharedState.ready || !sharedState.pixiApp) return;
    if (observation.sharedState.loading) return;
    void redrawFromObservation(sharedState.pixiApp);
  };

  /**
   * Exécute `fn` sans qu'une assignation protocole/relevés ne planifie de full redraw.
   * À utiliser autour des updates optimistes purement visuels (couleur, motif, etc.).
   */
  const runWithoutScheduledRedraw = async (
    fn: () => void | Promise<void>,
  ): Promise<void> => {
    scheduledRedrawSuppressionCount += 1;
    try {
      await fn();
    } finally {
      scheduledRedrawSuppressionCount -= 1;
    }
  };

  /**
   * Change le format d'affichage du temps sur l'axe X et le survol du graphe.
   * La persistance par chronique (observation.meta.timeDisplayFormat) est gérée
   * par le composant graph/Index.vue.
   */
  const setTimeDisplayFormat = (format: TimeDisplayFormatEnum): void => {
    sharedState.graphRenderOptions = {
      ...sharedState.graphRenderOptions,
      timeDisplayFormat: format,
    };
    if (sharedState.ready && sharedState.pixiApp) {
      sharedState.pixiApp.setGraphRenderOptions(sharedState.graphRenderOptions);
    }
  };

  /**
   * Étirement indépendant des axes (x = temps, y = catégories), par-dessus le
   * zoom uniforme existant. La persistance par chronique
   * (observation.meta.graphXStretch/graphYCompact) est gérée par graph/Index.vue.
   */
  const setAxisStretch = (next: { x?: number; y?: number }): void => {
    sharedState.axisStretch = {
      x: next.x ?? sharedState.axisStretch.x,
      y: next.y ?? sharedState.axisStretch.y,
    };
    if (sharedState.ready && sharedState.pixiApp) {
      void sharedState.pixiApp.setAxisStretch(next);
    }
  };

  const refreshGraph = (attempt = 0): void => {
    if (!sharedState.ready || !sharedState.pixiApp) {
      return;
    }
    // After a browser tab switch the canvas can still be 0×0 for a few frames.
    // Skipping entirely left a cleared/stale WebGL scene (axes gone, crosshair only).
    if (!isElementVisible(getCanvasElement())) {
      if (attempt < 12) {
        window.setTimeout(() => refreshGraph(attempt + 1), 40 + attempt * 20);
      }
      return;
    }
    const pixiApp = sharedState.pixiApp;
    pixiApp.prepareForResumeRefresh();
    // Wait for any in-flight export/draw before resize: resizeFromCanvas no-ops
    // while exportInProgress, and a skipped resize would leave a stale viewport.
    void (async () => {
      try {
        await pixiApp.waitForIdle();
        if (!sharedState.ready || sharedState.pixiApp !== pixiApp) return;
        if (!isElementVisible(getCanvasElement())) {
          if (attempt < 12) {
            window.setTimeout(() => refreshGraph(attempt + 1), 40 + attempt * 20);
          }
          return;
        }
        pixiApp.resizeFromCanvas({ skipRender: true });
        await redrawFromObservation(pixiApp);
      } catch (error) {
        console.error('[use-graph] refreshGraph failed:', error);
        if (attempt < 12) {
          window.setTimeout(() => refreshGraph(attempt + 1), 80 + attempt * 30);
        }
      }
    })();
  };

  const onCanvasResize = (): void => {
    // Tant que PixiApp n'est pas initialisé, resizeFromCanvas()/draw() n'ont
    // pas de renderer ni d'axes : on évite des appels qui lèveraient une
    // exception silencieuse (et du travail gaspillé) pendant l'init.
    if (!sharedState.ready || !sharedState.pixiApp) {
      return;
    }
    const didResize = sharedState.pixiApp.resizeFromCanvas({ skipRender: true });
    if (didResize) {
      void redrawFromObservation(sharedState.pixiApp);
    }
  };

  // Si des options d'initialisation sont fournies, créer et initialiser PixiApp
  if (options?.init) {
    const pixiApp = new PixiApp();
    sharedState.pixiApp = pixiApp;

    // Enchaînement `_loadObservation` :
    //   loading=true → obs=null → readings=[] → protocol=null
    //   → await loadReadings → await loadProtocol → obs=… → loading=false
    // Pendant le chargement, les watches early-return. À la fin, loading/id
    // déclenchent le seul redessin cohérent du triplet.

    onMounted(async () => {
      if (!options.init) {
        throw new Error('No init options provided');
      }

      if (!options.init.canvasRef) {
        throw new Error('No canvasRef provided');
      }

      sharedState.loading = true;
      sharedState.ready = false;

      try {
        await pixiApp.init({
          view: options.init.canvasRef.value.canvasRef,
        });

        sharedState.ready = true;

        await redrawFromObservation(pixiApp);

        console.info('Pixi app initialized');

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        );
      } catch (error) {
        console.error('Failed to initialize Pixi app:', error);
      } finally {
        sharedState.loading = false;
      }
    });

    useAppResume(refreshGraph);

    watch(
      () => observation.sharedState.loading,
      (loading) => {
        if (!loading) scheduleRedraw();
      }
    );

    watch(
      () => observation.sharedState.currentObservation?.id,
      () => scheduleRedraw()
    );

    watch(
      () => observation.readings?.sharedState?.currentReadings ?? [],
      scheduleRedraw,
      { deep: true }
    );

    watch(
      () => observation.protocol?.sharedState?.currentProtocol,
      scheduleRedraw,
      { deep: true }
    );

    onUnmounted(() => {
      clearScheduledRedraw();
      redrawGeneration += 1;
      pixiApp.destroy();
      sharedState.pixiApp = null;
      sharedState.ready = false;
      sharedState.loading = false;
    });
  }

  return {
    sharedState,
    onCanvasResize,
    setTimeDisplayFormat,
    setAxisStretch,
    /** Redessin complet immédiat (setData + draw). */
    requestRedraw,
    /** Redessin complet coalescé (50 ms). */
    scheduleRedraw,
    /** Coupe le scheduleRedraw pendant un update optimiste purement visuel. */
    runWithoutScheduledRedraw,
  };
};
