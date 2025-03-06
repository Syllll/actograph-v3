<template>
  <q-list :class="`${props.noPadding ? 'q-pa-none' : ''}`">
    <slot> </slot>
  </q-list>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    noPadding: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    return { props };
  },
});
</script>

<style scoped lang="scss"></style>
