<template>
  <DActionBtn icon="settings" :tooltip="props.tooltip" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import DActionBtn from './DActionBtn.vue';

export default defineComponent({
  components: {
    DActionBtn,
  },
  props: {
    tooltip: {
      type: String,
      default: '',
    },
  },

  setup(props) {
    return {
      props,
    };
  },
});
</script>
