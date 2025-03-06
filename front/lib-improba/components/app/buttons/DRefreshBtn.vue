<template>
  <DBtn unelevated color="primary" icon="refresh">
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
  setup(props) {
    return {
      i18n,
      props,
    };
  },
});
</script>
