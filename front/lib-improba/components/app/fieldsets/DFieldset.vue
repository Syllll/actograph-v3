<template>
  <fieldset class="d-fieldset q-mb-lg">
    <legend v-if="$props.legend">{{ $props.legend }}</legend>
    <slot></slot>
  </fieldset>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    legend: {
      type: String,
      default: '',
    },
  },
});
</script>
