<template>
  <q-btn
    :disable="disabled"
    dense
    flat
    no-caps
    rounded
    color="d-primary"
    size="0.8rem"
  >
    <DTooltip v-if="props.tooltip && props.tooltip !== ''">{{
      props.tooltip
    }}</DTooltip>
    <slot></slot>
  </q-btn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
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
