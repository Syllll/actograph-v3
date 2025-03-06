<template>
  <DBtn
    :label="i18n.t('components.buttons.DSubmitBtn.label')"
    :type="props.type ?? undefined"
    :disabled="props.disabled"
    rounded
    no-caps
    outline
    :hideOutlineWhenHovering="props.disabled === false"
    :hoverColor="props.disabled === false ? 'accent-higher' : ''"
    :hoverTextColor="props.disabled === false ? 'd-text' : ''"
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
    disabled: {
      type: Boolean,
      default: false,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
