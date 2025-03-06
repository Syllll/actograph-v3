<template>
  <q-pagination
    direction-links
    :min="1"
    :max="computedState.max"
    :max-pages="computedState.maxPages"
    :modelValue="state.currentPage"
    :boundary-numbers="false"
    @update:modelValue="methods.updateCurrentPage"
  />
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, reactive, watch, computed } from 'vue';

export default defineComponent({
  props: {
    color: { type: String, required: false },
    currentPage: { type: Number, default: 1 },
    max: { type: Number, default: 10 },
    maxPages: { type: Number, default: 5 },
  },
  emits: ['update:pagination', 'update:currentPage'],
  setup(props, { emit }) {
    const state = reactive({
      currentPage: props.currentPage,
    });

    const methods = {
      updateCurrentPage(currentPage: number) {
        state.currentPage = currentPage;
        emit('update:currentPage', currentPage);
      },
    };

    const computedState = reactive({
      // currentPage: computed(() => props.currentPage),
      max: computed(() => props.max),
      maxPages: computed(() => props.maxPages),
    });

    watch(
      () => props.currentPage,
      (currentPage) => (state.currentPage = currentPage)
    );

    return {
      props,
      state,
      methods,
      computedState,
      emit,
    };
  },
});
</script>
