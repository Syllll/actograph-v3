<template>
  <q-step v-bind="$attrs" :name="props.name" :title="props.title || ''">
    <slot></slot>
  </q-step>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  inheritAttrs: false,
  props: {
    name: {
      type: [String, Number] as any,
      default: undefined,
    },
    title: {
      type: String,
      default: undefined,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
