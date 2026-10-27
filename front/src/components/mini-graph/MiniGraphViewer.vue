<template>
  <div class="mini-graph-viewer" :aria-busy="loading" data-testid="mini-graph-viewer">
    <canvas ref="canvasRef" :aria-label="$t('miniGraph.canvasLabel')" />
    <div v-if="error" class="mini-graph-overlay" role="alert">
      <q-icon name="error_outline" size="28px" />
      <span>{{ $t('miniGraph.renderError') }}</span>
      <q-btn flat no-caps :label="$t('miniGraph.retry')" @click="restart" />
    </div>
    <div v-else-if="loading" class="mini-graph-overlay" role="status">
      <q-spinner color="primary" size="28px" />
      <span>{{ $t('miniGraph.loading') }}</span>
    </div>
    <div v-else-if="!hasReadings" class="mini-graph-overlay" role="status">
      {{ $t('miniGraph.empty') }}
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, onMounted, onBeforeUnmount, ref, watch, type PropType } from 'vue';
import { ReadingTypeEnum, type IObservation } from '@actograph/core';
import { buildMiniGraphObservation } from 'src/utils/mini-graph-data';
import { graphRenderOptionsFromMeta } from 'src/utils/graph-render-meta';
import { MiniGraphRenderer } from 'src/utils/mini-graph-renderer';

export default defineComponent({
  name: 'MiniGraphViewer',
  props: {
    observation: { type: Object as PropType<IObservation>, required: true },
    selectedTime: { type: Number as PropType<number | null>, default: null },
  },
  setup(props, { expose }) {
    const canvasRef = ref<HTMLCanvasElement | null>(null);
    const loading = ref(true);
    const error = ref(false);
    const hasReadings = computed(() => props.observation.readings?.some((reading) => reading.type === ReadingTypeEnum.DATA) ?? false);
    let renderer: MiniGraphRenderer | null = null;
    let observer: ResizeObserver | null = null;
    let generation = 0;
    let disposed = false;
    let mounted = false;

    const update = () => {
      renderer?.update(buildMiniGraphObservation(props.observation, null),
        { ...graphRenderOptionsFromMeta(props.observation.meta) });
    };
    const restart = async () => {
      const run = ++generation;
      renderer?.destroy();
      renderer = null;
      loading.value = true;
      error.value = false;
      try {
        const { PixiApp } = await import('@actograph/graph');
        const canvas = canvasRef.value;
        if (disposed || generation !== run || !canvas) return;
        const engine = new PixiApp();
        renderer = new MiniGraphRenderer(engine, (reason) => {
          if (disposed || generation !== run) return;
          console.warn('[mini-graph] render failed', reason);
          error.value = true;
          loading.value = false;
        }, () => {
          if (disposed || generation !== run) return;
          loading.value = false;
          error.value = false;
        });
        update();
        renderer.select(props.selectedTime);
        renderer.fit();
        await renderer.init(canvas);
      } catch (reason) {
        if (!disposed && generation === run) {
          console.warn('[mini-graph] init failed', reason);
          error.value = true;
          loading.value = false;
        }
      }
    };
    watch(() => props.observation, update);
    watch(hasReadings, (available) => {
      if (!mounted) return;
      if (available) void restart();
      else {
        generation++;
        renderer?.destroy();
        renderer = null;
        loading.value = false;
        error.value = false;
      }
    });
    watch(() => props.selectedTime, (time) => renderer?.select(time));
    onMounted(() => {
      mounted = true;
      if (canvasRef.value) {
        observer = new ResizeObserver(() => renderer?.resize());
        observer.observe(canvasRef.value.parentElement!);
      }
      if (hasReadings.value) void restart();
      else loading.value = false;
    });
    onBeforeUnmount(() => {
      disposed = true;
      generation++;
      observer?.disconnect();
      renderer?.destroy();
      renderer = null;
    });
    expose({ fit: () => renderer?.fit() });
    return { canvasRef, loading, error, hasReadings, restart, fit: () => renderer?.fit() };
  },
});
</script>

<style scoped>
.mini-graph-viewer { position: relative; width: 100%; height: 100%; min-height: 0; overflow: hidden; background: white; }
canvas { display: block; width: 100% !important; height: 100% !important; }
.mini-graph-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; background: white; color: #586474; font-size: 13px; }
</style>
