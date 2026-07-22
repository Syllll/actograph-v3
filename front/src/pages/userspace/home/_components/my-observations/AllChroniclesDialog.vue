<template>
  <q-dialog v-model="localShow" class="actograph-dialog" @hide="methods.handleHide">
    <q-card class="q-dialog-plugin d-dialog-card d-dialog-card--wide all-chronicles-dialog column">
      <q-card-section class="col-auto row items-center q-pb-none">
        <div class="text-h5 text-weight-bold">
          {{ $t('observationsList.dialogTitle') }}
        </div>
        <q-space />
        <q-btn icon="close" flat round dense @click="methods.handleHide" />
      </q-card-section>

      <q-card-section class="col-auto q-pb-none">
        <div class="text-caption text-grey-7 q-mb-sm">
          {{ $t('observationsList.localMetaHelper') }}
        </div>
        <div class="row items-center q-gutter-sm q-mb-sm">
          <DSearchInput
            class="col"
            v-model:searchText="state.searchText"
            :placeholder="$t('observationsList.searchPlaceholder')"
            @update:searchText="methods.handleSearch"
          />
          <q-select
            v-model="state.sortField"
            :options="sortOptions"
            :label="$t('observationsList.sortBy')"
            dense
            outlined
            emit-value
            map-options
            class="col-auto"
            style="min-width: 220px"
            @update:model-value="methods.triggerReload"
          />
        </div>
        <div class="row items-center q-gutter-sm">
          <q-toggle
            v-model="state.includeArchived"
            dense
            :label="$t('observationsList.showArchived')"
            @update:model-value="methods.triggerReload"
          />
          <q-select
            v-model="state.filterUsedFor"
            :options="usedForFilterOptions"
            :label="$t('observationsList.filterUsedFor')"
            dense
            outlined
            multiple
            use-chips
            emit-value
            map-options
            clearable
            class="col"
            style="min-width: 200px"
          />
          <q-select
            v-model="state.filterIsProtocol"
            :options="protocolFilterOptions"
            :label="$t('observationsList.filterProtocol')"
            dense
            outlined
            emit-value
            map-options
            clearable
            class="col-auto"
            style="min-width: 180px"
          />
        </div>
      </q-card-section>

      <q-card-section class="col q-pt-sm" style="min-height: 0">
        <q-table
          class="fit virtual-table"
          flat
          dense
          :rows="displayedRows"
          :columns="tableColumns"
          row-key="id"
          virtual-scroll
          :virtual-scroll-sticky-size-start="40"
          table-style="max-height: 100%"
          :rows-per-page-options="[0]"
          hide-pagination
          hide-bottom
          :loading="state.loading"
          :row-class="methods.rowClass"
          @row-click="methods.handleRowClick"
        >
          <template v-slot:body-cell-name="cellProps">
            <q-td :props="cellProps" class="cursor-pointer">
              <div class="row items-center no-wrap">
                <q-icon
                  v-if="methods.isActive(cellProps.row.id)"
                  name="mdi-check-circle"
                  color="positive"
                  size="xs"
                  class="q-mr-sm"
                />
                <q-icon
                  v-if="methods.isProtocol(cellProps.row)"
                  name="mdi-star"
                  color="amber-8"
                  size="xs"
                  class="q-mr-xs"
                />
                <span
                  :class="{ 'text-weight-bold text-primary': methods.isActive(cellProps.row.id) }"
                >
                  {{ cellProps.row.name }}
                </span>
              </div>
            </q-td>
          </template>

          <template v-slot:body-cell-mode="cellProps">
            <q-td :props="cellProps">
              <q-chip
                :label="methods.formatMode(cellProps.row.mode)"
                dense
                size="sm"
                :color="cellProps.row.mode === 'chronometer' ? 'blue-2' : 'orange-2'"
                :text-color="cellProps.row.mode === 'chronometer' ? 'blue-9' : 'orange-9'"
              />
            </q-td>
          </template>

          <template v-slot:body-cell-localMeta="cellProps">
            <q-td :props="cellProps" @click.stop>
              <ChronicleLocalMetaCell
                :observation="cellProps.row"
                @updated="methods.onLocalMetaUpdated"
              />
            </q-td>
          </template>

          <template v-slot:body-cell-updatedAt="cellProps">
            <q-td :props="cellProps">
              {{ methods.formatDate(cellProps.row.updatedAt) }}
            </q-td>
          </template>

          <template v-slot:no-data>
            <div class="full-width column items-center q-pa-lg text-neutral-high">
              <q-icon name="mdi-magnify" size="48px" class="q-mb-md" />
              <div class="text-body1">{{ $t('observationsList.noResults') }}</div>
            </div>
          </template>
        </q-table>
      </q-card-section>

      <q-card-section class="col-auto q-pt-none">
        <div class="row items-center justify-between">
          <div class="text-body2 text-neutral-high">
            {{ displayedCount }}
            {{
              displayedCount === 1
                ? $t('observationsList.chronicleWordSingular')
                : $t('observationsList.chronicleWordPlural')
            }}
            <span v-if="displayedCount !== state.totalCount" class="text-grey-6">
              ({{ state.totalCount }} {{ $t('observationsList.totalLoaded') }})
            </span>
          </div>
          <q-btn
            flat
            :label="$t('observationsList.close')"
            color="primary"
            @click="methods.handleHide"
          />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { useAppResume } from 'src/composables/use-app-resume';
