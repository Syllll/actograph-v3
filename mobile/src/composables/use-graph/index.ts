/**
 * Composable for managing the PixiJS activity graph in mobile.
 * 
 * ⚠️ ARCHITECTURE D'INITIALISATION - LIRE ATTENTIVEMENT :
 * 
 * Ce composable ne s'auto-initialise PAS dans onMounted.
 * L'initialisation est déclenchée par Index.vue quand DCanvas émet 'ready'.
 * 
 * POURQUOI ?
 * Sur mobile/Capacitor, le layout du WebView peut prendre du temps à se calculer.
 * DCanvas attend que son parent ait des dimensions valides, configure le canvas,
 * puis émet 'ready'. C'est seulement à ce moment que le canvas est prêt pour PixiJS.
 * 
 * FLUX :
 * 1. Index.vue monte → useGraph() est appelé (state initialisé)
 * 2. DCanvas.onMounted → poll pour dimensions → configure canvas → emit('ready')
 * 3. Index.vue.onCanvasReady → appelle graph.methods.initGraph()
 * 4. initGraph → vérifie dimensions → crée PixiApp → dessine
 * 
 * ⚠️ NE JAMAIS appeler initGraph() avant que DCanvas ait émis 'ready' !
 * Le canvas n'aurait pas de dimensions valides et l'init échouerait.
 * 
 * ÉTAT LOCAL :
 * Chaque instance de useGraph a son propre état (pas partagé).
 * Cela évite les conflits lors de la navigation entre pages.
 * 
 * @see mobile/src/components/app/canvas/DCanvas.vue
 * @see mobile/src/pages/graph/Index.vue
 */

import { reactive, computed, watch, onUnmounted, type Ref } from 'vue';
import { PixiApp } from '@actograph/graph';
import {
  type IMobileObservation,
  type IMobileProtocolItem,
  type IMobileReading,
} from '@actograph/core';
import { convertMobileObservation } from '@actograph/core/utils/mobile-compat';
import { useChronicle } from '../use-chronicle';

/**
 * Graph state interface
 */
interface GraphState {
  /** Current zoom level (1 = 100%) */
  zoomLevel: number;
  /** Whether the graph is initialized and ready */
  ready: boolean;
  /** Whether the graph is currently loading */
  loading: boolean;
  /** Error message if initialization failed */
  error: string | null;
}

/**
 * Options for useGraph composable
 */
interface UseGraphOptions {
  /** Reference to the DCanvas component (which exposes canvasRef) */
  canvasRef: Ref<{ canvasRef: HTMLCanvasElement | null } | null>;
}

/**
 * Composable for managing the activity graph.
 * Note: Each instance has its own state to avoid conflicts when navigating.
 */
