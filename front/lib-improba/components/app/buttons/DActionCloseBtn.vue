<template>
  <DActionBtn icon="close">
    <slot></slot>
  </DActionBtn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';
import DActionBtn from './DActionBtn.vue';

export default defineComponent({
  components: {
    DActionBtn,
  },
  setup() {
    return {};
  },
});
</script>
