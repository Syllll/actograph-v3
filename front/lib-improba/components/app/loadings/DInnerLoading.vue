<template>
  <q-inner-loading :showing="props.showing">
    <q-spinner-gears size="lg" color="neutral-medium" />
    <slot></slot>
  </q-inner-loading>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    showing: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>

<style scoped lang="scss"></style>
