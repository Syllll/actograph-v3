<template>
  <div class="col-auto row full-width justify-center q-pt-lg text-h6">
    {{ props.name }}
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    name: {
      type: String,
      default: '',
    },
  },
  emits: [],
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
