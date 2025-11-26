<template>
  <!-- 
    Conteneur principal du graphique d'activité.
    Utilise la classe "fit" pour occuper tout l'espace disponible.
  -->
  <div class="fit column">
    <!-- Contrôles de zoom -->
    <div class="row items-center q-pa-sm q-gutter-sm" style="position: absolute; top: 0; right: 0; z-index: 10;">
      <q-btn
        flat
        round
        dense
        icon="add"
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
        @click="methods.zoomOut"
        :disable="state.zoomLevel <= 0.1"
      >
        <q-tooltip>Zoom arrière</q-tooltip>
      </q-btn>
      <q-btn
        flat
        round
        dense
        icon="refresh"
        @click="methods.resetView"
      >
        <q-tooltip>Réinitialiser la vue</q-tooltip>
      </q-btn>
      <q-separator vertical />
      <div class="text-caption text-grey-7">
        {{ Math.round(state.zoomLevel * 100) }}%
      </div>
    </div>

    <!-- 
      Composant canvas personnalisé qui sera utilisé par PixiJS pour le rendu.
      Le canvas est référencé pour être passé à PixiApp lors de l'initialisation.
    -->
    <d-canvas class="fit" ref="canvasRef" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch } from 'vue';
import { useGraph } from './use-graph';

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
  setup() {
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

    const methods = {
      zoomIn: () => {
        if (graph.sharedState.pixiApp) {
          graph.sharedState.pixiApp.zoomIn();
          state.zoomLevel = graph.sharedState.pixiApp.getZoomLevel();
        }
      },
      zoomOut: () => {
        if (graph.sharedState.pixiApp) {
          graph.sharedState.pixiApp.zoomOut();
          state.zoomLevel = graph.sharedState.pixiApp.getZoomLevel();
        }
      },
      resetView: () => {
        if (graph.sharedState.pixiApp) {
          graph.sharedState.pixiApp.resetView();
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

    return {
      graph,
      canvasRef,
      state,
      methods,
    };
  },
});
</script>