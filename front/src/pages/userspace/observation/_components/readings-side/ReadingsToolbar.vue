<template>
  <div class="readings-toolbar q-pb-md">
    <div class="col-auto observation-panel-title-row row items-center q-mb-sm dashboard-header">
      <div class="col text-h6 dashboard-title">{{ $t('readingsUi.toolbarTitle') }}</div>
    </div>

    <div
      class="observation-toolbar-row observation-toolbar-row--nowrap justify-between"
      :class="state.showReplace ? 'items-start' : 'items-center'"
    >
      <div class="readings-search col-auto q-mr-sm" :class="{ 'readings-search--open': state.showReplace }">
        <div class="readings-search__main">
          <div class="readings-search__fields">
            <q-input
              ref="searchInputRef"
              :modelValue="search"
              borderless
              dense
              hide-bottom-space
              :placeholder="$t('readingsUi.searchReadingsPlaceholder')"
              clearable
              class="readings-search__field"
              @update:model-value="onSearchInput"
              @clear="onSearchClear"
              @keydown="onSearchKeydown"
            >
              <template v-slot:prepend>
                <q-icon name="search" size="xs" class="readings-search__lead" />
              </template>
            </q-input>

            <q-input
              v-if="state.showReplace"
              v-model="state.replaceValue"
              borderless
              dense
              hide-bottom-space
              class="readings-search__field"
              :placeholder="$t('readingsUi.replaceByPlaceholder')"
              :aria-label="$t('readingsUi.replaceByPlaceholder')"
              clearable
            >
              <template v-slot:prepend>
                <span class="readings-search__lead" aria-hidden="true" />
              </template>
            </q-input>
          </div>

          <q-btn
            flat
            dense
            round
            size="sm"
            class="readings-search__toggle"
            icon="mdi-find-replace"
            :color="state.showReplace ? 'accent' : 'grey-7'"
            :aria-label="$t('readingsUi.findReplaceTooltip')"
            :aria-expanded="state.showReplace ? 'true' : 'false'"
            @click="toggleReplace"
          >
            <q-tooltip>{{ $t('readingsUi.findReplaceTooltip') }}</q-tooltip>
          </q-btn>
        </div>

        <div v-if="state.showReplace" class="readings-search__footer">
          <span v-if="search" class="text-caption text-grey-7 no-wrap">
            {{ $t('readingsUi.matchCountFound', { count: matchCount }) }}
          </span>
          <q-btn
            unelevated
            no-caps
            dense
            rounded
            color="accent"
            text-color="white"
            size="sm"
            :label="$t('readingsUi.replaceAll')"
            :disable="!search || !state.replaceValue"
            @click="$emit('replace-all', { search: search, replace: state.replaceValue })"
          />
        </div>
      </div>

      <div class="row q-gutter-sm items-center col readings-toolbar__actions">
        <q-btn
          color="primary"
          icon="add"
          :disable="isAddDisabled"
          @click="$emit('add-reading')"
          flat
          round
          dense
          class="readings-toolbar__action"
        >
          <q-tooltip>{{ $t('readingsUi.addReadingTooltip') }}</q-tooltip>
        </q-btn>

        <q-btn
          color="primary"
          icon="mdi-comment-text-outline"
          @click="$emit('add-comment')"
          flat
          round
          dense
          class="readings-toolbar__action"
        >
          <q-tooltip>{{ $t('readingsUi.addCommentTooltip') }}</q-tooltip>
        </q-btn>

        <q-btn
          color="accent"
          icon="auto_fix_high"
          @click="$emit('auto-correct-readings')"
          flat
          round
          dense
          class="readings-toolbar__action"
        >
          <q-tooltip>{{ $t('readingsUi.autoCorrectTooltip') }}</q-tooltip>
        </q-btn>

        <q-btn
          v-if="canActivateChronometerMode"
          color="primary"
          icon="timer"
          :label="$t('readingsUi.chronometerModeButton')"
          @click="$emit('activate-chronometer-mode')"
          flat
          dense
        >
          <q-tooltip>{{ $t('readingsUi.chronometerModeButtonTooltip') }}</q-tooltip>
        </q-btn>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, ref, onMounted, onBeforeUnmount } from 'vue';
import type { QInput } from 'quasar';

