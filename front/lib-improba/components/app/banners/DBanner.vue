<template>
  <q-banner class="text-text" rounded>
    <slot>{{ props.label }}</slot>
  </q-banner>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from 'vue';

export default defineComponent({
  props: {
    label: {
      type: String,
      required: false,
    },
  },
  setup(props) {
    return {
      props,
    };
  },
});
</script>
