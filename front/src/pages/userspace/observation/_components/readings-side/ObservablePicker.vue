<template>
  <div ref="pickerRef" class="observable-picker"
    :style="{ '--observable-picker-width': `${Math.min(44, Math.max(12, filteredGroups.length * 11))}rem` }"
    @keydown="onKeydown">
    <div v-if="filteredGroups.length" class="observable-picker__columns">
      <section v-for="group in filteredGroups" :key="group.id" class="observable-picker__category">
        <div class="observable-picker__title" :title="group.name">
          <span class="observable-picker__dot" :style="{ backgroundColor: group.color }" aria-hidden="true" />
          {{ group.name }}
        </div>
        <button
          v-for="name in group.names" :key="name"
          type="button" v-close-popup class="observable-picker__option"
          :class="{ 'observable-picker__option--selected': modelValue === name }"
          :aria-pressed="modelValue === name"
          :data-observable-option="name" :title="name"
          @click="$emit('select', name)"
        >
          <span>{{ name }}</span>
          <q-icon v-if="modelValue === name" name="check" size="xs" aria-hidden="true" />
        </button>
        <div v-if="!group.names.length" class="observable-picker__empty">{{ t('readingsUi.emptyCategory') }}</div>
      </section>
    </div>
    <div v-else class="observable-picker__empty" role="status">{{ t('readingsUi.freeLabelAutocompleteHint') }}</div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, PropType, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { filterObservableCategories, type ObservableCategory } from './observable-categories';

export default defineComponent({
  name: 'ObservablePicker',
  props: {
    groups: { type: Array as PropType<ObservableCategory[]>, required: true },
    modelValue: { type: String, default: '' },
    search: { type: String, default: '' },
  },
  emits: ['select'],
  setup(props, { expose }) {
    const { t } = useI18n();
    const pickerRef = ref<HTMLElement | null>(null);
    const filteredGroups = computed(() => filterObservableCategories(props.groups, props.search));
    const buttons = () => Array.from(pickerRef.value?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const focusFirst = () => buttons()[0]?.focus();
    const onKeydown = (event: KeyboardEvent) => {
      if (!['ArrowDown', 'ArrowUp', 'ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
      const options = buttons();
      const current = options.indexOf(event.target as HTMLButtonElement);
      if (current < 0) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : (current + (['ArrowUp', 'ArrowLeft'].includes(event.key) ? -1 : 1) + options.length) % options.length;
      options[next]?.focus();
    };
    expose({ focusFirst });
    return { t, pickerRef, filteredGroups, onKeydown, focusFirst };
  },
});
</script>

<style scoped>
.observable-picker {
  width: min(var(--observable-picker-width, 44rem), calc(100vw - 32px));
  max-width: 100%;
  max-height: min(28rem, 65vh);
  overflow: auto;
  padding: 8px;
  color: var(--text);
  background: var(--secondary);
}
.observable-picker__columns {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(10rem, 100%), 1fr));
  gap: 12px;
}
.observable-picker__category { min-width: 0; }
.observable-picker__title { display: flex; align-items: center; gap: 6px; padding: 6px; font-weight: 700; overflow-wrap: anywhere; }
.observable-picker__dot { flex: 0 0 8px; height: 8px; border-radius: 50%; }
.observable-picker__option { display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%; min-height: 32px; padding: 6px; border: 0; border-radius: 4px; text-align: left; font: inherit; color: inherit; background: transparent; cursor: pointer; overflow-wrap: anywhere; }
.observable-picker__option:hover, .observable-picker__option--selected { background: var(--button-rest-bg); }
.observable-picker__option:focus-visible { outline: 2px solid var(--accent); outline-offset: -2px; }
.observable-picker__empty { padding: 6px; font-size: 0.85em; opacity: 0.8; }
@media (max-width: 480px) { .observable-picker__columns { grid-template-columns: minmax(0, 1fr); } }
</style>
