<template>
  <!-- 
    Conteneur principal du graphique d'activité.
    Utilise la classe "fit" pour occuper tout l'espace disponible.
  -->
  <div class="fit column">
    <!-- Header avec contrôles de zoom -->
    <div class="graph-header row items-center justify-end q-pa-sm">
      <div class="zoom-controls row items-center q-gutter-sm">
        <q-btn
          flat
          round
          dense
          icon="add"
          color="grey-8"
          @click="methods.zoomIn"
          :disable="state.zoomLevel >= 5"
        >
          <q-tooltip>Zoom avant</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          icon="remove"
          color="grey-8"
          @click="methods.zoomOut"
          :disable="state.zoomLevel <= 0.1"
        >
          <q-tooltip>Zoom arrière</q-tooltip>
        </q-btn>
        <q-separator v-if="showSeparatorBeforeReset" vertical />
        <q-btn
          flat
          round
          dense
          icon="restart_alt"
          color="grey-8"
          @click="methods.resetView"
        >
          <q-tooltip>Réinitialiser la vue</q-tooltip>
        </q-btn>
      </div>
    </div>

    <!-- 
      Composant canvas personnalisé qui sera utilisé par PixiJS pour le rendu.
      Le canvas est référencé pour être passé à PixiApp lors de l'initialisation.
    -->
    <div class="canvas-container fit">
      <d-canvas class="fit" ref="canvasRef" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch, computed } from 'vue';
import { useGraph } from './use-graph';
import { useGraphCustomization } from '../graph-customization-drawer/use-graph-customization';

/**
 * Composant principal du graphique d'activité.
 * 
 * Ce composant affiche un graphique temporel des données d'observation en utilisant PixiJS.
 * Le graphique visualise :
 * - Les observables du protocole sur l'axe Y (vertical)
 * - Le temps sur l'axe X (horizontal)
 * - Les readings comme des segments ou marqueurs sur le graphique
 * 
 * Le composant délègue toute la logique de rendu au composable use-graph qui gère
 * l'initialisation et le cycle de vie de l'application PixiJS.
 */
export default defineComponent({
  props: {
    drawerWidthPx: {
      type: Number,
      default: 0,
    },
    showDrawer: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    // Référence au canvas HTML qui sera utilisé par PixiJS pour le rendu WebGL
    const canvasRef = ref<HTMLCanvasElement | null>(null);

    const state = reactive({
      zoomLevel: 1,
    });

    // Initialisation du composable graphique qui gère toute la logique PixiJS
    // Le composable reçoit la référence au canvas pour l'initialisation
    const graph = useGraph({
      init: {
        canvasRef,
      },
    });

    // Initialisation du composable de personnalisation du graphe
    const customization = useGraphCustomization();

    const methods = {
      zoomIn: () => {
        if (graph.sharedState.pixiApp) {
          graph.sharedState.pixiApp.zoomIn();
          // Mettre à jour le zoom level immédiatement après l'action
          state.zoomLevel = graph.sharedState.pixiApp.getZoomLevel();
        }
      },
      zoomOut: () => {
        if (graph.sharedState.pixiApp) {
          graph.sharedState.pixiApp.zoomOut();
          // Mettre à jour le zoom level immédiatement après l'action
          state.zoomLevel = graph.sharedState.pixiApp.getZoomLevel();
        }
      },
      resetView: () => {
        if (graph.sharedState.pixiApp) {
          graph.sharedState.pixiApp.resetView();
          // Mettre à jour le zoom level immédiatement après l'action
          state.zoomLevel = graph.sharedState.pixiApp.getZoomLevel();
        }
      },
    };

    // Watch for zoom changes from mouse wheel
    watch(
      () => graph.sharedState.pixiApp,
      (pixiApp) => {
        if (pixiApp) {
          // Update zoom level periodically (could be improved with events)
          const interval = setInterval(() => {
            if (pixiApp) {
              state.zoomLevel = pixiApp.getZoomLevel();
            } else {
              clearInterval(interval);
            }
          }, 100);
        }
      },
      { immediate: true }
    );

    // Computed property pour déterminer si le séparateur avant le reset est nécessaire
    const showSeparatorBeforeReset = computed(() => {
      // Le séparateur est nécessaire seulement s'il y a des boutons de zoom avant le reset
      return true; // Toujours vrai car il y a toujours les boutons zoom in/out avant
    });

    return {
      graph,
      canvasRef,
      state,
      methods,
      customization,
      props,
      showSeparatorBeforeReset,
    };
  },
});
</script>

<style scoped lang="scss">
.graph-header {
  flex-shrink: 0;
  background-color: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.canvas-container {
  flex: 1;
  min-height: 0;
  /* overflow: auto pour permettre le scroll quand le graphe dépasse (bug 3.1: première catégorie invisible avec 4+ catégories) */
  overflow: auto;
}

.zoom-controls {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 4px;
  
  :deep(.q-separator--vertical) {
    height: 24px;
    margin: 0 4px;
  }
}
</style>