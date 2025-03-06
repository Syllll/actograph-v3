<template>
  <div class="fit bg-grey-3">
    <div class="q-mx-auto bg-white" style="max-width: 50rem">
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
    name: 'Page',
    category: 'Layout',
    description: 'A page on a background',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
