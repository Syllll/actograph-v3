<template>
  <div class="row q-ma-md">
    <DBtn
      dense
      no-caps
      size="md"
      icon="chevron_left"
      class="col-auto"
      @click="emit('return')"
    >
      Revenir à la liste
    </DBtn>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  emits: ['return'],
  setup(props, { emit }) {
    return { props, emit };
  },
});
</script>
