<template>
  <DBtn
    color="accent-medium"
    :icon="props.icon"
    :type="props.type"
    :label="
      props.label ??
      (!props.icon ? i18n.t('components.buttons.DSubmitBtn.label') : undefined)
    "
    no-caps
  >
    <slot></slot>
  </DBtn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { useI18n } from 'vue-i18n';

import DBtn from './DBtn.vue';

export default defineComponent({
  components: {
    DBtn,
  },
  props: {
    type: {
      type: String,
      default: undefined,
    },
    label: {
      type: String,
      default: undefined,
    },
    icon: {
      type: String,
      default: undefined,
    },
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
