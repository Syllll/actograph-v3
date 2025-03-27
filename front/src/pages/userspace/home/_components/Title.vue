<template>
  <h2 class="text-h5 q-mb-md text-weight-medium text-center">
    {{ $props.title }}
  </h2>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    title: {
      type: String,
      required: true,
    },
  },
});
</script>
