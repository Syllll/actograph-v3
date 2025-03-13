<template>
  <DBtnDropdown
    title="Dimensions"
    class="q-mx-sm q-px-sm"
    dense
    dropdown-icon="mdi-monitor-screenshot"
  >
    <DBtn
      v-for="[breakpoint, { icon, width, height }] in Object.entries(
        drawers.stateless.toolbar.sizes
      )"
      :key="'toolbar_frame_btn_' + breakpoint"
      flat
      dense
      class="q-mx-sm"
      :title="breakpoint"
      :icon="icon"
      @click="methods.handleResize({ width, height })"
    />
  </DBtnDropdown>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';
import { useDrawers } from '@lib-improba/components/page-builder/lib/ui/use-drawers';

export default defineComponent({
  // props: {},
  emits: [],
  setup(props) {
    const drawers = useDrawers('');

    const stateless = {};

    const state = reactive({});

    const methods = {
      handleResize: (event: {
        width: number | (() => string);
        height: number | (() => string);
      }) => {
        const { width, height } = event;

        const targetWidth =
          typeof width === 'number' ? width + 'px' : width?.();
        const targetHeight =
          typeof height === 'number' ? height + 'px' : height?.();

        drawers.sharedState.frame.width = targetWidth;
        drawers.sharedState.frame.height = targetHeight;
      },
    };

    const computedState = {};

    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
      }
    );

    onMounted(() => {});

    return {
      drawers,
      props,
      stateless,
      state,
      methods,
      computedState,
    };
  },
});
</script>
