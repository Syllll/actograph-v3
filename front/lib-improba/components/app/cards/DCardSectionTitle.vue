<template>
  <div class="text-h6 text-left">
    {{ props.title }}
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  props: {
    title: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const computedState = {};

    return { props, computedState };
  },
});
</script>
