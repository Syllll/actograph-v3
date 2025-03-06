<template>
  <DBtn flat dense icon="close" color="text" no-caps>
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
    return {};
  },
});
</script>
