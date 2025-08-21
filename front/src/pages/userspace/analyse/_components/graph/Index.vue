<template>
  <div class="fit">
   <d-canvas class="fit" ref="canvasRef" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, onUnmounted } from 'vue';
import { useGraph } from './use-graph';

export default defineComponent({
  setup() {

    const canvasRef = ref<HTMLCanvasElement | null>(null);

    const graph = useGraph({
      init: {
        canvasRef,
      },
    });

    return {
      graph,
      canvasRef,
    };
  },
});
</script>