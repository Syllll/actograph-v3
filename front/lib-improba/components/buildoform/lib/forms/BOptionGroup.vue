<template>
  <FormLayout>
    <q-option-group
      v-model="state.modelValue"
      v-bind="computedState.vbind.value"
    />
  </FormLayout>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';

import { FormLayout } from './layouts/index';
import { computed } from 'vue';

export default defineComponent({
  props: {
    modelValue: {
      type: String,
      required: true,
    },
    bind: {
      type: Object,
    },
    options: {
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

    const computedState = {
      vbind: computed(() => {
        const bind = {
          ...props.bind,
        };
        if (props.options) {
          bind['options'] = props.options;
        }

        return bind;
      }),
    };

    watch(
      () => props.modelValue,
      (v: any) => {
        if (v !== state.modelValue) {
          state.modelValue = v;
        }
      }
    );

    watch(
      () => state.modelValue,
      (v: any) => {
        if (v !== props.modelValue) {
          emit('update:modelValue', v);
        }
      }
    );

    onMounted(() => {
      // do something
    });

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
