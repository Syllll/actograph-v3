<template>
  <div class="activity-graph-viewer" ref="containerRef">
    <canvas ref="canvasRef" class="graph-canvas"></canvas>
    
    <!-- Empty state -->
    <div v-if="!hasData" class="empty-state">
      <q-icon name="mdi-chart-timeline-variant" size="48px" color="grey-5" />
      <div class="q-mt-sm text-grey">Aucune donnée à afficher</div>
    </div>
  </div>
</template>

<script lang="ts">
/**
 * @deprecated Currently unused in mobile app.
 * TODO: Remove if confirmed unnecessary.
 */
import { defineComponent, ref, onMounted, onUnmounted, watch, computed, PropType } from 'vue';
import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

// Types
interface IReading {
  id: number;
  type: 'START' | 'STOP' | 'PAUSE_START' | 'PAUSE_END' | 'DATA';
  name?: string;
  date: string;
}

interface IObservable {
  id: number;
  name: string;
  categoryName: string;
  color?: string;
}

interface ICategory {
  name: string;
  observables: IObservable[];
}

// Constants
const COLORS = {
  background: 0xffffff,
  axisLine: 0x333333,
  axisText: 0x666666,
  gridLine: 0xe0e0e0,
  pauseArea: 0xfff3e0,
  dataLine: 0x1976d2,
  dataLineActive: 0x4caf50,
};

const LAYOUT = {
  yAxisWidth: 120,
  xAxisHeight: 40,
  padding: 10,
  rowHeight: 30,
  categoryHeaderHeight: 24,
};

