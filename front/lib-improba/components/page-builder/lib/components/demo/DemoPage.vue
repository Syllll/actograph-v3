<template>
  <div class="fit bg-white">
    <div class="q-mx-auto bg-white" style="max-width: 70rem">
      <slot name="default"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';

export default defineComponent({
  components: {},
  props: {},
  emits: [],
  builderOptions: {
    slots: ['default'],
    category: 'Demo',
    description: '',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
