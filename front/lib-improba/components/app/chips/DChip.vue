<template>
  <q-chip
    class="q-px-sm"
    :ripple="false"
    :style="{ fontSize: computedState.fontSize.value }"
  >
    <slot> {{ props.label }} </slot>
  </q-chip>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue';

export default defineComponent({
  props: {
    size: {
      type: [String, Boolean],
      default: false,
    },
    label: {
      type: String,
      default: '',
    },
  },
  setup(props) {
    const computedState = {
      fontSize: computed(() => {
        if (!props.size) return '0.95em';
        if (props.size === 'sm') return '0.87em';
        if (props.size === 'lg') return '1.1em';
        else return props.size;
      }),
    };
    return { computedState, props };
  },
});
</script>
