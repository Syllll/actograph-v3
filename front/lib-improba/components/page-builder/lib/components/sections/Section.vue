<template>
  <div :class="`${props.class}`" :style="`${props.customStyle}`">
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed } from 'vue';

export default defineComponent({
  components: {},
  props: {
    style: {
      type: String,
      default: '',
      builderOptions: { label: 'Style' },
    },
    class: {
      type: String,
      default: '',
      builderOptions: { label: 'Class' },
    },
  },
  emits: [],
  builderOptions: {
    slots: ['default'],
    description: 'A wrapper to organize things.',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
