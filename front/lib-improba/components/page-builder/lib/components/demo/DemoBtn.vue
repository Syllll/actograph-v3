<template>
  <div><DSubmitBtn :label="$props.label" /></div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, PropType } from 'vue';

export default defineComponent({
  components: {},
  props: {
    label: {
      type: String,
      default: 'Je suis un bouton',
    },
  },
  emits: [],
  builderOptions: {
    slots: [],
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
