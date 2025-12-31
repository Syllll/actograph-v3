<template>
  <q-select
    v-bind="$attrs"
    :model-value="props.modelValue"
    color="accent-medium"
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
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number, Array, Object, null] as any,
      default: undefined,
    },
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
    return {
      props,
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
