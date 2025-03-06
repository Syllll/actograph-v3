<template>
  <q-editor
    rounded
    dense
    :modelValue="internalModelValue"
    @update:modelValue="updateModelValue"
    :toolbar="[
      ['left', 'center', 'right', 'justify'],
      ['bold', 'italic', 'underline', 'strike'],
      ['link', 'quote', 'unordered', 'ordered'],
    ]"
    class="bg-pb-editor-background-80 text-pb-editor-text"
    content-class="pb-editor-primary"
    toolbar-text-color="pb-editor-text"
    toolbar-toggle-color="pb-editor-accent"
    toolbar-bg="pb-editor-secondary-80"
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
<style lang="scss" scoped>
.q-editor.q-editor--default {
  border: 1px solid #858eab;
}
</style>

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
