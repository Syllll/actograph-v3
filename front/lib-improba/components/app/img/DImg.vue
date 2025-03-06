<template>
  <q-img
    no-spinner
    :class="{ invisible: props.invisible }"
    :style="{ display: props.displayNone ? 'none' : undefined }"
  >
    <slot></slot>
  </q-img>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    invisible: {
      type: Boolean,
      default: false,
    },
    displayNone: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