export default defineComponent({
  name: 'ReadingsToolbar',
  
  props: {
    search: {
      type: String,
      default: '',
    },
    matchCount: {
      type: Number,
      default: 0,
    },
    isAddDisabled: {
      type: Boolean,
      default: false,
    },
    canActivateChronometerMode: {
      type: Boolean,
      default: false,
    },
  },
  
  emits: [
    'update:search',
    'add-reading',
    'add-comment',
    'activate-chronometer-mode',
    'auto-correct-readings',
    'replace-all',
  ],

  setup(_, { emit }) {
    const searchInputRef = ref<QInput | null>(null);
    const state = reactive({
      showReplace: false,
      replaceValue: '',
    });

    const onSearchInput = (value: string | number | null) => {
      emit('update:search', String(value ?? ''));
    };
    
    const onSearchClear = () => {
      emit('update:search', '');
    };

    const toggleReplace = () => {
      state.showReplace = !state.showReplace;
    };

    // Recueil O.7: Cmd/Ctrl+F focuses the search field (filter), and opens replace.
    const onSearchKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        state.showReplace = true;
        searchInputRef.value?.focus();
      }
    };

    // Global Cmd/Ctrl+F so the shortcut works without the field being focused
    // first (matches standard find-in-page UX). Ignores inputs that are not
    // the search field (let the user type freely in other fields).
    const onGlobalFindKeydown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'f') {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (target && target !== searchInputRef.value?.$el) {
        const tag = target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
          return;
        }
      }
      event.preventDefault();
      state.showReplace = true;
      searchInputRef.value?.focus();
    };

    onMounted(() => {
      window.addEventListener('keydown', onGlobalFindKeydown);
    });

    onBeforeUnmount(() => {
      window.removeEventListener('keydown', onGlobalFindKeydown);
    });
    
    return {
      searchInputRef,
      state,
      onSearchInput,
      onSearchClear,
      onSearchKeydown,
      toggleReplace,
    };
  },
});
</script>

<style scoped lang="scss">
.observation-panel-title-row {
  min-height: 32px;
  flex-wrap: nowrap;
}

.dashboard-header {
  flex-wrap: nowrap;
}

.dashboard-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.readings-search {
  min-width: 16rem;
  max-width: 22rem;
  box-sizing: border-box;
  height: var(--observation-toolbar-h);
  border: 1px solid var(--neutral-low);
  border-radius: 0.5rem;
  background: var(--secondary);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 0;
}

.readings-search--open {
  height: auto;
  max-width: 26rem;
}

.readings-search--open,
.readings-search:focus-within {
  border-color: var(--accent);
}

.readings-search__main {
  display: flex;
  align-items: center;
  min-width: 0;
  height: calc(var(--observation-toolbar-h) - 2px);
  min-height: calc(var(--observation-toolbar-h) - 2px);
}

.readings-search--open .readings-search__main {
  height: auto;
  min-height: calc(var(--observation-toolbar-h) - 2px);
}

.readings-search__fields {
  flex: 1;
  min-width: 0;
}

.readings-search__lead {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.readings-search__toggle.q-btn {
  flex-shrink: 0;
  width: 24px !important;
  height: 24px !important;
  min-height: 24px !important;
  min-width: 24px !important;
  padding: 0 !important;
  margin-right: 0.25rem;
}

/* Quasar dense field is 40px; force the same 32px outer box as Rec/Terminer. */
.readings-search__field {
  height: calc(var(--observation-toolbar-h) - 2px);
}

.readings-search__field :deep(.q-field__inner),
.readings-search__field :deep(.q-field__control) {
  height: calc(var(--observation-toolbar-h) - 2px) !important;
  min-height: calc(var(--observation-toolbar-h) - 2px) !important;
  max-height: calc(var(--observation-toolbar-h) - 2px) !important;
}

.readings-search__field :deep(.q-field__control) {
  padding: 0 0.5rem;
}

.readings-search__field :deep(.q-field__marginal) {
  height: calc(var(--observation-toolbar-h) - 2px) !important;
  min-height: calc(var(--observation-toolbar-h) - 2px) !important;
}

.readings-search__field :deep(.q-field__native),
.readings-search__field :deep(.q-field__input) {
  height: calc(var(--observation-toolbar-h) - 2px) !important;
  min-height: calc(var(--observation-toolbar-h) - 2px) !important;
  line-height: calc(var(--observation-toolbar-h) - 2px) !important;
  padding: 0;
}

.readings-search__field :deep(.q-field__bottom) {
  display: none;
}

.readings-toolbar__actions {
  height: var(--observation-toolbar-h);
}

.readings-toolbar__action.q-btn {
  width: var(--observation-toolbar-h);
  height: var(--observation-toolbar-h);
  min-height: var(--observation-toolbar-h);
  min-width: var(--observation-toolbar-h);
  max-height: var(--observation-toolbar-h);
  padding: 0;
}

.readings-search__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem 0.5rem;
  border-top: 1px solid var(--neutral-low);
}
</style>
