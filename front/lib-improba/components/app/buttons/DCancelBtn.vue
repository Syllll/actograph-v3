<template>
  <DBtn flat :label="i18n.t('components.buttons.DCancelBtn.label')" no-caps>
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
  setup() {
    const i18n = useI18n();
    return {
      i18n,
    };
  },
});
</script>
