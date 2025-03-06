<template>
  <div>
    <div :style="`${$props.customStyle}`">
      <slot name="default"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';

export default defineComponent({
  components: {},
  props: {
    customStyle: {
      type: String,
      required: false,
      default: '',
    },
  },
  emits: [],
  builderOptions: {
    slots: ['default'],
    name: 'Conteneur',
    description: 'Un simple conteneur',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
