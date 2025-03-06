<template>
  <span
    :class="`${props.color ? 'text-' + props.color : 'text-text-link'} ${
      props.noUnderline ? '' : 'underline'
    } ${props.bold ? 'text-bold' : ''} cursor-pointer`"
  >
    <slot> </slot>
  </span>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    color: {
      type: String,
      required: false,
    },
    noUnderline: {
      type: Boolean,
      required: false,
      default: false,
    },
    bold: {
      type: Boolean,
      required: false,
      default: false,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>

<style scoped lang="scss">
.underline {
  text-decoration: underline;
}
</style>
