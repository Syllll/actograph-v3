<template>
  <DBtn
    unelevated
    color="primary"
    icon="file_download"
    tooltip="Exporter les données"
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
  setup() {
    return {
      i18n,
    };
  },
});
</script>
