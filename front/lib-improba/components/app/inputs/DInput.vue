<template>
  <q-input
    ref="inputRef"
    class="text-text"
    dense
    :modelValue="props.modelValue"
    color="accent-medium"
    @update:modelValue="emit('update:modelValue', $event)"
  >
    <slot> </slot>
    <template v-slot:prepend>
      <div class="q-pl-xs text-body2">
        <slot name="prepend"> </slot>
      </div>
    </template>
    <template v-slot:append>
      <div class="q-pl-xs text-body2">
        <slot name="append"> </slot>
      </div>
    </template>
  </q-input>
</template>
<script lang="ts">
import { defineComponent, reactive, ref } from 'vue';
export default defineComponent({
  components: {},
  props: {
    modelValue: {
      required: true,
    },
    removable: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue'],
  setup(props, context) {
    const inputRef = ref<any>(null);
    return {
      inputRef,
      props,
      emit: context.emit,
    };
  },
});
</script>
<style scoped lang="scss">
.q-field {
  &:deep() {
    .q-field__label {
      color: var(--text);
    }

    /*   .q-field__control, */
    /*   .q-field__marginal { */
    /*     height: 30px !important; */
    /*     padding: 0 !important; */
    /*   } */
  }
}
</style>