import { observationService } from '@services/observations/index.service';
import {
  getEffectiveLocalMeta,
  IObservation,
  ObservationLocalMetaUsedFor,
  OBSERVATION_LOCAL_META_USED_FOR_VALUES,
} from '@services/observations/interface';
import { DSearchInput } from '@lib-improba/components/app/inputs';
import { useObservation } from 'src/composables/use-observation';
import { relativeDay } from '@lib-improba/utils/date-format.utils';
import ChronicleLocalMetaCell from './ChronicleLocalMetaCell.vue';

export default defineComponent({
  name: 'AllChroniclesDialog',
  components: {
    DSearchInput,
    ChronicleLocalMetaCell,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'selected', 'hide'],
  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();
    const { t, locale } = useI18n();

    const tableColumns = computed(() => {
      void locale.value;
      return [
        {
          name: 'name',
          align: 'left' as const,
          label: t('observationsList.colName'),
          field: 'name',
          style: 'min-width: 180px',
        },
        {
          name: 'mode',
          align: 'center' as const,
          label: t('observationsList.colMode'),
          field: 'mode',
          style: 'width: 120px',
        },
        {
          name: 'localMeta',
          align: 'left' as const,
          label: t('observationsList.colLocalMeta'),
          field: 'localMeta',
        },
        {
          name: 'updatedAt',
          align: 'left' as const,
          label: t('observationsList.colUpdatedAt'),
          field: 'updatedAt',
          style: 'width: 140px',
        },
      ];
    });

    const sortOptions = computed(() => {
      void locale.value;
      return [
        { label: t('observationsList.sortUpdatedAt'), value: 'updatedAt' },
        { label: t('observationsList.sortName'), value: 'name' },
        { label: t('observationsList.sortCreatedAt'), value: 'createdAt' },
      ];
    });

    const usedForFilterOptions = computed(() => {
      void locale.value;
      return OBSERVATION_LOCAL_META_USED_FOR_VALUES.map((value) => ({
        label: t(`observationsList.localMetaUsedFor.${value}`),
        value,
      }));
    });

    const protocolFilterOptions = computed(() => {
      void locale.value;
      return [
        { label: t('observationsList.filterProtocolOnly'), value: true },
        { label: t('observationsList.filterProtocolExclude'), value: false },
      ];
    });

    const state = reactive({
      rows: [] as IObservation[],
      loading: false,
      searchText: '',
      sortField: 'updatedAt',
      totalCount: 0,
      includeArchived: false,
      filterUsedFor: [] as ObservationLocalMetaUsedFor[],
      filterIsProtocol: null as boolean | null,
      searchDebounceTimeout: null as NodeJS.Timeout | null,
    });

    const displayedRows = computed(() => {
      return state.rows.filter((row) => {
        const meta = getEffectiveLocalMeta(row);

        if (state.filterIsProtocol !== null && meta.isProtocol !== state.filterIsProtocol) {
          return false;
        }

        if (state.filterUsedFor.length > 0) {
          const hasAny = state.filterUsedFor.some((tag) => meta.usedFor.includes(tag));
          if (!hasAny) {
            return false;
          }
        }

        return true;
      });
    });

    const displayedCount = computed(() => displayedRows.value.length);

    let fetchGeneration = 0;

    const localShow = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value),
    });

    const methods = {
      handleSearch() {
        if (state.searchDebounceTimeout) {
          clearTimeout(state.searchDebounceTimeout);
        }
        state.searchDebounceTimeout = setTimeout(() => {
          methods.fetchAll();
        }, 300);
      },

      triggerReload() {
        methods.fetchAll();
      },

      async fetchAll(options?: { silent?: boolean }) {
        const generation = ++fetchGeneration;
        const silent = options?.silent === true;
        if (!silent) {
          state.loading = true;
        }
        try {
          const response = await observationService.findWithPagination(
            {
              limit: 500,
              offset: 0,
              orderBy: state.sortField,
              order: 'DESC',
            },
            {
              searchString: state.searchText || undefined,
              includeArchived: state.includeArchived,
            }
          );
          if (generation !== fetchGeneration) {
            return;
          }
          state.rows = response.results;
          state.totalCount = response.count;
        } catch (error) {
          if (generation !== fetchGeneration) {
            return;
          }
          console.error('Error fetching all observations:', error);
          if (!silent) {
            $q.notify({
              type: 'negative',
              message: t('observationsList.loadError'),
            });
            state.rows = [];
            state.totalCount = 0;
          }
        } finally {
          if (!silent) {
            state.loading = false;
          }
        }
      },

      handleRowClick(_evt: Event, row: IObservation) {
        emit('selected', row.id);
      },

      handleHide() {
        emit('hide');
        if (localShow.value) {
          localShow.value = false;
        }
      },

      isActive(id: number): boolean {
        return observation.sharedState.currentObservation?.id === id;
      },

      isProtocol(row: IObservation): boolean {
        return getEffectiveLocalMeta(row).isProtocol;
      },

      rowClass(row: IObservation): string {
        return getEffectiveLocalMeta(row).archived ? 'chronicle-row--archived' : '';
      },

      onLocalMetaUpdated(payload: {
        observationId: number;
        localMeta: IObservation['localMeta'];
      }) {
        const index = state.rows.findIndex((row) => row.id === payload.observationId);
        if (index < 0) {
          return;
        }

        const row = state.rows[index];
        row.localMeta = payload.localMeta ?? null;

        if (payload.localMeta?.archived && !state.includeArchived) {
          state.rows.splice(index, 1);
          state.totalCount = Math.max(0, state.totalCount - 1);
        }
      },

      formatMode(mode: string | null | undefined): string {
        if (mode === 'chronometer') return t('observationsList.modeChronometer');
        if (mode === 'calendar') return t('observationsList.modeCalendar');
        return t('observationsList.modeNa');
      },

      formatDate(val: string): string {
        return relativeDay(val);
      },
    };

    watch(
      () => props.modelValue,
      (newVal) => {
        if (newVal) {
          state.searchText = '';
          state.sortField = 'updatedAt';
          state.includeArchived = false;
          state.filterUsedFor = [];
          state.filterIsProtocol = null;
          methods.fetchAll();
        }
      }
    );

    useAppResume(() => {
      if (props.modelValue) {
        methods.fetchAll({ silent: true });
      }
    });

    onUnmounted(() => {
      if (state.searchDebounceTimeout) {
        clearTimeout(state.searchDebounceTimeout);
      }
    });

    return {
      tableColumns,
      sortOptions,
      usedForFilterOptions,
      protocolFilterOptions,
      state,
      displayedRows,
      displayedCount,
      localShow,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.all-chronicles-dialog {
  .virtual-table {
    :deep(.q-table__middle) {
      max-height: 100%;
    }

    :deep(thead tr th) {
      position: sticky;
      z-index: 1;
      background: var(--neutral-lowest);
    }

    :deep(tbody tr) {
      cursor: pointer;

      &:hover td {
        background: var(--neutral-lower);
      }

      &.chronicle-row--archived td {
        opacity: 0.55;
      }
    }
  }
}
</style>
