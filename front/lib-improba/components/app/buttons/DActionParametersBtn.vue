<template>
  <DActionBtn icon="settings">
    <DTooltip v-if="props.tooltip !== ''">{{ props.tooltip }}</DTooltip>
  </DActionBtn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import { useI18n } from 'vue-i18n';

import DActionBtn from './DActionBtn.vue';
import DTooltip from '../tooltips/DTooltip.vue';

export default defineComponent({
  components: {
    DActionBtn,
    DTooltip,
  },
  props: {
    tooltip: {
      type: String,
      default: '',
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
