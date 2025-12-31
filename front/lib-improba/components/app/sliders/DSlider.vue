<template>
  <q-slider v-bind="$attrs" :model-value="props.modelValue" color="accent-medium">
    <slot></slot>
  </q-slider>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [Number, Array] as any,
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
