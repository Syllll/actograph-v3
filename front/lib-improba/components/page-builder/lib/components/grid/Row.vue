<template>
  <div :class="`full-width row ${props.class}`" :style="`${props.customStyle}`">
    <slot name="default"> </slot>
    <div class="col-auto">
      <EmptySlot :parentId="props.objectInTreeId" :myTreeId="props.myTreeId" />
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
    objectInTreeId: {
      type: Number,
      required: true,
      builderOptions: { hide: true },
    },
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
    slots: ['default'],
    description: 'A simple row component.',
    icon: 'mdi-view-column',
    hideFreeSlots: true, // We want to govern manually the display of the EmptySlot component
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
