<template>
  <DSelect
    emit-value
    map-options
    v-model="queryParamSearch.state.filterValues[stateless.queryParamName]"
    :options="stateless.options"
  />
</template>

<script lang="ts">
import { defineComponent, onMounted, onUnmounted, reactive, watch } from 'vue';
import { useQueryParamSearch } from '@lib-improba/composables/use-query-param-search';

const queryParamName = 'filterUserRole';

export default defineComponent({
  props: {
    modelValue: {
      type: String,
    },
  },
  emits: ['update:modelValue'],
  setup(props, context) {
    const queryParamSearch = useQueryParamSearch([queryParamName]);

    const stateless = {
      queryParamName,
      options: [
        { value: null, label: 'All' },
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' },
      ],
    };

    watch(
      () => queryParamSearch.state.filterValues,
      (newValues) => {
        context.emit('update:modelValue', newValues[queryParamName]);
      }, {
        deep: true,
      }
    );

    return {
      stateless,
      queryParamSearch,
    };
  },
});
</script>
