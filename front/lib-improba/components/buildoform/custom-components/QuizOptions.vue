<template>
  <FormLayout :title="$props.label">
    <template
      v-for="([slotKey], index) in Object.entries($slots)"
      :key="index"
      v-slot:[slotKey]="scope"
    >
      <slot v-if="$slots[slotKey]" :name="slotKey" v-bind="{ ...scope }"></slot>
    </template>

    <div class="row">
      <div
        class="col q-pa-md"
        v-for="(option, index) in $props.options"
        :key="index"
      >
        <q-btn
          dense
          class="fit q-pa-lg rounded"
          :class="{
            'border-accent border-thin': props.modelValue === option.value,
            'border-neutral border-thiner': props.modelValue !== option.value,
          }"
          @click="$emit('update:modelValue', option.value)"
        >
          {{ option.label }}
        </q-btn>
      </div>
    </div>
  </FormLayout>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, watch } from 'vue';
import { FormLayout } from '@lib-improba/components/buildoform/lib/forms/layouts/index';

export default defineComponent({
  props: {
    modelValue: {
      type: Number,
    },
    label: {
      type: String,
    },
    options: {
      type: Object,
    },
  },
  components: { FormLayout },
  emits: ['update:modelValue'],
  setup(props) {
    const stateless = {};

    const state = reactive({});

    const methods = {};

    const computedState = {};

    watch(
      () => state,
      (v: any) => {
        if (v) {
          // do something
        }
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
