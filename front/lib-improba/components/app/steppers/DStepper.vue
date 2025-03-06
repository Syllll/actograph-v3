<template>
  <q-stepper
    done-color="text"
    active-color="accent-higher"
    inactive-color="text"
  >
    <slot></slot>
  </q-stepper>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {},
});
</script>
