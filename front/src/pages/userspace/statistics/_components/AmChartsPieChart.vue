<template>
  <div ref="chartContainer" :style="{ width: '100%', height: height + 'px' }"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, PropType } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppResume, onChartsRefresh } from 'src/composables/use-app-resume';
import { isElementVisible } from 'src/utils/dom.utils';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

export default defineComponent({
  name: 'AmChartsPieChart',
  props: {
    data: {
      type: Array as PropType<Array<{ label: string; value: number }>>,
      required: true,
    },
    colors: {
      type: Array as PropType<string[]>,
      required: true,
    },
    height: {
      type: Number,
      default: 400,
    },
  },
  setup(props) {
    const { locale } = useI18n();
    const chartContainer = ref<HTMLElement | null>(null);
    let root: am5.Root | null = null;
    let chart: am5percent.PieChart | null = null;

    const emptySlice = () => ({ label: '', value: 1 });

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
        am5percent.PieChart.new(root, {
          layout: root.verticalLayout,
        })
      );

      // Create series
      const series = chart.series.push(
        am5percent.PieSeries.new(root, {
          valueField: 'value',
          categoryField: 'label',
        })
      );

      // Configure colors
      const colorSet = am5.ColorSet.new(root, {
        colors: props.colors.map((color) => am5.color(color)),
      });
      series.set('colors', colorSet);

      // Set data
      if (props.data && props.data.length > 0 && props.data.some((d) => d.value > 0)) {
        series.data.setAll(props.data);
      } else {
        series.data.setAll([emptySlice()]);
      }

      // Add labels
      series.labels.template.setAll({
        text: '{category}: {valuePercentTotal.formatNumber(\'#.0\')}%',
        fontSize: 12,
      });

      // Match legend value format to slice label format (1 decimal)
      series.set('legendValueText', '{valuePercentTotal.formatNumber(\'#.0\')}%');

      // Add tooltip
      series.slices.template.setAll({
        tooltipText: '{category}: {valuePercentTotal.formatNumber(\'#.0\')}% ({value})',
        stroke: am5.color('#fff'),
        strokeWidth: 2,
      });

      // Add legend
      const legend = chart.children.push(
        am5.Legend.new(root, {
          centerX: am5.percent(50),
          x: am5.percent(50),
          marginTop: 15,
          marginBottom: 15,
        })
      );

      legend.data.setAll(series.dataItems);
    };

    const updateChart = () => {
      if (!chart || !root) {
        createChart();
        return;
      }

      const series = chart.series.getIndex(0) as am5percent.PieSeries | undefined;
      if (series) {
        if (props.data && props.data.length > 0 && props.data.some((d) => d.value > 0)) {
          series.data.setAll(props.data);
        } else {
          series.data.setAll([emptySlice()]);
        }

        // Update legend
        const legend = chart.children.getIndex(0) as am5.Legend | undefined;
        if (legend) {
          legend.data.setAll(series.dataItems);
        }
      }
    };

    const refreshChartIfVisible = () => {
      if (!isElementVisible(chartContainer.value)) {
        return;
      }
      createChart();
    };

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
          const series = chart.series.getIndex(0) as am5percent.PieSeries | undefined;
          if (series) {
            const colorSet = am5.ColorSet.new(root, {
              colors: props.colors.map((color) => am5.color(color)),
            });
            series.set('colors', colorSet);
          }
        }
      },
      { deep: true }
    );

    watch(locale, () => {
      updateChart();
    });

    return {
      chartContainer,
    };
  },
});
</script>

