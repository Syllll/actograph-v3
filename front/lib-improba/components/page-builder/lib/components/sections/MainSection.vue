<template>
  <div
    :class="`row justify-center ${props.class}`"
    :style="`overflow-x: hidden !important; ${props.customStyle}`"
  >
    <div :class="`${props.innerClass}`">
      <slot />
    </div>
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
    innerClass: {
      type: String,
      default: 'col-12 col-md-10 col-lg-6',
      builderOptions: { label: 'Inner class' },
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
