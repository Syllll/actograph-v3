<template>
  <DSelect
    emit-value
    map-options
    v-model="queryParamSearch.state.filterValues[queryParamName]"
    :options="roleFilterOptions"
  />
</template>

<script lang="ts">
import { defineComponent, computed, watch } from 'vue';
import { useQueryParamSearch } from '@lib-improba/composables/use-query-param-search';
import { useI18n } from 'vue-i18n';

const queryParamName = 'filterUserRole';

export default defineComponent({
  props: {
    modelValue: {
      type: [String, null] as unknown as () => string | null,
      default: null,
    },
  },
  emits: ['update:modelValue'],
  setup(props, context) {
    const queryParamSearch = useQueryParamSearch([queryParamName]);
    const { t } = useI18n();

    const roleFilterOptions = computed(() => [
      { value: null, label: t('adminUsers.roleFilterAll') },
      { value: 'admin', label: t('adminUsers.roleFilterAdmin') },
      { value: 'user', label: t('adminUsers.roleFilterUser') },
    ]);

    watch(
      () => queryParamSearch.state.filterValues,
      (newValues) => {
        context.emit('update:modelValue', newValues[queryParamName]);
      },
      {
        deep: true,
      }
    );

    return {
      queryParamName,
      roleFilterOptions,
      queryParamSearch,
    };
  },
});
</script>
