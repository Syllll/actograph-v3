<template>
  <div class="row q-gutter-x-sm">
    <DSearchInput
      :modelValue="$props.searchText"
      @update:modelValue="$emit('update:searchText', $event)"
      style="width: 20rem"
    />
    <DSelect
      :modelValue="$props.type"
      @update:modelValue="$emit('update:type', $event)"
      clearable
      emit-value
      :options="[
        {
          label: 'Layout',
          value: 'layout',
        },
      ]"
    />

    <DSubmitBtn
      icon="add"
      label="Ajouter un bloc"
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
import DSelect from '@lib-improba/components/app/select/DSelect.vue';

export default defineComponent({
  components: {
    AddModal,
  },
  props: {
    searchText: {
      type: String,
      required: false,
    },
    type: {
      type: String,
      required: false,
    },
  },
  emits: ['update:searchText', 'update:type', 'reload'],
  setup() {
    const stateless = {};
    const state = reactive({
      triggerOpenAddPageModal: false,
    });
    return { stateless, state };
  },
});
</script>
