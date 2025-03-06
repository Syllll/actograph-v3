<template>
  <DActionBtn icon="inventory_2">
    <DTooltip v-if="props.tooltip">{{ props.tooltip }}</DTooltip>
  </DActionBtn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  components: {},
  props: {
    tooltip: {
      type: String,
      required: false,
    },
  },

  setup(props) {
    return {
      props,
    };
  },
});
</script>
