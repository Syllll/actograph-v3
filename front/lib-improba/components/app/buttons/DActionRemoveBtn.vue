<template>
  <DActionBtn
    :disabled="disabled"
    icon="delete"
    :color="disabled ? 'neutral-medium' : 'danger-medium'"
    :tooltip="
      i18n.t('components.buttons.DActionRemoveBtn.tooltip') ?? undefined
    "
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
  },
  setup(props) {
    const i18n = useI18n();
    return {
      i18n,
      props,
    };
  },
});
</script>
