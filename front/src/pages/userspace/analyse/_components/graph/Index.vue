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
          <q-tooltip>{{ $t('graphUi.tooltipZoomIn') }}</q-tooltip>
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
          <q-tooltip>{{ $t('graphUi.tooltipZoomOut') }}</q-tooltip>
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
          <q-tooltip>{{ $t('graphUi.tooltipResetView') }}</q-tooltip>
        </q-btn>
        <q-separator v-if="showSeparatorBeforeReset" vertical />
        <q-select
          dense
          outlined
          emit-value
          map-options
          options-dense
          :model-value="timeDisplayFormat"
          :options="timeFormatOptions"
          :label="$t('graphUi.timeFormatLabel')"
          style="min-width: 190px"
          @update:model-value="methods.setTimeDisplayFormat"
        >
          <template #prepend>
            <q-icon name="mdi-clock-outline" size="xs" />
          </template>
        </q-select>
        <q-separator v-if="showSeparatorBeforeReset" vertical />
        <q-btn
          flat
          dense
          no-caps
          color="grey-8"
          icon="mdi-download"
          :label="$t('graphUi.exportMenuLabel')"
        >
          <q-menu anchor="bottom right" self="top right" :offset="[0, 8]">
            <div class="q-pa-md" style="min-width: 280px">
              <div class="text-weight-medium q-mb-sm">{{ $t('graphUi.exportSectionContent') }}</div>
              <q-option-group
                v-model="exportSelection.content"
                type="radio"
                color="primary"
                dense
                :options="[
                  { label: $t('graphUi.exportContentGraph'), value: 'graph' },
                  { label: $t('graphUi.exportContentLegend'), value: 'legend' },
                  { label: $t('graphUi.exportContentCombined'), value: 'combined' },
                ]"
                class="q-mb-md"
              />
              <div class="text-weight-medium q-mb-sm">{{ $t('graphUi.exportSectionFormat') }}</div>
              <div class="row q-gutter-sm q-mb-md">
                <q-btn
                  v-for="opt in exportFormatOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :color="exportSelection.format === opt.value ? 'primary' : 'grey-3'"
                  :text-color="exportSelection.format === opt.value ? 'white' : 'grey-9'"
                  no-caps
                  unelevated
                  class="col"
                  @click="exportSelection.format = opt.value"
                />
              </div>
              <q-btn
                color="primary"
                no-caps
                unelevated
                icon="mdi-download"
                :label="$t('graphUi.exportAction')"
                class="full-width"
                v-close-popup
                @click="methods.runExport"
              />
            </div>
          </q-menu>
        </q-btn>
      </div>
    </div>

    <q-banner
      v-if="hasReadingsAfterLastStop"
      dense
      rounded
      class="graph-scope-warning q-mx-sm q-mb-xs"
      inline-actions
    >
      <template #avatar>
        <q-icon name="warning" color="warning" />
      </template>
      {{ $t('graphUi.readingsAfterLastStopWarning') }}
    </q-banner>

    <!-- 
      Composant canvas personnalisé qui sera utilisé par PixiJS pour le rendu.
      Le canvas est référencé pour être passé à PixiApp lors de l'initialisation.
    -->
    <div class="canvas-container relative-position">
      <d-canvas class="fit" ref="canvasRef" @resize="graph.onCanvasResize" />
      <StudentWatermark />

      <!--
        Overlay de chargement SUPERPOSÉ au canvas (ne le détruit pas).
        Masque le buffer GPU non initialisé (zone noire) tant que PixiJS
        n'a pas terminé son init() + premier rendu.
      -->
      <div
        v-if="graph.sharedState.loading"
        class="graph-loading-overlay column items-center justify-center"
      >
        <q-spinner-dots color="primary" size="50px" />
        <div class="text-body2 text-grey-7 q-mt-md">
          {{ $t('graphUi.loading') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive, watch, computed, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useGraph } from './use-graph';
import { useGraphCustomization } from '../graph-customization-drawer/use-graph-customization';
import { useObservation } from 'src/composables/use-observation';
import { useI18n } from 'vue-i18n';
import { DEFAULT_GRAPH_COLOR, TimeDisplayFormatEnum } from '@actograph/graph';
import { hasReadingsAfterLastStop as detectReadingsAfterLastStop } from '@actograph/core';
import {
  getObservableGraphPreferences,
  resolveGraphColor,
} from '@services/observations/protocol-graph-preferences.utils';
import StudentWatermark from '@components/student-watermark/Index.vue';

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
  components: {
    StudentWatermark,
  },
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
    const { t, locale } = useI18n();

    // Référence au canvas HTML qui sera utilisé par PixiJS pour le rendu WebGL
    const canvasRef = ref<HTMLCanvasElement | null>(null);

    const state = reactive({
      zoomLevel: 1,
    });

    // Sélection courante du panneau d'export : contenu × format, indépendants.
    type ExportFormat = 'png' | 'jpeg';
    type ExportContent = 'graph' | 'legend' | 'combined';

    const exportSelection = reactive<{
      content: ExportContent;
      format: ExportFormat;
    }>({
      content: 'graph',
      format: 'png',
    });

    const exportFormatOptions: Array<{ label: string; value: ExportFormat }> = [
      { label: 'PNG', value: 'png' },
      { label: 'JPEG', value: 'jpeg' },
    ];

    // Format d'affichage du temps sur l'axe X / le survol du graphe.
    // Réglage de session (non persisté), voir spec-pr-format-temps-graphe.md.
    const timeDisplayFormat = ref<TimeDisplayFormatEnum>(TimeDisplayFormatEnum.Auto);

    const timeFormatOptions = computed(() => {
      void locale.value;
      return [
        { label: t('graphUi.timeFormatAuto'), value: TimeDisplayFormatEnum.Auto },
        { label: t('graphUi.timeFormatFull'), value: TimeDisplayFormatEnum.Full },
        { label: t('graphUi.timeFormatDateOnly'), value: TimeDisplayFormatEnum.DateOnly },
        { label: t('graphUi.timeFormatHourMinute'), value: TimeDisplayFormatEnum.HourMinute },
        {
          label: t('graphUi.timeFormatHourMinuteSecond'),
          value: TimeDisplayFormatEnum.HourMinuteSecond,
        },
        { label: t('graphUi.timeFormatMinuteSecond'), value: TimeDisplayFormatEnum.MinuteSecond },
        {
          label: t('graphUi.timeFormatMinuteSecondMs'),
          value: TimeDisplayFormatEnum.MinuteSecondMs,
        },
      ];
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
      resetView: async () => {
        if (graph.sharedState.pixiApp) {
          await graph.sharedState.pixiApp.resetView();
          state.zoomLevel = graph.sharedState.pixiApp.getZoomLevel();
        }
      },
      setTimeDisplayFormat: (format: TimeDisplayFormatEnum) => {
        timeDisplayFormat.value = format;
        graph.setTimeDisplayFormat(format);
      },
      // Construit le canvas de légende (noms de catégories/observables + pastilles
      // de couleur). Partagé par tous les exports impliquant la légende (légende
      // seule ou combinée graphe + légende), pour garantir un contenu identique.
      buildLegendCanvas: (): HTMLCanvasElement | null => {
        const protocol = observation.protocol.sharedState.currentProtocol as any;
        const items = protocol?._items || [];
        if (!Array.isArray(items) || items.length === 0) {
          $q.notify({
            type: 'warning',
            message: t('graphUi.noLegendToExport'),
          });
          return null;
        }

        const rows: Array<{ label: string; color: string; isCategory?: boolean }> = [];
        for (const category of items) {
          if (String(category?.type ?? '').toLowerCase() !== 'category') continue;
          const categoryColor = category?.graphPreferences?.color || DEFAULT_GRAPH_COLOR;
          rows.push({
            // Le nom de la catégorie est une donnée utilisateur, pas un texte à
            // traduire : on l'affiche directement plutôt que de passer par la clé
            // i18n legendCategoryPrefix ('{name}'), qui ne s'interpolait jamais et
            // affichait donc littéralement "{name}" dans la légende exportée.
            label: category.name,
            color: categoryColor,
            isCategory: true,
          });
          for (const observable of category.children || []) {
            if (String(observable?.type ?? '').toLowerCase() !== 'observable') continue;
            rows.push({
              label: `  ${observable.name}`,
              color: resolveGraphColor(
                getObservableGraphPreferences(observable.id, protocol),
                categoryColor,
              ),
            });
          }
        }

        if (rows.length === 0) {
          $q.notify({
            type: 'warning',
            message: t('graphUi.noLegendToExport'),
          });
          return null;
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
            message: t('graphUi.legendImageFailed'),
          });
          return null;
        }

        // Fond blanc opaque : indispensable pour le JPEG (pas de transparence),
        // et cohérent avec le rendu PNG existant.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = '#d1d5db';
        ctx.strokeRect(0, 0, width, height);
        ctx.font = '14px Arial';
        ctx.fillStyle = '#111827';

        rows.forEach((row, index) => {
          const y = padding + index * rowHeight;
          if (row.isCategory) {
            ctx.font = 'bold 14px Arial';
            ctx.fillStyle = '#111827';
            ctx.fillText(row.label, padding, y + 18);
            ctx.font = '14px Arial';
          } else {
            ctx.fillStyle = row.color;
            ctx.fillRect(padding + 8, y + 6, swatch, swatch);
            ctx.strokeStyle = '#111827';
            ctx.strokeRect(padding + 8, y + 6, swatch, swatch);
            ctx.fillStyle = '#111827';
            ctx.fillText(row.label, padding + 8 + swatch + 12, y + 18);
          }
        });

        return legendCanvas;
      },
      // Construit un canvas combinant le graphe (à gauche) et la légende (à
      // droite). Le graphe est capturé en PNG (sans pertes) comme source quel
      // que soit le format final, pour éviter d'empiler les artefacts JPEG.
      buildCombinedCanvas: async (): Promise<HTMLCanvasElement | null> => {
        if (!graph.sharedState.pixiApp) {
          $q.notify({ type: 'warning', message: t('graphUi.exportNotReady') });
          return null;
        }
        const graphDataUrl = await graph.sharedState.pixiApp.exportAsImage('png');
        if (!graphDataUrl) {
          $q.notify({ type: 'warning', message: t('graphUi.exportNotReady') });
          return null;
        }
        const legendCanvas = methods.buildLegendCanvas();
        if (!legendCanvas) return null;

        const graphImg = await new Promise<HTMLImageElement | null>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = graphDataUrl;
        });
        if (!graphImg) {
          $q.notify({ type: 'negative', message: t('graphUi.legendImageFailed') });
          return null;
        }

        const padding = 16;
        const gap = 24;
        const graphW = graphImg.naturalWidth;
        const graphH = graphImg.naturalHeight;
        const legendW = legendCanvas.width;
        const legendH = legendCanvas.height;
        const width = padding * 2 + graphW + gap + legendW;
        const height = padding * 2 + Math.max(graphH, legendH);

        const combined = document.createElement('canvas');
        combined.width = width;
        combined.height = height;
        const ctx = combined.getContext('2d');
        if (!ctx) {
          $q.notify({ type: 'negative', message: t('graphUi.legendImageFailed') });
          return null;
        }

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        // Graphe à gauche, légende à droite (alignée en haut).
        ctx.drawImage(graphImg, padding, padding);
        ctx.drawImage(legendCanvas, padding + graphW + gap, padding);
        return combined;
      },
      // Export unique piloté par les sélecteurs du panneau : contenu (graphe /
      // légende / combiné) × format (PNG / JPEG).
      runExport: async () => {
        const content = exportSelection.content;
        const format = exportSelection.format;
        const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png';

        let dataUrl: string | null = null;
        if (content === 'graph') {
          if (!graph.sharedState.pixiApp) {
            $q.notify({ type: 'warning', message: t('graphUi.exportNotReady') });
            return;
          }
          dataUrl = await graph.sharedState.pixiApp.exportAsImage(format, 0.92);
          if (!dataUrl) {
            $q.notify({ type: 'warning', message: t('graphUi.exportNotReady') });
            return;
          }
        } else if (content === 'legend') {
          const canvas = methods.buildLegendCanvas();
          if (!canvas) return;
          dataUrl = canvas.toDataURL(mimeType, 0.92);
        } else {
          const canvas = await methods.buildCombinedCanvas();
          if (!canvas) return;
          dataUrl = canvas.toDataURL(mimeType, 0.92);
        }

        await methods.saveImageFile(dataUrl, format, content);
      },
      saveImageFile: async (dataUrl: string, format: 'png' | 'jpeg', kind: 'graph' | 'legend' | 'combined') => {
        const observationName =
          observation.sharedState.currentObservation?.name || 'graph';
        const safeName = (observationName.replace(/[<>:"/\\|?*]/g, '-').trim() || 'graph').slice(0, 100);
        const ext = format === 'jpeg' ? 'jpg' : 'png';
        const kindSuffix = kind === 'combined' ? 'graph-legend' : kind;
        const link = document.createElement('a');
        link.download = `${safeName}-${kindSuffix}.${ext}`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        const whatLabel =
          kind === 'graph' ? t('graphUi.exportContentGraph')
          : kind === 'legend' ? t('graphUi.exportContentLegend')
          : t('graphUi.exportContentCombined');
        $q.notify({
          type: 'positive',
          message: t('graphUi.exportedFormat', { what: whatLabel, format: format.toUpperCase() }),
          timeout: 3000,
        });
      },
    };

    const onZoom = (newScale: number) => {
      state.zoomLevel = newScale;
    };

    // Watch for zoom changes from mouse wheel or buttons via PixiApp events
    watch(
      () => graph.sharedState.pixiApp,
      (pixiApp, oldPixiApp) => {
        if (oldPixiApp) {
          oldPixiApp.events.off('zoom', onZoom);
        }
        if (pixiApp) {
          pixiApp.events.on('zoom', onZoom);
          state.zoomLevel = pixiApp.getZoomLevel();
        }
      },
      { immediate: true }
    );

    // Cleanup on unmount
    onUnmounted(() => {
      if (graph.sharedState.pixiApp) {
        graph.sharedState.pixiApp.events.off('zoom', onZoom);
      }
    });

    // Computed property pour déterminer si le séparateur avant le reset est nécessaire
    const showSeparatorBeforeReset = computed(() => {
      // Le séparateur est nécessaire seulement s'il y a des boutons de zoom avant le reset
      return true; // Toujours vrai car il y a toujours les boutons zoom in/out avant
    });

    const hasReadingsAfterLastStop = computed(() => {
      const readings = observation.readings?.sharedState?.currentReadings ?? [];
      const normalized = readings.map((reading) => ({
        ...reading,
        dateTime:
          reading.dateTime instanceof Date ? reading.dateTime : new Date(reading.dateTime),
      }));
      return detectReadingsAfterLastStop(normalized);
    });

    return {
      graph,
      canvasRef,
      state,
      exportSelection,
      exportFormatOptions,
      timeDisplayFormat,
      timeFormatOptions,
      methods,
      customization,
      props,
      showSeparatorBeforeReset,
      hasReadingsAfterLastStop,
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

.graph-scope-warning {
  flex-shrink: 0;
  background-color: #fff8e1;
}

.canvas-container {
  flex: 1;
  min-height: 0;
  /* overflow: hidden : le canvas ne grossit plus (rendu Pixi contraint à sa
     boîte CSS), on clippe au lieu de scroller. Le mélange précédent
     `fit` (height: 100% !important) + `flex: 1` + `overflow: auto` rendait la
     hauteur fragile lors des relayouts du splitter (bug A3 : zone blanche +
     scrollbar immense). `fit` a été retiré de la classe ; on s'appuie
     uniquement sur `flex: 1; min-height: 0` pour remplir la hauteur restante
     sous le header. */
  overflow: hidden;
  /* Fond blanc pour éviter le flash noir du buffer GPU avant le premier rendu PixiJS */
  background-color: #ffffff;
}

.graph-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  background-color: rgba(255, 255, 255, 0.95);
}

.zoom-controls {
  background-color: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  padding: 4px;
  
  :deep(.q-separator--vertical) {
    height: 24px;
    margin: 0 4px;
    align-self: center;
  }
}
</style>
