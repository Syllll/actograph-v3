<template>
  <q-expansion-item :label="props.label">
    <template
      v-for="([slotKey], index) in Object.entries($slots)"
      :key="index"
      v-slot:[slotKey]="scope"
    >
      <slot v-if="$slots[slotKey]" :name="slotKey" v-bind="{ ...scope }"></slot>
    </template>
  </q-expansion-item>
</template>
<script lang="ts">
import { defineComponent, PropType } from 'vue';

export default defineComponent({
  components: {},
  props: {
    label: {
      type: String,
    },
    content: {
      type: String,
    },
  },
  setup(props, context) {
    const methods = {};

    return {
      props,
      methods,
    };
  },
});
</script>
