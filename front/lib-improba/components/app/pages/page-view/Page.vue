<template>
  <q-page class="col column bg-primary-lowest text-text">
    <div :class="computedState.myClass" style="overflow: auto">
      <div class="col" style="display: flex; flex-wrap: wrap">
        <div style="flex: 1 0 100%">
          <slot> </slot>
        </div>
      </div>
    </div>
  </q-page>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';

export default defineComponent({
  props: {
    padding: { type: Boolean, default: false },
  },
  setup(props) {
    const computedState = reactive({
      myClass: computed(
        () => `col fit column ${props.padding ? 'q-pa-md ' : ''}`
      ),
    });

    return { computedState, props };
  },
});
</script>
