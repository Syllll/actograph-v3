<template>
  <q-btn-toggle
    no-caps
    :class="props.class ? props.class : 'bg-secondary-medium'"
    toggle-color="text"
    unelevated
    :options="props.options"
  >
    <slot></slot>
  </q-btn-toggle>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    options: {
      type: Array as any,
      default: [] as {
        label: string;
        value: string;
      }[],
    },
    class: {
      type: String,
      required: false,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
