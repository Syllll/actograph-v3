<template>
  <div class="fit column">
    <div class="col-auto">
      <p>Text: {{ props.text }}</p>
    </div>
    <div class="col-auto">
      <slot name="default"></slot>
    </div>
    <div class="col-auto">
      Slot that is ignored by the page builder
      <slot name="addition"></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    text: {
      type: String,
      required: false,
      default: 'toto',
    },
  },
  builderOptions: {
    slots: ['default'],
    category: 'Example',
    description: 'A simple component, version A.',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
