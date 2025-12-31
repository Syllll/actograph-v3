<template>
  <q-file
    dense
    rounded
    hide-bottom-space
    color="text"
    bottom-slots
    :modelValue="props.modelValue"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <d-tooltip v-if="props.tooltip"> {{ props.tooltip }} </d-tooltip>
    <slot></slot>
    <template v-slot:append>
      <q-icon
        name="close"
        @click.stop.prevent="emit('update:modelValue', null)"
        class="cursor-pointer"
      />
    </template>
  </q-file>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  components: {},
  props: {
    tooltip: {
      type: String,
    },
    modelValue: {
      type: [Array, Object, FileList, File, null] as any,
      default: null,
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    return {
      props,
      emit,
    };
  },
});
</script>
