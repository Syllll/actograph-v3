<template>
  <div
    :class="`${$props.customClass} ${$props.colClass}`"
    :style="$props.customStyle"
  >
    <slot name="default"></slot>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed } from 'vue';

export default defineComponent({
  components: {},
  props: {
    customStyle: {
      type: String,
      default: '',
      builderOptions: { label: 'Style' },
    },
    colClass: {
      type: String,
      default: 'col-auto',
      builderOptions: {
        options: [
          {
            value: 'col-auto',
            label: 'Auto',
          },
          {
            value: 'col',
            label: 'Full',
          },
          {
            value: 'col-1',
            label: '1',
          },
          {
            value: 'col-2',
            label: '2',
          },
          {
            value: 'col-3',
            label: '3',
          },
          {
            value: 'col-4',
            label: '4',
          },
          {
            value: 'col-5',
            label: '5',
          },
          {
            value: 'col-6',
            label: '6',
          },
          {
            value: 'col-7',
            label: '7',
          },
          {
            value: 'col-8',
            label: '8',
          },
          {
            value: 'col-9',
            label: '9',
          },
          {
            value: 'col-10',
            label: '10',
          },
          {
            value: 'col-11',
            label: '11',
          },
          {
            value: 'col-12',
            label: '12',
          },
        ],
      },
    },
    customClass: {
      type: String,
      default: '',
    },
  },
  emits: [],
  builderOptions: {
    slots: ['default'],
    description: 'A simple column component.',
    icon: 'mdi-view-column',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
