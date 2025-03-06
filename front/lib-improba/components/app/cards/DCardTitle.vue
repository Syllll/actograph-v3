<template>
  <h5
    v-if="props.title"
    class="col ellipsis q-ma-none q-ml-sm q-pa-none q-my-sm text-left text-uppercase text-weight-bold"
  >
    {{ props.title }}
  </h5>
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
    return { props };
  },
});
</script>
