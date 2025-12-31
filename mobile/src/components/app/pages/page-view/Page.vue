<template>
  <q-page class="d-page bg-primary-lowest text-text">
    <div :class="['d-page-content', { 'q-pa-md': props.padding }]">
      <slot></slot>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  name: 'PageView',
  props: {
    padding: { type: Boolean, default: false },
  },
  setup(props) {
    return { props };
  },
});
</script>

<style scoped lang="scss">
.d-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.d-page-content {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  position: relative;
}
</style>

