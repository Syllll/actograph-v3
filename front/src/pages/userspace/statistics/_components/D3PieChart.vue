<template>
  <div ref="chartContainer" :style="{ width: '100%', height: height + 'px' }"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, PropType } from 'vue';
import * as d3 from 'd3';

export default defineComponent({
  name: 'D3PieChart',
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
    const chartContainer = ref<HTMLElement | null>(null);
    let svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;

    const createChart = () => {
      if (!chartContainer.value) {
        return;
      }

      // Clear existing chart
      d3.select(chartContainer.value).selectAll('*').remove();

      // Check if we have valid data
      const hasData = props.data && props.data.length > 0 && props.data.some((d) => d.value > 0);
      if (!hasData) {
        // Show empty state
        const emptyData = [{ label: 'Aucune donnée', value: 1 }];
        drawChart(emptyData);
        return;
      }

      drawChart(props.data);
    };

    const drawChart = (data: Array<{ label: string; value: number }>) => {
      if (!chartContainer.value) {
        return;
      }

      const width = chartContainer.value.clientWidth || 600;
      const radius = Math.min(width, props.height) / 2 - 40;

      // Create SVG
      svg = d3
        .select(chartContainer.value)
        .append('svg')
        .attr('width', width)
        .attr('height', props.height);

      // Create main group for pie chart
      const g = svg
        .append('g')
        .attr('transform', `translate(${width / 2}, ${props.height / 2})`);

      // Create color scale
      const colorScale = d3.scaleOrdinal<string>().domain(data.map((d) => d.label)).range(props.colors);

      // Create pie generator
      const pie = d3
        .pie<{ label: string; value: number }>()
        .value((d) => d.value)
        .sort(null);

      // Create arc generator
      const arc = d3
        .arc<d3.PieArcDatum<{ label: string; value: number }>>()
        .innerRadius(0)
        .outerRadius(radius);

      // Generate pie data
      const pieData = pie(data);

      // Draw arcs
      const arcs = g
        .selectAll('.arc')
        .data(pieData)
        .enter()
        .append('g')
        .attr('class', 'arc');

      arcs
        .append('path')
        .attr('d', arc)
        .attr('fill', (d) => colorScale(d.data.label))
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this).transition().duration(200).attr('opacity', 0.8);
        })
        .on('mouseout', function () {
          d3.select(this).transition().duration(200).attr('opacity', 1);
        });

      // Add labels on slices
      arcs
        .append('text')
        .attr('transform', (d) => {
          const [x, y] = arc.centroid(d);
          return `translate(${x}, ${y})`;
        })
        .attr('text-anchor', 'middle')
        .attr('font-size', '12px')
        .attr('fill', '#000')
        .text((d) => {
          const percentage = ((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100;
          return `${d.data.label}: ${percentage.toFixed(1)}%`;
        });

      // Add legend
      const legend = svg
        .append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${20}, ${20})`);

      const legendItems = legend
        .selectAll('.legend-item')
        .data(pieData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);

      legendItems
        .append('rect')
        .attr('width', 12)
        .attr('height', 12)
        .attr('fill', (d) => colorScale(d.data.label));

      legendItems
        .append('text')
        .attr('x', 18)
        .attr('y', 9)
        .attr('font-size', '12px')
        .text((d) => {
          const percentage = ((d.endAngle - d.startAngle) / (2 * Math.PI)) * 100;
          return `${d.data.label}: ${percentage.toFixed(1)}%`;
        });
    };

    const updateChart = () => {
      if (!chartContainer.value) {
        createChart();
        return;
      }

      const hasData = props.data && props.data.length > 0 && props.data.some((d) => d.value > 0);
      if (!hasData) {
        d3.select(chartContainer.value).selectAll('*').remove();
        const emptyData = [{ label: 'Aucune donnée', value: 1 }];
        drawChart(emptyData);
        return;
      }

      d3.select(chartContainer.value).selectAll('*').remove();
      drawChart(props.data);
    };

    onMounted(() => {
      createChart();
    });

    onUnmounted(() => {
      if (chartContainer.value) {
        d3.select(chartContainer.value).selectAll('*').remove();
      }
      svg = null;
    });

    watch(
      () => props.data,
      () => {
        updateChart();
      },
      { deep: true },
    );

    watch(
      () => props.colors,
      () => {
        updateChart();
      },
      { deep: true },
    );

    watch(
      () => props.height,
      () => {
        updateChart();
      },
    );

    return {
      chartContainer,
    };
  },
});
</script>