export function useGraph(options: UseGraphOptions) {
  // État local à cette instance (pas partagé)
  const sharedState = reactive<GraphState>({
    zoomLevel: 1,
    ready: false,
    loading: false,
    error: null,
  });

  // PixiApp instance for this component
  let pixiAppInstance: PixiApp | null = null;
  let destroyed = false;
  const chronicle = useChronicle();
  const { canvasRef } = options;

  // Computed helpers
  const hasData = computed(() => 
    chronicle.hasChronicle.value && chronicle.hasReadings.value
  );

  /**
   * Get the actual canvas element from DCanvas component.
   */
  function getCanvasElement(): HTMLCanvasElement | null {
    return canvasRef.value?.canvasRef ?? null;
  }

  /**
   * Draw/redraw the graph with current data.
   */
  function drawGraph(): void {
    if (!pixiAppInstance) {
      console.warn('[useGraph] Cannot draw: PixiApp not initialized');
      return;
    }

    if (!chronicle.sharedState.currentChronicle) {
      console.warn('[useGraph] Cannot draw: No chronicle loaded');
      return;
    }

    if (!chronicle.sharedState.currentProtocol || chronicle.sharedState.currentProtocol.length === 0) {
      sharedState.error = 'Aucun protocole disponible';
      return;
    }

    try {
      const observation = convertMobileObservation(
        chronicle.sharedState.currentChronicle as IMobileObservation,
        chronicle.sharedState.currentProtocol as IMobileProtocolItem[],
        chronicle.sharedState.currentReadings as IMobileReading[]
      );

      console.log('[useGraph] Drawing', observation.readings?.length, 'readings');

      pixiAppInstance.setData(observation);
      pixiAppInstance.draw();
      sharedState.error = null;
    } catch (error) {
      console.error('[useGraph] Draw failed:', error);
      sharedState.error = error instanceof Error 
        ? `Erreur lors du rendu: ${error.message}`
        : 'Erreur lors du rendu du graphique';
    }
  }

  /**
   * Destroy the PixiJS application and cleanup.
   */
  function destroyGraph(): void {
    destroyed = true;
    if (pixiAppInstance) {
      try {
        pixiAppInstance.destroy();
      } catch (error) {
        console.warn('Error during graph destruction:', error);
      }
      pixiAppInstance = null;
    }
    sharedState.ready = false;
    sharedState.loading = false;
    sharedState.error = null;
  }

  /**
   * Initialize the PixiJS application.
   * 
   * ⚠️ APPELÉ UNIQUEMENT par Index.vue quand DCanvas émet 'ready'.
   * Ne pas appeler manuellement sans s'assurer que le canvas est prêt.
   * 
   * ⚠️ NOTE SUR sharedState.loading :
   * On set loading=true pendant l'init, mais Index.vue affiche un OVERLAY
   * au lieu de détruire DCanvas. C'est crucial car détruire/recréer DCanvas
   * réinitialiserait le canvas et effacerait le graphique.
   * 
   * @see Index.vue pour la gestion de l'overlay loading
   */
  async function initGraph(): Promise<void> {
    // Guard : éviter les doubles initialisations
    if (sharedState.ready || sharedState.loading) {
      console.log('[useGraph] Already ready or loading, skipping init');
      return;
    }

    destroyed = false;

    // =========================================================================
    // VÉRIFICATIONS PRÉ-INITIALISATION
    // =========================================================================
    
    const canvas = getCanvasElement();
    if (!canvas) {
      sharedState.error = 'Canvas non disponible';
      console.error('[useGraph] Canvas element not available');
      return;
    }

    // Vérifier que le canvas a des dimensions bitmap valides
    // (ces dimensions sont définies par DCanvas avant d'émettre 'ready')
    if (canvas.width <= 0 || canvas.height <= 0) {
      sharedState.error = 'Canvas n\'a pas de dimensions valides';
      console.error('[useGraph] Canvas has invalid dimensions:', canvas.width, 'x', canvas.height);
      return;
    }

    console.log('[useGraph] Canvas dimensions:', canvas.width, 'x', canvas.height);

    // Vérifier que les données sont disponibles
    if (!chronicle.sharedState.currentChronicle) {
      sharedState.error = 'Aucune observation chargée';
      return;
    }

    if (!chronicle.sharedState.currentProtocol || chronicle.sharedState.currentProtocol.length === 0) {
      sharedState.error = 'Aucun protocole défini';
      return;
    }

    if (chronicle.sharedState.currentReadings.length === 0) {
      sharedState.error = 'Aucune donnée à afficher';
      return;
    }

    // =========================================================================
    // INITIALISATION PIXIJS
    // ⚠️ loading=true va afficher un overlay dans Index.vue (pas détruire DCanvas)
    // =========================================================================
    
    sharedState.loading = true;
    sharedState.error = null;

    try {
      // Créer et initialiser l'application PixiJS
      pixiAppInstance = new PixiApp();
      await pixiAppInstance.init({ view: canvas });

      // Check if component was unmounted during async init
      if (destroyed) {
        pixiAppInstance?.destroy();
        pixiAppInstance = null;
        return;
      }

      // Dessiner le graphique avec les données actuelles
      drawGraph();

      sharedState.ready = true;
      console.log('[useGraph] Graph initialized successfully');
    } catch (error) {
      console.error('[useGraph] Failed to initialize graph:', error);
      sharedState.error = error instanceof Error 
        ? error.message 
        : 'Erreur lors de l\'initialisation du graphique';
      destroyGraph();
    } finally {
      // ⚠️ Important : loading=false va masquer l'overlay, révélant le graphique
      sharedState.loading = false;
    }
  }

  // Zoom controls
  function zoomIn(): void {
    if (!pixiAppInstance) return;
    pixiAppInstance.zoomIn();
    sharedState.zoomLevel = pixiAppInstance.getZoomLevel();
  }

  function zoomOut(): void {
    if (!pixiAppInstance) return;
    pixiAppInstance.zoomOut();
    sharedState.zoomLevel = pixiAppInstance.getZoomLevel();
  }

  function resetView(): void {
    if (!pixiAppInstance) return;
    pixiAppInstance.resetView();
    sharedState.zoomLevel = pixiAppInstance.getZoomLevel();
  }

  // =========================================================================
  // Lifecycle - Index.vue calls initGraph when DCanvas is ready
  // =========================================================================

  // Watch for data becoming unavailable to destroy graph
  watch(
    hasData,
    (hasDataValue) => {
      if (!hasDataValue && sharedState.ready) {
        destroyGraph();
      }
    },
    { immediate: false }
  );

  // Watch for readings changes to redraw
  watch(
    () => chronicle.sharedState.currentReadings,
    (newReadings, oldReadings) => {
      if (sharedState.ready && pixiAppInstance) {
        const hasChanged = 
          newReadings.length !== oldReadings?.length ||
          newReadings.some((r, i) => {
            const old = oldReadings?.[i];
            return !old || 
              r.id !== old.id || 
              r.date !== old.date ||
              r.name !== old.name ||
              r.description !== old.description ||
              r.type !== old.type;
          });
        
        if (hasChanged) {
          drawGraph();
        }
      }
    },
    { deep: true }
  );

  // Watch for protocol changes to redraw
  watch(
    () => chronicle.sharedState.currentProtocol,
    () => {
      if (sharedState.ready && pixiAppInstance) {
        drawGraph();
      }
    },
    { deep: true }
  );

  // Cleanup on unmount
  onUnmounted(() => {
    destroyGraph();
  });

  return {
    sharedState,
    hasData,
    methods: {
      initGraph,
      drawGraph,
      destroyGraph,
      zoomIn,
      zoomOut,
      resetView,
    },
  };
}
