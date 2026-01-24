<template>
  <div class="fit text-text full-height q-mr-md row items-center">
    <div
      :class="`full-width ellipsis ${props.textRight ? 'text-right' : ''} ${
        props.bold ? 'text-weight-bold' : ''
      }`"
    >
      {{ label }}
    </div>
    <DTooltip v-if="props.tooltip">
      {{ props.tooltip }}
    </DTooltip>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';

export default defineComponent({
  components: {},
  props: {
    label: {
      type: String,
      required: false,
      default: '',
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
