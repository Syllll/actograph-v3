<template>
  <div
    :class="`full-width column ${props.class}`"
    :style="`${props.customStyle}`"
  >
    <div class="col-4 q-pa-sm">
      <slot name="column-1"> </slot>
    </div>
    <div class="col-4 q-pa-sm">
      <slot name="column-2"> </slot>
    </div>
    <div class="col-4 q-pa-sm">
      <slot name="column-3"> </slot>
    </div>
  </div>
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
    },
    myTreeId: {
      type: String,
      required: true,
    },
  },
  emits: [],
  builderOptions: {
    slots: ['column-1', 'column-2', 'column-3'],
    description: 'A row with three columns.',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
