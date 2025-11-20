<template>
  <q-dialog v-model="localShow" @hide="methods.handleHide">
    <q-card style="min-width: 600px; max-width: 800px">
      <q-card-section>
        <div class="text-h6">Sélectionner une chronique</div>
      </q-card-section>

      <q-card-section>
        <DSearchInput
          v-model:searchText="state.searchText"
          placeholder="Rechercher une chronique"
          @update:searchText="methods.handleSearch"
        />
      </q-card-section>

      <q-card-section class="q-pt-none">
        <DPaginationTable
          class="table"
          flat
          :columns="stateless.columns"
          :fetchFunction="methods.fetchObservations"
          v-model:triggerReload="state.reload"
          row-key="id"
          @row-click="methods.selectObservation"
          hide-bottom-select
        >
          <template v-slot:table-col-name="scope">
            <DTextLink @click="methods.selectObservation(scope.row.id)">
              {{ scope.row.name }}
            </DTextLink>
          </template>
        </DPaginationTable>
      </q-card-section>

      <q-card-actions align="right">
        <q-btn flat label="Annuler" color="primary" @click="methods.handleHide" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script lang="ts">
import { defineComponent, reactive, watch, computed } from 'vue';
import { useQuasar } from 'quasar';
import { observationService } from '@services/observations/index.service';
import { PaginationResponse } from '@lib-improba/utils/pagination.utils';
import { IObservation } from '@services/observations/interface';
import { DSearchInput } from '@lib-improba/components/app/inputs';
import { DPaginationTable, DTextLink } from '@lib-improba/components';
import { columns } from '@pages/userspace/home/_components/my-observations/columns';

export default defineComponent({
  name: 'SelectChronicleDialog',
  components: {
    DSearchInput,
    DPaginationTable,
    DTextLink,
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

    const stateless = {
      columns,
    };

    const state = reactive({
      reload: false,
      searchText: '',
      searchDebounceTimeout: null as NodeJS.Timeout | null,
    });

    const localShow = computed({
      get: () => props.modelValue,
      set: (value) => emit('update:modelValue', value),
    });

    const methods = {
      handleSearch(value: string) {
        // Debounce search to avoid too many API calls
        if (state.searchDebounceTimeout) {
          clearTimeout(state.searchDebounceTimeout);
        }

        state.searchDebounceTimeout = setTimeout(() => {
          state.reload = true;
        }, 300);
      },

      fetchObservations: async (
        limit: number,
        offset: number,
        orderBy = 'id',
        order = 'DESC'
      ): Promise<PaginationResponse<IObservation>> => {
        try {
          const response = await observationService.findWithPagination(
            {
              limit,
              offset,
              orderBy,
              order,
            },
            {
              searchString: state.searchText || undefined,
            }
          );
          return response;
        } catch (error) {
          console.error('Error fetching observations:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors du chargement des chroniques',
          });
          return { count: 0, results: [] };
        }
      },

      selectObservation: (id: number) => {
        emit('selected', id);
      },

      handleHide: () => {
        localShow.value = false;
      },
    };

    // Reset search when dialog opens
    watch(
      () => props.modelValue,
      (newVal) => {
        if (newVal) {
          state.searchText = '';
          state.reload = true;
        }
      }
    );

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
.table {
  max-height: 400px;
  
  &:deep() {
    .q-table__select {
      display: none;
    }
  }
}
</style>

