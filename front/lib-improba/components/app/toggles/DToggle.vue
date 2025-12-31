<template>
  <q-toggle v-bind="$attrs" :model-value="props.modelValue" color="accent-medium">
    <slot></slot>
  </q-toggle>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [Boolean, String, Number] as any,
      default: undefined,
    },
  },
  emits: [],
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
