<template>
  <div class="text-pb-editor-text full-height q-mr-md row items-center">
    <div
      :class="`full-width ellipsis ${props.textRight ? 'text-right' : ''} ${
        props.bold ? 'text-weight-bold' : ''
      }`"
    >
      {{ label }}
    </div>
    <PBTooltip v-if="props.tooltip">
      {{ props.tooltip }}
    </PBTooltip>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';
import PBTooltip from '../tooltips/PBTooltip.vue';

export default defineComponent({
  components: { PBTooltip },
  props: {
    label: {
      type: String,
      required: true,
    },
    tooltip: {
      type: String,
      default: null,
    },
    bold: {
      type: Boolean,
      default: true,
    },
    textRight: {
      type: Boolean,
      default: true,
    },
  },
  emits: [],
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
