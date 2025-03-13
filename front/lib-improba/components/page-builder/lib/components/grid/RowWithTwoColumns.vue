<template>
  <div :class="`full-width row ${props.class}`" :style="`${props.customStyle}`">
    <div
      :class="`col-${props.column1Width} ${
        props.columnsPadding ? ' q-pa-sm ' : ''
      }`"
    >
      <slot name="column-1"> </slot>
    </div>
    <div
      :class="`col-${props.column2Width} ${
        props.columnsPadding ? ' q-pa-sm ' : ''
      }`"
    >
      <slot name="column-2"> </slot>
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
    columnsPadding: {
      type: Boolean,
      default: true,
      builderOptions: { label: 'Columns padding' },
    },
    column1Width: {
      type: [Number, String],
      default: 6,
      builderOptions: {
        label: 'First column width',
        rules: [
          (v: number | string) =>
            (Number(v) >= 1 && Number(v) <= 12) ||
            'Column 1 width must be between 1 and 12',
        ],
      },
    },
    column2Width: {
      type: [Number, String],
      default: 6,
      builderOptions: {
        label: 'Second column width',
        rules: [
          (v: number | string) =>
            (Number(v) >= 1 && Number(v) <= 12) ||
            'Column 2 width must be between 1 and 12',
        ],
      },
    },
    myTreeId: {
      type: String,
      required: true,
    },
  },
  emits: [],
  builderOptions: {
    slots: ['column-1', 'column-2'],
    description: 'A row with two columns.',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
