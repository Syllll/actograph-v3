<template>
  <div
    :style="`${props.customStyle}`"
    :class="`${props.class}`"
    v-html="props.text"
  ></div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed } from 'vue';
import EmptySlot from '../../tree/empty-slot/Index.vue';

export default defineComponent({
  components: {
    EmptySlot,
  },
  props: {
    customStyle: {
      type: String,
      default: '',
      builderOptions: { label: 'Style' },
    },
    class: {
      type: String,
      default: '',
      builderOptions: { label: 'Class' },
    },
    text: {
      type: String,
      default: 'Fill me with text.',
      builderOptions: { editor: true },
    },
  },
  emits: [],
  builderOptions: {
    slots: [],
    description: 'A simple text.',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
