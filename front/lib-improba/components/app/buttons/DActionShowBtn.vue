<template>
  <DActionBtn
    :disabled="disabled"
    :icon="props.revealed ? 'visibility' : 'visibility_off'"
    :color="props.revealed ? 'd-primary' : 'gray'"
    :tooltip="i18n.t('components.buttons.DActionShowBtn.tooltip') ?? undefined"
  >
    <slot></slot>
  </DActionBtn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { useI18n } from 'vue-i18n';

export default defineComponent({
  props: {
    disabled: { type: Boolean, default: false },
    revealed: { type: Boolean, default: true },
  },
  setup(props) {
    const i18n = useI18n();
    return {
      props,
      i18n,
    };
  },
});
</script>
