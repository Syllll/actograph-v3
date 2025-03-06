<template>
  <!-- TODO: verify :value vs :model-value -->
  <!-- :value="props.searchText" -->
  <PBInput
    ref="inputRef"
    class="text-text"
    dense
    filled
    :placeholder="props.placeholder"
    :debounce="300"
    :model-value="props.searchText"
    @update:model-value="emit('update:searchText', $event)"
  >
    <template v-slot:prepend>
      <PBSearchIcon size="sm" />
    </template>
  </PBInput>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, ref } from 'vue';

import PBInput from './PBInput.vue';
import PBSearchIcon from '../icons/PBSearchIcon.vue';

export default defineComponent({
  props: {
    placeholder: {
      type: String,
      default: '',
    },
    searchText: {
      type: String,
      default: '',
    },
  },
  components: {
    PBInput,
    PBSearchIcon,
  },
  emits: ['update:searchText'],
  setup(props, context) {
    const inputRef = ref<any>(null);

    const state = reactive({});

    return {
      props,
      state,
      emit: context.emit,
      inputRef,
    };
  },
});
</script>
