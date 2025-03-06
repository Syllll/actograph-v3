<template>
  <PBIcon
    :dark="false"
    :name="showPassword ? 'visibility' : 'visibility_off'"
    class="cursor-pointer"
    @click="methods.toggle"
  >
    <slot></slot>
  </PBIcon>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

import PBIcon from './PBIcon.vue';

export default defineComponent({
  components: {
    PBIcon,
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
