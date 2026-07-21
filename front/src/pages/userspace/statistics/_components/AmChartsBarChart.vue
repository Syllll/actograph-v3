<template>
  <div class="relative-position" :style="{ width: '100%', height: height + 'px' }">
    <div ref="chartContainer" class="fit"></div>
    <q-btn
      flat
      round
      dense
      color="grey-8"
      icon="mdi-download"
      class="absolute chart-export-btn"
    >
      <q-tooltip>{{ t('graphUi.exportMenuLabel') }}</q-tooltip>
      <q-menu anchor="bottom right" self="top right" :offset="[0, 8]">
        <div class="q-pa-md" style="min-width: 220px">
          <div class="text-weight-medium q-mb-sm">{{ t('graphUi.exportSectionFormat') }}</div>
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
            :label="t('graphUi.exportAction')"
            class="full-width"
            v-close-popup
            @click="runExport"
          />
        </div>
      </q-menu>
    </q-btn>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppResume, onChartsRefresh } from 'src/composables/use-app-resume';
import { useChartImageExport } from 'src/composables/use-chart-image-export';
import { isElementVisible } from 'src/utils/dom.utils';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import * as am5exporting from '@amcharts/amcharts5/plugins/exporting';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

export default defineComponent({
  name: 'AmChartsBarChart',
  props: {
    data: {
      type: Array as PropType<Array<{
        label: string;
        value: number;
        formattedValue?: string;
        /** Per-bar color; falls back to `colors` when absent. */
        color?: string;
      }>>,
      required: true,
    },
    /** Fallback fill used for bars that don't carry their own `color`. */
    colors: {
      type: String,
      default: '#1976D2',
    },
    height: {
      type: Number,
      default: 400,
    },
    /** When true, Y-axis ticks use whole numbers only (occurrence counts). */
    integerAxis: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const { t, locale } = useI18n();
    const chartContainer = ref<HTMLElement | null>(null);
    let root: am5.Root | null = null;
    let chart: am5xy.XYChart | null = null;
    let exporting: am5exporting.Exporting | null = null;

    const emptyRow = () => ({ label: '', value: 0 });

    const createChart = () => {
      if (!chartContainer.value) {
        return;
      }

      // Dispose existing chart if any
      if (root) {
        root.dispose();
      }

      // Create root element
      root = am5.Root.new(chartContainer.value);

      // Set theme
      root.setThemes([am5themes_Animated.new(root)]);

      // Create chart
      chart = root.container.children.push(
        am5xy.XYChart.new(root, {
          panX: false,
          panY: false,
          wheelX: 'none',
          wheelY: 'none',
          layout: root.verticalLayout,
        })
      );

      /**
       * CONFIGURATION DES AXES POUR BARRES VERTICALES
       * ===============================================
       * 
       * L'histogramme a été modifié pour afficher des barres verticales au lieu d'horizontales :
       * 
       * - X axis (horizontal) : CategoryAxis avec les labels des observables
       * - Y axis (vertical) : ValueAxis avec les valeurs (nombre d'occurrences)
       * 
       * Cette orientation verticale est plus intuitive pour visualiser les occurrences
       * et correspond mieux aux conventions d'affichage des histogrammes.
       * 
       * Configuration de la série :
       * - valueYField: 'value' → valeurs sur l'axe Y (vertical)
       * - categoryXField: 'label' → catégories sur l'axe X (horizontal)
       */
      
      // Create X axis (categories) - pour barres verticales
      const xAxis = chart.xAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: 'label',
          renderer: am5xy.AxisRendererX.new(root, {
            cellStartLocation: 0.1,
            cellEndLocation: 0.9,
            // Petite distance minimale car les labels sont inclinés (moins
            // d'emprise horizontale) : la valeur par défaut (50) forçait
            // amCharts à faire chevaucher/masquer des labels de catégories
            // dès qu'il y en avait plus de 5-6 sur des largeurs de carte
            // courantes.
            minGridDistance: 10,
          }),
        })
      );

      // Labels obliques : évite le chevauchement entre noms de catégories
      // longs (ex. "Hangar Autres" / "Alcôves") qui, à l'horizontale,
      // finissaient superposés et illisibles sur des largeurs de carte
      // courantes.
      xAxis.get('renderer').labels.template.setAll({
        rotation: -45,
        centerY: am5.p50,
        centerX: am5.p100,
        paddingRight: 15,
      });

      // Create Y axis (values) - pour barres verticales
      const yAxis = chart.yAxes.push(
        am5xy.ValueAxis.new(root, {
          ...(props.integerAxis ? { maxPrecision: 0 } : {}),
          renderer: am5xy.AxisRendererY.new(root, {}),
        })
      );

      // Create series
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          name: t('statisticsUi.chartSeriesOccurrences'),
          xAxis: xAxis,
          yAxis: yAxis,
          valueYField: 'value',
          categoryXField: 'label',
          fill: am5.color(props.colors),
          stroke: am5.color(props.colors),
        })
      );

      // Set data
      if (props.data && props.data.length > 0 && props.data.some((d) => d.value > 0)) {
        xAxis.data.setAll(props.data);
        series.data.setAll(props.data);
      } else {
        const row = emptyRow();
        xAxis.data.setAll([row]);
        series.data.setAll([row]);
      }

      // Configure tooltip with adapter for formattedValue
      series.columns.template.adapters.add('tooltipText', (text, target) => {
        const dataItem = target.dataItem;
        if (dataItem && dataItem.dataContext) {
          const context = dataItem.dataContext as any;
          if (context.formattedValue) {
            return `${context.label}: ${context.formattedValue}`;
          }
          // Fallback to value if no formattedValue
          return `${context.label}: ${context.value}`;
        }
        return text;
      });

      // Each bar takes the color of its own observable (matching the pie
      // chart/legend) when the data row carries one; otherwise fall back
      // to the single `colors` prop.
      series.columns.template.adapters.add('fill', (fill, target) => {
        const context = target.dataItem?.dataContext as any;
        return context?.color ? am5.color(context.color) : fill;
      });
      series.columns.template.adapters.add('stroke', (stroke, target) => {
        const context = target.dataItem?.dataContext as any;
        return context?.color ? am5.color(context.color) : stroke;
      });

      /**
       * CONFIGURATION DES BARRES VERTICALES
       * ====================================
       *
       * - cornerRadiusTL et cornerRadiusBL : coins arrondis en haut (top-left et bottom-left)
       *   car les barres partent du bas et montent vers le haut
       *
       * La valeur de chaque barre n'est affichée qu'au survol (tooltip),
       * pas en permanence au-dessus de la colonne.
       */

      // Configure columns appearance
      series.columns.template.setAll({
        tooltipY: 0,
        strokeOpacity: 0,
        cornerRadiusTL: 4,
        cornerRadiusBL: 4,
      });

      exporting = am5exporting.Exporting.new(root, {
        filePrefix: 'graphique-statistiques',
      });
    };

    const updateChart = () => {
      if (!chart || !root) {
        createChart();
        return;
      }

      const xAxis = chart.xAxes.getIndex(0) as am5xy.CategoryAxis<am5xy.AxisRendererX> | undefined;
      const series = chart.series.getIndex(0) as am5xy.ColumnSeries | undefined;

      if (xAxis && series) {
        if (props.data && props.data.length > 0 && props.data.some((d) => d.value > 0)) {
          xAxis.data.setAll(props.data);
          series.data.setAll(props.data);
        } else {
          const row = emptyRow();
          xAxis.data.setAll([row]);
          series.data.setAll([row]);
        }
      }
    };

    const refreshChartIfVisible = () => {
      if (!isElementVisible(chartContainer.value)) {
        return;
      }
      createChart();
    };

    const { exportSelection, exportFormatOptions, runExport } = useChartImageExport(
      () => exporting,
    );

    let unsubscribeChartsRefresh: (() => void) | null = null;

    onMounted(() => {
      createChart();
      unsubscribeChartsRefresh = onChartsRefresh(refreshChartIfVisible);
    });

    useAppResume(refreshChartIfVisible);

    onUnmounted(() => {
      unsubscribeChartsRefresh?.();
      if (root) {
        root.dispose();
        root = null;
        chart = null;
        exporting = null;
      }
    });

    watch(
      () => props.data,
      () => {
        updateChart();
      },
      { deep: true }
    );

    watch(
      () => props.colors,
      () => {
        if (chart && root) {
          const series = chart.series.getIndex(0) as am5xy.ColumnSeries | undefined;
          if (series) {
            series.setAll({
              fill: am5.color(props.colors),
              stroke: am5.color(props.colors),
            });
          }
        }
      }
    );

    watch(
      () => props.integerAxis,
      () => {
        createChart();
      },
    );

    watch(locale, () => {
      updateChart();
    });

    return {
      t,
      chartContainer,
      exportSelection,
      exportFormatOptions,
      runExport,
    };
  },
});
</script>

<style scoped lang="scss">
.chart-export-btn {
  top: 0;
  right: 0;
  z-index: 5;
}
</style>

