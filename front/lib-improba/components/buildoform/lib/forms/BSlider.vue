<template>
  <FormLayout>
    <q-slider
      v-bind="props.bind"
      :label="!!props.bind?.label"
      v-model="state.modelValue"
    >
    </q-slider>
  </FormLayout>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';

import { FormLayout } from './layouts/index';

export default defineComponent({
  props: {
    modelValue: {
      type: Number,
      required: true,
    },
    bind: {
      type: Object,
    },
  },
  emits: ['update:modelValue'],
  components: {
    FormLayout,
  },
  setup(props, { emit }) {
    const stateless = {};

    const state = reactive({
      modelValue: props.modelValue,
    });

    const methods = {};

    const computedState = {};

    watch(
      () => state.modelValue,
      (v: any) => {
        emit('update:modelValue', v);
      }
    );

    onMounted(() => {});

    return {
      props,
      stateless,
      state,
      methods,
      computedState,
    };
  },
});
</script>
