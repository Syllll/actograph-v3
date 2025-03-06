<template>
  <div :class="`column ${props.withGutter ? 'q-col-gutter-lg' : ''}`">
    <div class="col-auto" v-if="props.title || props.titleSeparator">
      <slot name="header">
        <DCardSectionTitle v-if="props.title" :title="props.title" />
        <q-separator v-if="props.titleSeparator" />
      </slot>
    </div>
    <div class="col">
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

import DCardSectionTitle from './DCardSectionTitle.vue';

export default defineComponent({
  components: {
    DCardSectionTitle,
  },
  props: {
    title: {
      type: String,
      default: '',
    },
    titleSeparator: {
      type: Boolean,
      default: false,
    },
    withGutter: {
      type: Boolean,
      default: true,
    },
  },
  setup(props) {
    const computedState = {};

    return { props, computedState };
  },
});
</script>
