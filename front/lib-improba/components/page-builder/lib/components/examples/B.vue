<template>
  <div class="fit column">
    <div class="col-auto">
      <p>{{ `Text B: ${props.text}` }}</p>
    </div>
    <div class="col-auto">
      <slot name="default"></slot>
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
      default: 'bebe',
      description: 'The text to display.',
      builderOptions: { editor: true },
    },
    text2: {
      type: String,
      required: false,
      default: 'bebe2',
      description: 'The text to display.',
    },
    text3: {
      type: String,
      required: false,
      default: 'bebe2',
      description: 'The text to display.',
    },
    text4: {
      type: String,
      required: false,
      default: 'bebe2',
      description: 'The text to display.',
    },
    text5: {
      type: String,
      required: false,
      default: 'bebe2',
      description: 'The text to display.',
    },
    text6: {
      type: String,
      required: false,
      default: 'bebe2',
      description: 'The text to display.',
    },
    text7: {
      type: String,
      required: false,
      default: 'bebe2',
      description: 'The text to display.',
    },
  },
  builderOptions: {
    slots: ['default'],
    category: 'Example',
    description: 'A simple component, version B.',
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
