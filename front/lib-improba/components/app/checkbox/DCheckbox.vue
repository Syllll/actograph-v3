<template>
  <q-checkbox v-bind="$attrs" :model-value="props.modelValue" color="accent-medium" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  inheritAttrs: false,
  props: {
    modelValue: {
      type: [Boolean, Array, String, Number] as any,
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
