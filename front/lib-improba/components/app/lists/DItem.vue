<template>
  <q-item :class="props.noPadding === true ? 'q-pa-none no-padding' : ''">
    <slot> </slot>
  </q-item>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    noPadding: {
      type: Boolean,
      default: false,
    },
  },
  emits: [],
  setup(props, context) {
    return {
      props,
      emit: context.emit,
    };
  },
});
</script>

<style scoped lang="scss">
.no-padding {
  .q-item {
    &:deep() {
      padding: 0 !important;
    }
  }
}
</style>
