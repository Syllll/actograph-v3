<template>
  <div ref="chartContainer" :style="{ width: '100%', height: height + 'px' }"></div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted, watch, PropType } from 'vue';
import * as d3 from 'd3';

export default defineComponent({
  name: 'D3BarChart',
  props: {
    data: {
      type: Array as PropType<
        Array<{
          label: string;
          value: number;
          formattedValue?: string;
        }>
      >,
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

    const drawChart = (
      data: Array<{
        label: string;
        value: number;
        formattedValue?: string;
      }>,
    ) => {
      if (!chartContainer.value) {
        return;
      }

      const width = chartContainer.value.clientWidth || 600;
      const margin = { top: 20, right: 30, bottom: 40, left: 100 };
      const chartWidth = width - margin.left - margin.right;
      const chartHeight = props.height - margin.top - margin.bottom;

      // Create SVG
      svg = d3
        .select(chartContainer.value)
        .append('svg')
        .attr('width', width)
        .attr('height', props.height);

      const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

      // Create scales
      const yScale = d3
        .scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, chartHeight])
        .padding(0.1);

      const maxValue = d3.max(data, (d) => d.value) || 1;
      const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, chartWidth]);

      // Create axes
      const xAxis = d3.axisBottom(xScale).ticks(5);
      const yAxis = d3.axisLeft(yScale);

      // Draw axes
      g.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${chartHeight})`)
        .call(xAxis);

      g.append('g').attr('class', 'y-axis').call(yAxis);

      // Draw bars
      const bars = g
        .selectAll('.bar')
        .data(data)
        .enter()
        .append('rect')
        .attr('class', 'bar')
        .attr('x', 0)
        .attr('y', (d) => yScale(d.label) || 0)
        .attr('width', (d) => xScale(d.value))
        .attr('height', yScale.bandwidth())
        .attr('fill', props.colors)
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
        .style('cursor', 'pointer')
        .on('mouseover', function () {
          d3.select(this).transition().duration(200).attr('opacity', 0.8);
        })
        .on('mouseout', function () {
          d3.select(this).transition().duration(200).attr('opacity', 1);
        });

      // Add labels on bars
      bars
        .append('title')
        .text((d) => {
          const displayValue = d.formattedValue || String(d.value);
          return `${d.label}: ${displayValue}`;
        });

      // Add value labels inside bars
      g.selectAll('.bar-label')
        .data(data)
        .enter()
        .append('text')
        .attr('class', 'bar-label')
        .attr('x', (d) => xScale(d.value) - 5)
        .attr('y', (d) => (yScale(d.label) || 0) + yScale.bandwidth() / 2)
        .attr('dy', '0.35em')
        .attr('text-anchor', 'end')
        .attr('font-size', '12px')
        .attr('fill', '#000')
        .text((d) => {
          const displayValue = d.formattedValue || String(d.value);
          return displayValue;
        });

      // Style axes
      g.selectAll('.x-axis text, .y-axis text').attr('font-size', '12px').attr('fill', '#000');

      g.selectAll('.x-axis path, .y-axis path, .x-axis line, .y-axis line')
        .attr('stroke', '#000')
        .attr('stroke-width', 1);
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

