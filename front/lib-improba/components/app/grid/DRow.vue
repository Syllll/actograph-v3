<template>
  <div :class="props.class ?? 'row justify-center'">
    <slot />
  </div>
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    class: {
      type: String,
      default: () => null,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
