<template>
  <div
    class="fit smooth all-pointer-events text-text rounded bg-transparent hover:bg-pb-editor-primary"
    :class="{
      'border-pb-editor-primary border-thin border-dashed': drag.sharedState.dragElement && !state.hover,
      'border-pb-editor-primary border-thin border-dotted': drag.sharedState.dragElement && state.hover,
      'drag-over': state.hover,
    }"
    dropable
    @dragenter.prevent="drag.methods.onDragEnter"
    @dragleave.prevent="
      state.hover = false;
      drag.methods.onDragLeave;
    "
    @dragover.prevent="
      state.hover = true;
      drag.methods.onDragOver;
    "
    @drop.prevent="methods.onDrop"
  >
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive } from 'vue';
import { useDragCard } from './../../ui/local-components/list-check-or-drag/use-drag-card';

export default defineComponent({
  // props: {},
  emits: ['drop'],
  setup(props, context) {
    const drag = useDragCard();

    const stateless = {};
    const state = reactive({
      hover: false,
    });
    const methods = {
      onDrop: (e: any) => {
        const compoName = drag.methods.onDrop(e);
        context.emit('drop', compoName);
      },
    };
    const computedState = {};

    onMounted(async () => {});

    return { stateless, state, methods, computedState, drag };
  },
});
</script>

<style lang="scss" scoped>
@keyframes clignoter {
  0% {
    opacity: 1;
  }

  40% {
    opacity: 0;
  }

  100% {
    opacity: 1;
  }
}

.drag-over {
  background: var(--pb-accent);

  //animation-duration: 0.3s;
  //animation-name: clignoter;
  //animation-iteration-count: infinite;
  //transition: none;
}

.drag-active {
  border: solid 0.2rem;
  border-style: dashed dashed;
  color: var(--pb-accent) !important;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 6px,
    var(--pb-accent) 6px,
    var(--pb-accent) 8px
  );
}
</style>
