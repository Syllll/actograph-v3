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
        <q-separator v-if="showSeparatorBeforeReset" vertical />
        <q-btn
          flat
          round
          dense
          icon="mdi-image-outline"
          color="grey-8"
          @click="methods.exportAsPng"
        >
          <q-tooltip>Exporter en PNG</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          icon="mdi-file-jpg-box"
          color="grey-8"
          @click="methods.exportAsJpeg"
        >
          <q-tooltip>Exporter en JPEG</q-tooltip>
        </q-btn>
        <q-btn
          flat
          round
          dense
          icon="mdi-format-list-bulleted-square"
          color="grey-8"
          @click="methods.exportLegendAsPng"
        >
          <q-tooltip>Exporter la légende (PNG)</q-tooltip>
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
import { defineComponent, ref, reactive, watch, computed, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useGraph } from './use-graph';
import { useGraphCustomization } from '../graph-customization-drawer/use-graph-customization';
import { useObservation } from 'src/composables/use-observation';

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
    const $q = useQuasar();

    // Référence au canvas HTML qui sera utilisé par PixiJS pour le rendu WebGL
    const canvasRef = ref<HTMLCanvasElement | null>(null);

    const state = reactive({
      zoomLevel: 1,
    });

    // Composable pour accéder au nom de l'observation courante (pour le nom du fichier exporté)
    const observation = useObservation();

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
      exportAsPng: async () => {
        if (!graph.sharedState.pixiApp) return;
        const dataUrl = graph.sharedState.pixiApp.exportAsImage('png');
        if (!dataUrl) {
          $q.notify({ type: 'warning', message: 'Le graphique n\'est pas encore prêt pour l\'export' });
          return;
        }
        await methods.saveImageFile(dataUrl, 'png');
      },
      exportAsJpeg: async () => {
        if (!graph.sharedState.pixiApp) return;
        const dataUrl = graph.sharedState.pixiApp.exportAsImage('jpeg', 0.92);
        if (!dataUrl) {
          $q.notify({ type: 'warning', message: 'Le graphique n\'est pas encore prêt pour l\'export' });
          return;
        }
        await methods.saveImageFile(dataUrl, 'jpeg');
      },
      exportLegendAsPng: async () => {
        const protocol = observation.protocol.sharedState.currentProtocol as any;
        const items = protocol?._items || [];
        if (!Array.isArray(items) || items.length === 0) {
          $q.notify({
            type: 'warning',
            message: 'Aucune légende disponible à exporter',
          });
          return;
        }

        const rows: Array<{ label: string; color: string }> = [];
        for (const category of items) {
          if (String(category?.type ?? '').toLowerCase() !== 'category') continue;
          const categoryColor = category?.graphPreferences?.color || '#10b981';
          rows.push({ label: `[Catégorie] ${category.name}`, color: categoryColor });
          for (const observable of category.children || []) {
            if (String(observable?.type ?? '').toLowerCase() !== 'observable') continue;
            rows.push({
              label: `  - ${observable.name}`,
              color: observable?.graphPreferences?.color || categoryColor,
            });
          }
        }

        if (rows.length === 0) {
          $q.notify({
            type: 'warning',
            message: 'Aucune légende disponible à exporter',
          });
          return;
        }

        const rowHeight = 28;
        const padding = 18;
        const swatch = 14;
        const width = 900;
        const height = padding * 2 + rows.length * rowHeight;
        const legendCanvas = document.createElement('canvas');
        legendCanvas.width = width;
        legendCanvas.height = height;
        const ctx = legendCanvas.getContext('2d');
        if (!ctx) {
          $q.notify({
            type: 'negative',
            message: 'Impossible de générer l’image de légende',
          });
          return;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#d1d5db';
        ctx.strokeRect(0, 0, width, height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#111827';

        rows.forEach((row, index) => {
          const y = padding + index * rowHeight;
          ctx.fillStyle = row.color;
          ctx.fillRect(padding, y + 6, swatch, swatch);
          ctx.strokeStyle = '#111827';
          ctx.strokeRect(padding, y + 6, swatch, swatch);
          ctx.fillStyle = '#111827';
          ctx.fillText(row.label, padding + swatch + 12, y + 18);
        });

        const dataUrl = legendCanvas.toDataURL('image/png');
        await methods.saveImageFile(dataUrl, 'png');
      },
      saveImageFile: async (dataUrl: string, format: 'png' | 'jpeg') => {
        const observationName =
          observation.sharedState.currentObservation?.name || 'graph';
        const safeName = (observationName.replace(/[<>:"/\\|?*]/g, '-').trim() || 'graph').slice(0, 100);
        const ext = format === 'jpeg' ? 'jpg' : 'png';
        const link = document.createElement('a');
        link.download = `${safeName}-graph.${ext}`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        $q.notify({
          type: 'positive',
          message: `Graphe exporté en ${format.toUpperCase()}`,
          timeout: 3000,
        });
      },
    };

    let zoomInterval: ReturnType<typeof setInterval> | null = null;

    // Watch for zoom changes from mouse wheel
    watch(
      () => graph.sharedState.pixiApp,
      (pixiApp) => {
        // Clear previous interval if any
        if (zoomInterval) {
          clearInterval(zoomInterval);
          zoomInterval = null;
        }
        if (pixiApp) {
          // Update zoom level periodically (could be improved with events)
          zoomInterval = setInterval(() => {
            if (pixiApp) {
              state.zoomLevel = pixiApp.getZoomLevel();
            } else if (zoomInterval) {
              clearInterval(zoomInterval);
              zoomInterval = null;
            }
          }, 100);
        }
      },
      { immediate: true }
    );

    // Cleanup on unmount
    onUnmounted(() => {
      if (zoomInterval) {
        clearInterval(zoomInterval);
        zoomInterval = null;
      }
    });

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