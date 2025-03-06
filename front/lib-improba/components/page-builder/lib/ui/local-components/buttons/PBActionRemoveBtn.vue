<template>
  <PBActionBtn
    :disabled="disabled"
    icon="delete"
    :color="disabled ? 'pb-editor-neutral' : 'pb-editor-negative'"
    :tooltip="
      i18n.t('components.buttons.DActionRemoveBtn.tooltip') ?? undefined
    "
  >
    <slot></slot>
  </PBActionBtn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { useI18n } from 'vue-i18n';
import PBActionBtn from './PBActionBtn.vue';

export default defineComponent({
  components: { PBActionBtn },
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
