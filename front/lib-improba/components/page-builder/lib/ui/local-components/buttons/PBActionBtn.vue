<template>
  <q-btn
    :disable="disabled"
    dense
    flat
    no-caps
    rounded
    color="pb-editor-text"
    size="0.8rem"
  >
    <PBTooltip v-if="props.tooltip && props.tooltip !== ''">{{
      props.tooltip
    }}</PBTooltip>
    <slot></slot>
  </q-btn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import PBTooltip from '../tooltips/PBTooltip.vue';

export default defineComponent({
  components: {
    PBTooltip,
  },
  props: {
    disabled: { type: Boolean, default: false },
    tooltip: {
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
