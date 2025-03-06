<template>
  <q-toggle color="accent-medium">
    <slot></slot>
  </q-toggle>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {},
  emits: [],
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
