<template>
  <div>
    <DBtn
      v-if="!props.hideLine"
      icon="mdi-chart-line"
      size="sm"
      text-color="d-text"
      :color="props.modelValue === 'line' ? 'd-selected' : 'background'"
      @click="$emit('update:modelValue', 'line')"
    />
    <DBtn
      icon="mdi-chart-histogram"
      size="sm"
      text-color="d-text"
      :color="props.modelValue === 'columns' ? 'd-selected' : 'background'"
      @click="$emit('update:modelValue', 'columns')"
    />
    <DBtn
      icon="mdi-table"
      size="sm"
      text-color="d-text"
      :color="props.modelValue === 'table' ? 'd-selected' : 'background'"
      @click="$emit('update:modelValue', 'table')"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    hideLine: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, context) {
    return {
      props,
    };
  },
});
</script>
