<template>
  <DActionBtn :disabled="props.disabled" icon="edit" color="d-primary">
    <slot></slot>
  </DActionBtn>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    disabled: { type: Boolean, default: false },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
