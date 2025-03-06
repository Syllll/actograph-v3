<template>
  <q-drawer :class="`${props.class ?? 'bg-drawer'}`">
    <slot> </slot>
  </q-drawer>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  props: {
    class: {
      type: String,
      required: false,
    },
  },
  setup(props) {
    return { props };
  },
});
</script>
