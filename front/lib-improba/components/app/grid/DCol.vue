<template>
  <div :class="props.class ?? 'col-12 col-md-5'">
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
