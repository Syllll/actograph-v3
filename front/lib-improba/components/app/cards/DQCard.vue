<template>
  <q-card :class="`text-text ${props.noBgColor ? '' : 'bg-secondary-medium'}`">
    <div :class="`${props.useInnerPadding ? 'q-pa-md' : ''} fit`">
      <slot></slot>
    </div>
  </q-card>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

export default defineComponent({
  props: {
    useInnerPadding: {
      type: Boolean,
      default: false,
    },
    noBgColor: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, context) {
    const state = reactive({});

    const methods = {};

    return { props, state, methods };
  },
});
</script>
