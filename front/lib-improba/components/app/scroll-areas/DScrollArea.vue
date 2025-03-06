<template>
  <q-scroll-area>
    <slot></slot>
  </q-scroll-area>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  setup() {},
});
</script>

<style scoped lang="scss">
.q-scrollarea {
  &:deep() {
    .scroll {
      flex: 1;

      & > div {
        min-height: 100%;
        display: flex;
        flex-direction: column;
      }
    }
  }
}
</style>
