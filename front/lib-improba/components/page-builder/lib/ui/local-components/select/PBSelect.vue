<template>
  <q-select
    class="bg-pb-editor-background-60"
    color="pb-editor-accent"
    popup-content-class="popup-labels-de-emphasize"
    dense
    :style="`${props.minWidth ? 'min-width: ' + props.minWidth : ''}`"
  >
    <slot></slot>
    <template v-slot:before v-if="props.before">
      <slot name="before"></slot>
    </template>
    <template v-slot:after>
      <slot name="after"></slot>
    </template>
  </q-select>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

export default defineComponent({
  props: {
    minWidth: {
      type: String,
      default: '8rem',
    },
    before: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    const state = reactive({});

    const methods = {};

    return {
      props,
      state,
      methods,
    };
  },
});
</script>

<style lang="scss">
.popup-labels-de-emphasize {
  .q-item:not(.q-item--active) {
    color: var(--neutral-medium);
  }
}
</style>
