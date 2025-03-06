<template>
  <DIcon name="search">
    <slot></slot>
  </DIcon>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import DIcon from './DIcon.vue';

export default defineComponent({
  components: {
    DIcon,
  },
  props: {
    showPassword: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:showPassword'],
  setup(props, context) {
    const methods = {
      toggle() {
        context.emit('update:showPassword', !props.showPassword);
      },
    };

    return {
      methods,
    };
  },
});
</script>
