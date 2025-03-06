<template>
  <DBtn icon="keyboard_arrow_left" no-caps :tooltip="props.tooltip">
    <slot>
      <q-icon v-if="props.icon !== ''" :name="props.icon" />
      {{ props.label }}
    </slot>
  </DBtn>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  props: {
    icon: {
      type: String,
      default: '',
    },
    tooltip: {
      type: String,
      default: '',
    },
    label: {
      type: String,
      default: 'Retour',
    },
  },
  setup(props) {
    const computedState = {};

    return { props, computedState };
  },
});
</script>
