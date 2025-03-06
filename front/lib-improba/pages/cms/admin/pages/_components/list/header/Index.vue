<template>
  <div class="row q-gutter-x-sm">
    <DSearchInput
      :modelValue="$props.modelValue"
      @update:modelValue="$emit('update:modelValue', $event)"
      style="width: 20rem"
    />

    <DSubmitBtn
      icon="add"
      label="Ajouter une page"
      @click="state.triggerOpenAddPageModal = true"
    >
      <AddModal
        v-model:triggerOpen="state.triggerOpenAddPageModal"
        @created="$emit('reload')"
      />
    </DSubmitBtn>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, reactive } from 'vue';
import AddModal from './../../add-modal/Index.vue';

export default defineComponent({
  components: {
    AddModal,
  },
  props: {
    modelValue: {
      type: String,
      required: false,
    },
  },
  emits: ['update:modelValue', 'reload'],
  setup() {
    const stateless = {};
    const state = reactive({
      triggerOpenAddPageModal: false,
    });
    return { stateless, state };
  },
});
</script>
