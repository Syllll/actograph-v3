<template>
  <div ref="chartContainer" :style="{ width: '100%', height: height + 'px' }"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, PropType } from 'vue';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

export default defineComponent({
  name: 'AmChartsBarChart',
  props: {
    data: {
      type: Array as PropType<Array<{
        label: string;
        value: number;
        formattedValue?: string;
      }>>,
      required: true,
    },
    colors: {
      type: String,
      default: '#1976D2',
    },
    height: {
      type: Number,
      default: 400,
    },
  },
  setup(props) {
    const chartContainer = ref<HTMLElement | null>(null);
    let root: am5.Root | null = null;
    let chart: am5xy.XYChart | null = null;

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

      // Create Y axis (categories)
      const yAxis = chart.yAxes.push(
        am5xy.CategoryAxis.new(root, {
          categoryField: 'label',
          renderer: am5xy.AxisRendererY.new(root, {
            cellStartLocation: 0.1,
            cellEndLocation: 0.9,
          }),
        })
      );

      // Create X axis (values)
      const xAxis = chart.xAxes.push(
        am5xy.ValueAxis.new(root, {
          renderer: am5xy.AxisRendererX.new(root, {}),
        })
      );

      // Create series
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          name: 'Duration',
          xAxis: xAxis,
          yAxis: yAxis,
          valueXField: 'value',
          categoryYField: 'label',
          fill: am5.color(props.colors),
          stroke: am5.color(props.colors),
        })
      );

      // Set data
      if (props.data && props.data.length > 0 && props.data.some((d) => d.value > 0)) {
        yAxis.data.setAll(props.data);
        series.data.setAll(props.data);
      } else {
        // Show empty state
        yAxis.data.setAll([{ label: 'Aucune donnée', value: 1 }]);
        series.data.setAll([{ label: 'Aucune donnée', value: 1 }]);
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

      // Configure columns appearance
      series.columns.template.setAll({
        tooltipY: 0,
        strokeOpacity: 0,
        cornerRadiusTL: 4,
        cornerRadiusTR: 4,
      });

      // Enable and configure labels on bars using bullets
      series.bullets.push(() => {
        const label = am5.Label.new(root, {
          text: '{formattedValue}',
          fill: am5.color('#000'),
          centerX: am5.p100,
          centerY: am5.p50,
          fontSize: 12,
          textAlign: 'right',
          paddingRight: 5,
        });

        // Configure adapter for formattedValue
        label.adapters.add('text', (text: string, target: any) => {
          const dataItem = target.dataItem;
          if (dataItem && dataItem.dataContext) {
            const context = dataItem.dataContext as any;
            if (context.formattedValue) {
              return context.formattedValue;
            }
            // Fallback to value if no formattedValue
            return String(context.value);
          }
          return text;
        });

        return am5.Bullet.new(root, {
          locationX: 1,
          sprite: label,
        });
      });
    };

    const updateChart = () => {
      if (!chart || !root) {
        createChart();
        return;
      }

      const yAxis = chart.yAxes.getIndex(0) as am5xy.CategoryAxis<am5xy.AxisRendererY> | undefined;
      const series = chart.series.getIndex(0) as am5xy.ColumnSeries | undefined;

      if (yAxis && series) {
        if (props.data && props.data.length > 0 && props.data.some((d) => d.value > 0)) {
          yAxis.data.setAll(props.data);
          series.data.setAll(props.data);
        } else {
          yAxis.data.setAll([{ label: 'Aucune donnée', value: 1 }]);
          series.data.setAll([{ label: 'Aucune donnée', value: 1 }]);
        }
      }
    };

    onMounted(() => {
      createChart();
    });

    onUnmounted(() => {
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

    return {
      chartContainer,
    };
  },
});
</script>

