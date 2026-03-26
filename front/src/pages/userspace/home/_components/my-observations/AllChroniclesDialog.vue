<template>
  <q-dialog v-model="localShow" @hide="methods.handleHide">
    <q-card class="all-chronicles-dialog column">
      <q-card-section class="col-auto row items-center q-pb-none">
        <div class="text-h5 text-weight-bold">Toutes vos chroniques</div>
        <q-space />
        <q-btn icon="close" flat round dense @click="methods.handleHide" />
      </q-card-section>

      <q-card-section class="col-auto q-pb-none">
        <div class="row items-center q-gutter-sm">
          <DSearchInput
            class="col"
            v-model:searchText="state.searchText"
            placeholder="Rechercher une chronique..."
            @update:searchText="methods.handleSearch"
          />
          <q-select
            v-model="state.sortField"
            :options="stateless.sortOptions"
            label="Trier par"
            dense
            outlined
            emit-value
            map-options
            class="col-auto"
            style="min-width: 220px"
            @update:model-value="methods.triggerReload"
          />
        </div>
      </q-card-section>

      <q-card-section class="col q-pt-sm" style="min-height: 0">
        <q-table
          class="fit virtual-table"
          flat
          dense
          :rows="state.rows"
          :columns="stateless.columns"
          row-key="id"
          virtual-scroll
          :virtual-scroll-sticky-size-start="40"
          table-style="max-height: 100%"
          :rows-per-page-options="[0]"
          hide-pagination
          hide-bottom
          :loading="state.loading"
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

          <template v-slot:body-cell-updatedAt="cellProps">
            <q-td :props="cellProps">
              {{ methods.formatDate(cellProps.row.updatedAt) }}
            </q-td>
          </template>

          <template v-slot:no-data>
            <div class="full-width column items-center q-pa-lg text-grey-6">
              <q-icon name="mdi-magnify" size="48px" class="q-mb-md" />
              <div class="text-body1">Aucune chronique trouvée</div>
            </div>
          </template>
        </q-table>
      </q-card-section>

      <q-card-section class="col-auto q-pt-none">
        <div class="row items-center justify-between">
          <div class="text-body2 text-grey-7">
            {{ state.totalCount }} chronique{{ state.totalCount > 1 ? 's' : '' }}
          </div>
          <q-btn flat label="Fermer" color="primary" @click="methods.handleHide" />
        </div>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import { observationService } from '@services/observations/index.service';
import { IObservation } from '@services/observations/interface';
import { DSearchInput } from '@lib-improba/components/app/inputs';
import { useObservation } from 'src/composables/use-observation';
import { relativeDay } from '@lib-improba/utils/date-format.utils';

export default defineComponent({
  name: 'AllChroniclesDialog',
  components: {
    DSearchInput,
  },
  props: {
    modelValue: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['update:modelValue', 'selected'],
  setup(props, { emit }) {
    const $q = useQuasar();
    const observation = useObservation();

    const stateless = {
      columns: [
        {
          name: 'name',
          align: 'left' as const,
          label: 'Nom',
          field: 'name',
        },
        {
          name: 'mode',
          align: 'center' as const,
          label: 'Mode',
          field: 'mode',
          style: 'width: 120px',
        },
        {
          name: 'updatedAt',
          align: 'left' as const,
          label: 'Dernière modification',
          field: 'updatedAt',
          style: 'width: 200px',
        },
      ],
      sortOptions: [
        { label: 'Dernière modification', value: 'updatedAt' },
        { label: 'Nom', value: 'name' },
        { label: 'Date de création', value: 'createdAt' },
      ],
    };

    const state = reactive({
      rows: [] as IObservation[],
      loading: false,
      searchText: '',
      sortField: 'updatedAt',
      totalCount: 0,
      searchDebounceTimeout: null as NodeJS.Timeout | null,
    });

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

      async fetchAll() {
        state.loading = true;
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
            }
          );
          state.rows = response.results;
          state.totalCount = response.count;
        } catch (error) {
          console.error('Error fetching all observations:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors du chargement des chroniques',
          });
          state.rows = [];
          state.totalCount = 0;
        } finally {
          state.loading = false;
        }
      },

      handleRowClick(_evt: Event, row: IObservation) {
        emit('selected', row.id);
      },

      handleHide() {
        localShow.value = false;
      },

      isActive(id: number): boolean {
        return observation.sharedState.currentObservation?.id === id;
      },

      formatMode(mode: string | null | undefined): string {
        if (mode === 'chronometer') return 'Chronomètre';
        if (mode === 'calendar') return 'Calendrier';
        return 'N/A';
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
          methods.fetchAll();
        }
      }
    );

    onUnmounted(() => {
      if (state.searchDebounceTimeout) {
        clearTimeout(state.searchDebounceTimeout);
      }
    });

    return {
      stateless,
      state,
      localShow,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.all-chronicles-dialog {
  width: 90vw;
  max-width: 900px;
  height: 85vh;

  .virtual-table {
    :deep(.q-table__middle) {
      max-height: 100%;
    }

    :deep(thead tr th) {
      position: sticky;
      z-index: 1;
      background: white;
    }

    :deep(tbody tr) {
      cursor: pointer;

      &:hover td {
        background: rgba(0, 0, 0, 0.03);
      }
    }
  }
}
</style>
