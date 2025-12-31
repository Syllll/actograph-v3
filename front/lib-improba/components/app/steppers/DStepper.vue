<template>
  <q-stepper
    v-bind="$attrs"
    :model-value="props.modelValue"
    done-color="text"
    active-color="accent-higher"
    inactive-color="text"
  >
    <slot></slot>
  </q-stepper>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [String, Number] as any,
      default: undefined,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
