<template>
  <q-linear-progress
    rounded
    size="2rem"
    :value="props.value"
    color="accent-higher"
  >
    <div class="absolute-full flex flex-center">
      <slot>
        <q-badge
          class="q-pa-xs"
          color="white"
          text-color="accent-medium"
          :label="props.label"
        />
      </slot>
    </div>
  </q-linear-progress>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    label: {
      type: String,
      default: '',
    },
    value: {
      type: Number,
      default: 0,
    },
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
