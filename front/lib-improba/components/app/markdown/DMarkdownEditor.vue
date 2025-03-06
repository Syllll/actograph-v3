<template>
  <q-editor
    :modelValue="internalModelValue"
    :toolbar="props.toolbar"
    @update:modelValue="updateModelValue"
  />
</template>

<script>
import { defineComponent, ref, watch } from 'vue';

export default defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
      required: true,
    },
    toolbar: {
      type: Array,
      default: () => null,
    },
  },
  emits: ['update:modelValue'],
  setup(props, context) {
    const internalModelValue = ref(props.modelValue);

    const updateModelValue = (newValue) => {
      internalModelValue.value = newValue;
      context.emit('update:modelValue', newValue);
    };

    watch(
      () => props.modelValue,
      (newValue) => {
        internalModelValue.value = newValue;
      }
    );

    return {
      internalModelValue,
      props,
      updateModelValue,
    };
  },
});
</script>

<!-- code d'origine
  <template>
  <q-editor
    v-model="props.modelValue"
    :toolbar="props.toolbar"
    @update:modelValue="emit('update:modelValue', $event)"
  />
</template>

<script>
import { defineComponent } from 'vue';

export default defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
      require: true,
    },
    toolbar: {
      type: Array,
      default: () => null,
    },
  },
  emits: ['update:modelValue'],
  setup(props, context) {
    return {
      props,
      emit: context.emit,
    };
  },
});
</script> -->
