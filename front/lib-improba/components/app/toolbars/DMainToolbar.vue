<template>
  <DToolbar class="bg-primary-low">
    <slot></slot>
  </DToolbar>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import DToolbar from './DToolbar.vue';

export default defineComponent({
  components: {
    DToolbar,
  },
  setup() {},
});
</script>
