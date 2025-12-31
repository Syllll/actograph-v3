<template>
  <q-btn-toggle
    v-bind="$attrs"
    no-caps
    :class="props.class ? props.class : 'bg-secondary-medium'"
    toggle-color="text"
    unelevated
    :options="props.options"
    :model-value="props.modelValue"
  >
    <slot></slot>
  </q-btn-toggle>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number, Array] as any,
      default: undefined,
    },
    options: {
      type: Array as any,
      default: [] as {
        label: string;
        value: string;
      }[],
    },
    class: {
      type: String,
      required: false,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
