<template>
  <div class="my-observations column">
    <div class="col-auto row q-mb-md items-center">
      <div class="col-12 col-md-6">
        <DSearchInput
          v-model:searchText="state.searchText"
          placeholder="Rechercher une observation"
          @update:searchText="methods.handleSearch"
        />
      </div>
    </div>

    <div class="col">
      <DPaginationTable
        class="table"
        flat
        :columns="stateless.columns"
        :fetchFunction="methods.fetchObservations"
        v-model:triggerReload="state.reload"
        row-key="id"
        @row-click="methods.loadObservation"
        hide-bottom-select
      >
        <template v-slot:table-col-name="scope">
          <DTextLink @click="methods.loadObservation(scope.row.id)">
            {{ scope.row.name }}
          </DTextLink>
        </template>

        <!-- Custom action column -->
        <template v-slot:table-col-actions="">
          <div class="row items-center justify-end">
            <DActionViewBtn flat size="sm" class="q-mr-xs" />
          </div>
        </template>
      </DPaginationTable>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, watch } from 'vue';
import { useQuasar } from 'quasar';
import { observationService } from '@services/observations/index.service';
import { columns } from './columns';
import { PaginationResponse } from '@lib-improba/utils/pagination.utils';
import { IObservation } from '@services/observations/interface';
import { DSearchInput } from '@lib-improba/components/app/inputs';
import { DPaginationTable } from '@lib-improba/components';
import { useObservation } from 'src/composables/use-observation';

export default defineComponent({
  components: {
    DSearchInput,
  },
  setup() {
    const $q = useQuasar();
    const observation = useObservation();

    const stateless = {
      columns,
    };

    const state = reactive({
      reload: false,
      searchText: '',
      searchDebounceTimeout: null as NodeJS.Timeout | null,
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
            message: 'Failed to load observations',
          });
          return { count: 0, results: [] };
        }
      },

      loadObservation: async (id: number) => {
        await observation.methods.loadObservation(id);
      },

      deleteObservation: async (id: number) => {
        try {
          $q.dialog({
            title: 'Delete Observation',
            message: 'Are you sure you want to delete this observation?',
            cancel: true,
            persistent: true,
          }).onOk(async () => {
            await observationService.delete(id);
            $q.notify({
              type: 'positive',
              message: 'Observation deleted successfully',
            });
            state.reload = true;
          });
        } catch (error) {
          console.error('Error deleting observation:', error);
          $q.notify({
            type: 'negative',
            message: 'Failed to delete observation',
          });
        }
      },
    };

    return {
      stateless,
      state,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.my-observations {
  h5 {
    font-weight: 500;
  }
}

.table {
  &:deep() {
    .q-table__select {
      // Hide the bottom select used to increase the number of rows per page
      display: none;
    }
  }
}
</style>