export default defineComponent({
  name: 'ActivityGraphViewer',

  props: {
    readings: {
      type: Array as PropType<IReading[]>,
      default: () => [],
    },
    categories: {
      type: Array as PropType<ICategory[]>,
      default: () => [],
    },
    height: {
      type: Number,
      default: 300,
    },
  },

  setup(props) {
    const containerRef = ref<HTMLDivElement | null>(null);
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    
    let app: Application | null = null;
    let mainContainer: Container | null = null;
    let isInitializing = false;

    const hasData = computed(() => {
      return props.readings.length > 0 && props.categories.length > 0;
    });

    // Get all observables flat list
    const allObservables = computed(() => {
      const observables: { name: string; categoryName: string; color?: string; yIndex: number }[] = [];
      let yIndex = 0;

      for (const category of props.categories) {
        for (const obs of category.observables) {
          observables.push({
            name: obs.name,
            categoryName: category.name,
            color: obs.color,
            yIndex,
          });
          yIndex++;
        }
      }

      return observables;
    });

    // Calculate time range from readings
    const timeRange = computed(() => {
      if (props.readings.length === 0) {
        return { start: 0, end: 0, duration: 0 };
      }

      const startReading = props.readings.find(r => r.type === 'START');
      const stopReading = props.readings.find(r => r.type === 'STOP');

      const start = startReading ? new Date(startReading.date).getTime() : 0;
      const end = stopReading 
        ? new Date(stopReading.date).getTime() 
        : props.readings.length > 0 
          ? new Date(props.readings[props.readings.length - 1].date).getTime()
          : start;

      return {
        start,
        end,
        duration: end - start,
      };
    });

    // Initialize Pixi app
    const initPixi = async () => {
      if (!canvasRef.value || !containerRef.value) return;
      
      // Prevent concurrent initialization
      if (isInitializing) {
        return;
      }
      
      isInitializing = true;

      try {
        // Destroy existing app
        if (app) {
          app.destroy(true);
          app = null;
        }

        app = new Application();

      const width = containerRef.value.clientWidth || 400;
      const height = props.height;

      await app.init({
        background: COLORS.background,
        canvas: canvasRef.value,
        width,
        height,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

        mainContainer = new Container();
        app.stage.addChild(mainContainer);

        render();
      } catch (error) {
        console.error('Error initializing Pixi:', error);
        if (app) {
          app.destroy(true);
          app = null;
        }
      } finally {
        isInitializing = false;
      }
    };

    // Main render function
    const render = () => {
      if (!app || !mainContainer || !containerRef.value) return;

      // Clear previous content
      mainContainer.removeChildren();

      if (!hasData.value) return;

      const width = containerRef.value.clientWidth || 400;
      const height = props.height;

      // Calculate dimensions
      const dataAreaWidth = width - LAYOUT.yAxisWidth - LAYOUT.padding;
      const dataAreaHeight = height - LAYOUT.xAxisHeight - LAYOUT.padding;

      // Draw Y axis (observables)
      drawYAxis(dataAreaHeight);

      // Draw X axis (time)
      drawXAxis(dataAreaWidth, dataAreaHeight);

      // Draw grid
      drawGrid(dataAreaWidth, dataAreaHeight);

      // Draw data (readings)
      drawData(dataAreaWidth, dataAreaHeight);
    };

    // Draw Y axis with observable names
    const drawYAxis = (_dataAreaHeight: number) => {
      if (!mainContainer) return;

      const yAxisContainer = new Container();
      yAxisContainer.x = 0;
      yAxisContainer.y = LAYOUT.padding;

      const textStyle = new TextStyle({
        fontSize: 11,
        fill: COLORS.axisText,
        fontFamily: 'Arial',
      });

      const categoryStyle = new TextStyle({
        fontSize: 10,
        fill: COLORS.axisText,
        fontFamily: 'Arial',
        fontWeight: 'bold',
      });

      let currentY = 0;
      let currentCategory = '';

      for (const obs of allObservables.value) {
        // Draw category header if changed
        if (obs.categoryName !== currentCategory) {
          currentCategory = obs.categoryName;
          const categoryText = new Text({
            text: currentCategory,
            style: categoryStyle,
          });
          categoryText.x = 5;
          categoryText.y = currentY;
          yAxisContainer.addChild(categoryText);
          currentY += LAYOUT.categoryHeaderHeight;
        }

        // Draw observable name
        const text = new Text({
          text: obs.name.length > 15 ? obs.name.substring(0, 15) + '...' : obs.name,
          style: textStyle,
        });
        text.x = 15;
        text.y = currentY + (LAYOUT.rowHeight - 11) / 2;
        yAxisContainer.addChild(text);

        currentY += LAYOUT.rowHeight;
      }

      mainContainer.addChild(yAxisContainer);
    };

    // Draw X axis with time labels
    const drawXAxis = (dataAreaWidth: number, dataAreaHeight: number) => {
      if (!mainContainer || timeRange.value.duration === 0) return;

      const xAxisContainer = new Container();
      xAxisContainer.x = LAYOUT.yAxisWidth;
      xAxisContainer.y = dataAreaHeight + LAYOUT.padding;

      // Draw axis line
      const axisLine = new Graphics();
      axisLine.moveTo(0, 0);
      axisLine.lineTo(dataAreaWidth, 0);
      axisLine.stroke({ width: 1, color: COLORS.axisLine });
      xAxisContainer.addChild(axisLine);

      // Draw time labels
      const textStyle = new TextStyle({
        fontSize: 10,
        fill: COLORS.axisText,
        fontFamily: 'Arial',
      });

      const duration = timeRange.value.duration;
      const numLabels = Math.min(5, Math.max(2, Math.floor(dataAreaWidth / 80)));

      for (let i = 0; i <= numLabels; i++) {
        const x = (i / numLabels) * dataAreaWidth;
        const time = (i / numLabels) * duration;

        // Tick mark
        const tick = new Graphics();
        tick.moveTo(x, 0);
        tick.lineTo(x, 5);
        tick.stroke({ width: 1, color: COLORS.axisLine });
        xAxisContainer.addChild(tick);

        // Time label
        const label = new Text({
          text: formatTime(time),
          style: textStyle,
        });
        label.x = x - label.width / 2;
        label.y = 8;
        xAxisContainer.addChild(label);
      }

      mainContainer.addChild(xAxisContainer);
    };

    // Draw grid lines
    const drawGrid = (dataAreaWidth: number, dataAreaHeight: number) => {
      if (!mainContainer) return;

      const gridContainer = new Container();
      gridContainer.x = LAYOUT.yAxisWidth;
      gridContainer.y = LAYOUT.padding;

      const grid = new Graphics();

      // Horizontal lines for each observable
      let y = 0;
      let currentCategory = '';

      for (const obs of allObservables.value) {
        if (obs.categoryName !== currentCategory) {
          currentCategory = obs.categoryName;
          y += LAYOUT.categoryHeaderHeight;
        }

        grid.moveTo(0, y + LAYOUT.rowHeight);
        grid.lineTo(dataAreaWidth, y + LAYOUT.rowHeight);

        y += LAYOUT.rowHeight;
      }

      // Vertical lines
      const numLines = 5;
      for (let i = 0; i <= numLines; i++) {
        const x = (i / numLines) * dataAreaWidth;
        grid.moveTo(x, 0);
        grid.lineTo(x, dataAreaHeight);
      }

      grid.stroke({ width: 1, color: COLORS.gridLine });
      gridContainer.addChild(grid);

      mainContainer.addChild(gridContainer);
    };

    // Draw data (readings)
    const drawData = (dataAreaWidth: number, _dataAreaHeight: number) => {
      if (!mainContainer || timeRange.value.duration === 0) return;

      const dataContainer = new Container();
      dataContainer.x = LAYOUT.yAxisWidth;
      dataContainer.y = LAYOUT.padding;

      const { start, duration } = timeRange.value;

      // Group readings by observable
      const observableStates = new Map<string, { startTime: number; active: boolean }>();

      // Filter only DATA readings, excluding comments (name starting with "#")
      const dataReadings = props.readings.filter(r => 
        r.type === 'DATA' && 
        r.name && 
        !r.name.startsWith('#')
      );

      // Draw segments for each observable
      for (const reading of dataReadings) {
        if (!reading.name) continue;

        const obs = allObservables.value.find(o => o.name === reading.name);
        if (!obs) continue;

        const readingTime = new Date(reading.date).getTime();
        const x = ((readingTime - start) / duration) * dataAreaWidth;

        // Calculate Y position
        let y = 0;
        let currentCategory = '';
        for (const o of allObservables.value) {
          if (o.categoryName !== currentCategory) {
            currentCategory = o.categoryName;
            y += LAYOUT.categoryHeaderHeight;
          }
          if (o.name === obs.name) break;
          y += LAYOUT.rowHeight;
        }

        const yCenter = y + LAYOUT.rowHeight / 2;

        // Check if this is a toggle on or off
        const state = observableStates.get(reading.name);

        if (!state || !state.active) {
          // Starting a new active period
          observableStates.set(reading.name, { startTime: readingTime, active: true });

          // Draw a marker at the start
          const marker = new Graphics();
          marker.circle(x, yCenter, 4);
          marker.fill({ color: COLORS.dataLineActive });
          dataContainer.addChild(marker);
        } else {
          // Ending an active period
          const startX = ((state.startTime - start) / duration) * dataAreaWidth;

          // Draw a line from start to end
          const line = new Graphics();
          line.moveTo(startX, yCenter);
          line.lineTo(x, yCenter);
          line.stroke({ width: 3, color: COLORS.dataLineActive });
          dataContainer.addChild(line);

          // Draw end marker
          const endMarker = new Graphics();
          endMarker.circle(x, yCenter, 4);
          endMarker.fill({ color: COLORS.dataLine });
          dataContainer.addChild(endMarker);

          observableStates.set(reading.name, { startTime: 0, active: false });
        }
      }

      // Draw any still-active periods to the end
      // const endTime = timeRange.value.end; // Not used, but kept for clarity
      for (const [name, state] of observableStates) {
        if (state.active) {
          const obs = allObservables.value.find(o => o.name === name);
          if (!obs) continue;

          const startX = ((state.startTime - start) / duration) * dataAreaWidth;
          const endX = dataAreaWidth;

          // Calculate Y position
          let y = 0;
          let currentCategory = '';
          for (const o of allObservables.value) {
            if (o.categoryName !== currentCategory) {
              currentCategory = o.categoryName;
              y += LAYOUT.categoryHeaderHeight;
            }
            if (o.name === obs.name) break;
            y += LAYOUT.rowHeight;
          }

          const yCenter = y + LAYOUT.rowHeight / 2;

          // Draw line to end
          const line = new Graphics();
          line.moveTo(startX, yCenter);
          line.lineTo(endX, yCenter);
          line.stroke({ width: 3, color: COLORS.dataLineActive });
          dataContainer.addChild(line);
        }
      }

      mainContainer.addChild(dataContainer);
    };

    // Format time in mm:ss or hh:mm:ss
    const formatTime = (ms: number): string => {
      const totalSeconds = Math.floor(ms / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    // Handle resize
    const handleResize = () => {
      if (app && containerRef.value) {
        const width = containerRef.value.clientWidth || 400;
        app.renderer.resize(width, props.height);
        render();
      }
    };

    // Watch for data changes
    watch(
      () => [props.readings, props.categories, props.height],
      () => {
        render();
      },
      { deep: true }
    );

    onMounted(async () => {
      await initPixi();
      window.addEventListener('resize', handleResize);
    });

    onUnmounted(() => {
      window.removeEventListener('resize', handleResize);
      isInitializing = false;
      if (app) {
        app.destroy(true);
        app = null;
      }
      mainContainer = null;
    });

    return {
      containerRef,
      canvasRef,
      hasData,
    };
  },
});
</script>

<style lang="scss" scoped>
.activity-graph-viewer {
  position: relative;
  width: 100%;
  min-height: 200px;
  background: #f5f5f5;
  border-radius: 8px;
  overflow: hidden;

  .graph-canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .empty-state {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
  }
}
</style>

