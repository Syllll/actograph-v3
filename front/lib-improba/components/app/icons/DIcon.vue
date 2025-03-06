<template>
  <q-icon size="1.75em">
    <DTooltip v-if="props.tooltip">
      {{ props.tooltip }}
    </DTooltip>
    <slot></slot>
  </q-icon>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    tooltip: {
      type: String,
      default: null,
    },
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
