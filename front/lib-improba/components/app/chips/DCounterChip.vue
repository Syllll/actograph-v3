<template>
  <DChip rounded :color="computedState.bgColor">
    <span class="text-bold text-h2">{{ props.count }}</span>
    <span v-if="props.message" class="q-ml-sm">{{ props.message }}</span>
  </DChip>
</template>

<script lang="ts">
import { defineComponent, computed, reactive } from 'vue';

export default defineComponent({
  props: {
    count: { type: Number, required: true },
    message: { type: String, default: '' },
  },
  setup(props) {
    const computedState = reactive({
      bgColor: computed(() =>
        props.count > 0 ? 'success-medium' : 'danger-medium'
      ),
    });

    return { props, computedState };
  },
});
</script>
