<template>
  <DTable
    table-class="bg-background"
    :table-header-class="props.tableHeaderClass"
    :grid="quasar.screen.lt.sm"
    row-key="id"
    :columns="props.columns"
    :rows="state.rows"
    v-model:pagination="state.pagination"
    binary-state-sort
    :filter="state.filter"
    :loading="state.loading"
    @request="methods.onRequest"
    :maxHeight="props.maxHeight"
    :selected="props.selected"
    :selection="props.selection"
    @update:selected="methods.emitSelected"
  >
    <template v-if="props.expandable" v-slot:header="headerProps">
      <q-tr :props="headerProps.props" :class="props.tableHeaderClass">
        <q-th auto-width v-if="props.selection">
          <DCheckbox v-model="headerProps.props.selected" />
        </q-th>
        <q-th auto-width />
        <q-th
          v-for="col in headerProps.props.cols"
          :key="col.name"
          :props="headerProps.props"
        >
          {{ col.label }}
        </q-th>
      </q-tr>
    </template>

    <template v-slot:body="{ props: dTablebodyProps }">
      <slot name="body" :props="dTablebodyProps">
        <q-tr :props="dTablebodyProps">
          <q-td v-if="props.selection">
            <slot
              name="body-selection"
              :props="dTablebodyProps"
              :cols="dTablebodyProps.cols"
              :row="dTablebodyProps.row"
            >
              <DCheckbox
                v-model="dTablebodyProps.selected"
                :style="`visibility: ${
                  dTablebodyProps.row._selectable === undefined ||
                  dTablebodyProps.row._selectable === true
                    ? 'visible'
                    : 'hidden'
                }`"
              />
            </slot>
          </q-td>
          <q-td v-if="props.expandable" auto-width>
            <slot
              name="expendableLineBtn"
              :props="dTablebodyProps"
              :cols="dTablebodyProps.cols"
              :row="dTablebodyProps.row"
            >
              <DExpandableLineBtn
                :expand="dTablebodyProps.expand"
                @click="dTablebodyProps.expand = !dTablebodyProps.expand"
                :style="`visibility: ${
                  dTablebodyProps.row._expandable === undefined ||
                  dTablebodyProps.row._expandable === true
                    ? 'visible'
                    : 'hidden'
                }`"
            /></slot>
          </q-td>
          <slot
            name="table-view-body"
            :cols="dTablebodyProps.cols"
            :row="dTablebodyProps.row"
          >
            <q-td
              v-for="col in dTablebodyProps.cols"
              :key="col.name"
              :class="`text-text ${col.align ? 'text-' + col.align : ''} ${
                col.classes
                  ? typeof col.classes === 'function'
                    ? col.classes(dTablebodyProps.row)
                    : col.classes
                  : ''
              }`"
              :style="col.style ? col.style : ''"
            >
              <slot
                :name="`table-col-${col.name}`"
                :col="col"
                :props="dTablebodyProps"
                :row="dTablebodyProps.row"
              >
                <div :style="col.innerStyle ? col.innerStyle : ''">
                  <slot name="table-cell" :col="col" :row="dTablebodyProps.row">
                    <div v-if="col.chips">
                      <q-chip
                        v-for="chip in methods.filteredChips(
                          col.chips,
                          dTablebodyProps.row[col.name]
                        )"
                        :key="chip.value"
                        :color="chip.color"
                        :text-color="chip.textColor || 'white'"
                        :label="chip.label || chip.value"
                      />
                    </div>
                    <template v-else>
                      {{ col.value }}
                    </template>
                  </slot>
                </div>
              </slot>
            </q-td>
          </slot>
        </q-tr>
        <q-tr
          v-if="props.expandable"
          v-show="dTablebodyProps.expand"
          :props="dTablebodyProps"
        >
          <q-td v-if="props.addCarretSpaceInExpandedRow" auto-width />
          <q-td
            colspan="100%"
            :style="{ padding: props.removeExpandedPadding ? 0 : undefined }"
          >
            <slot name="expanded-row" :row="dTablebodyProps.row"></slot>
          </q-td>
        </q-tr>
      </slot>
    </template>

    <template v-slot:item="itemProps">
      <div
        class="q-pa-xs col-xs-12 col-sm-6 col-md-4 col-lg-3 grid-style-transition"
      >
        <q-card dense>
          <template v-for="col in itemProps.props.cols" :key="col.id">
            <slot :name="`grid-cell-label-${col.name}`" :col="col">
              <q-card-section dense class="q-pt-sm q-px-sm q-pb-none">
                <slot :name="`grid-cell-${col.name}`" :col="col">
                  <strong>{{ col.label }}</strong>
                </slot>
              </q-card-section>
              <q-card-section dense class="q-pa-sm">
                <slot :name="`grid-cell-content-${col.name}`" :col="col">
                  <slot name="grid-cell" :col="col">
                    {{ col.value }}
                  </slot>
                </slot>
              </q-card-section>
            </slot>
            <q-separator />
          </template>
        </q-card>
      </div>
    </template>
  </DTable>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, reactive, onMounted, onUnmounted, watch } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter, useRoute } from 'vue-router';
import DExpandableLineBtn from 'src/../lib-improba/components/app/buttons/DExpandableLineBtn.vue';
import type {
  QTableColumn,
  QTablePagination,
} from 'src/../lib-improba/utils/q-table-types.utils';
import { useUrl, useUrlProps } from './use-url';

export default defineComponent({
  components: {
    DExpandableLineBtn,
  },
  props: {
    // useUrl and tableUrlId props. Look inside for info.
    ...useUrlProps,
    // Add a checkbox to select the row, can be single or multiple. It will fill the selected prop with the selected rows
    selection: {
      type: String, // single, multiple
      default: undefined,
    },
    // The selected rows, must be given as v-model:selected="state.myVarToFill"
    selected: {
      type: Array as PropType<any[]>,
      default: () => [],
    },
    // List of columns to display
    columns: {
      type: Array as PropType<QTableColumn[]>,
      default: () => [],
    },
    // The function called to fetch the data, must return a promise
    fetchFunction: {
      type: Function as any,
      required: true,
    },
    // Allow to expand every rows of the table. This expansion can be controlled by the row._expandable property if a per-row behavior is needed
    expandable: { type: Boolean, default: false },
    // Add a carret space in the first column of the table to align the expanded row with the other rows
    addCarretSpaceInExpandedRow: { type: Boolean, default: false },
    // Remove the padding of the expanded row
    removeExpandedPadding: { type: Boolean, default: false },
    // Customize the header of the table
    tableHeaderClass: {
      type: String,
    },
    // When it is changed to true then it will trigger a reload of the data
    triggerReload: {
      type: Boolean,
      default: false,
    },
    // Add a maximum height to the table
    maxHeight: {
      type: String as any,
      default: null,
    },
    // Give a pagination object to the table, it will be the defaut state of the table
    pagination: {
      type: Object as PropType<QTablePagination>,
      default: (): QTablePagination => {
        return {
          sortBy: 'id',
          descending: true,
          page: 1,
          rowsPerPage: 10,
          rowsNumber: 10,
        };
      },
    },
  },
  emits: [
    'update:triggerReload',
    'updatedRows',
    'updatedColumns',
    'update:pagination',
    'update:selected',
  ],
  setup(props, { emit }) {
    const quasar = useQuasar();
    const route = useRoute();
    const router = useRouter();

    const state = reactive<{
      rows: Record<string, unknown>[];
      loading: boolean;
      filter: string;
      pagination: QTablePagination;
      onMountedOngoing: boolean;
      fetchId: number | null;
    }>({
      rows: [],
      loading: false,
      filter: '',
      pagination: {
        sortBy: 'id',
        descending: true,
        page: 1,
        rowsPerPage: 10,
        rowsNumber: 10,
      },
      onMountedOngoing: false,
      fetchId: null as null | number,
    });

    const methods = {
      async onRequest(requestProps: any = undefined) {
        const { page, rowsPerPage, sortBy, descending } =
          methods.getPagination(requestProps);
        if (props.useUrl) {
          if (!props.tableUrlId) {
            throw new Error('When using useUrl, you must provide a tableUrlId');
          }

          urlComposable.methods.onRequest({
            requestProps,
            pagination: state.pagination,
            tableUrlId: props.tableUrlId,
            onMountedOngoing: state.onMountedOngoing,
          });
        } else {
          state.pagination.page = page;
          state.pagination.rowsPerPage = rowsPerPage;
          state.pagination.sortBy = sortBy;
          state.pagination.descending = descending;

          await methods.fetch();
        }
      },
      getPagination(requestProps?: any) {
        /*
        const { tableUrlId } = urlComposable.methods.parseRouteQueryParams(
          route.query,
        );
        const pagi =
          props.useUrl && (!props.tableUrlId || tableUrlId === props.tableUrlId)
            ? urlComposable.methods.parseRouteQueryParams(route.query)
            : requestProps?.pagination ?? state.pagination;
        */

        let pagi = requestProps?.pagination ?? state.pagination;

        if (props.useUrl && props.tableUrlId) {
          const { page, rowsPerPage, sortBy, descending } =
            urlComposable.methods.parseRouteQueryParams(
              route.query,
              props.tableUrlId
            );
          pagi = {
            ...pagi,
            page,
            rowsPerPage,
            sortBy,
            descending,
          };
        }

        /* const pagi = (props.useUrl && props.tableUrlId) ? urlComposable.methods.parseRouteQueryParams(
          route.query, props.tableUrlId
        ) : requestProps?.pagination ?? state.pagination;*/
        return pagi;
      },
      async fetch() {
        const fectchId = state.fetchId !== null ? state.fetchId + 1 : 0;
        state.fetchId = fectchId;

        const { page, rowsPerPage, sortBy, descending } =
          methods.getPagination();

        state.loading = true;

        // get all rows if "All" (0) is selected
        const limit = rowsPerPage;
        // rowsPerPage === 0 ? state.pagination.rowsNumber : rowsPerPage

        // calculate starting row of data
        const offset =
          page !== undefined ? (page - 1) * rowsPerPage : undefined;

        const order =
          descending === undefined
            ? undefined
            : descending === true
            ? 'DESC'
            : 'ASC';

        const response = await props.fetchFunction(
          limit as number,
          offset,
          sortBy,
          order
        );

        if (state.fetchId !== fectchId) {
          return;
        }

        state.pagination.rowsNumber = response ? response.count : 0;

        state.rows.splice(0, state.rows.length);
        state.rows = response ? response.results : [];

        // don't forget to update local pagination object
        state.pagination.page = page;
        state.pagination.rowsPerPage = rowsPerPage;
        state.pagination.sortBy = sortBy;
        state.pagination.descending = descending;

        state.loading = false;
      },
      emitSelected: (event: any[]) => {
        emit(
          'update:selected',
          event.filter((row: any) => row._selectable !== false)
        );
      },
      filteredChips: (chips: any[], value: any) => {
        return chips.filter((chip) => chip.value === value);
      },
    };

    // The composable used to handle the url query params
    // Methods of this composable are used in the methods of this component
    const urlComposable = useUrl({
      props,
      fetch: () => {
        methods.fetch();
      },
    });

    onMounted(async () => {
      state.onMountedOngoing = true;
      emit('updatedColumns', props.columns);
      await methods.onRequest({
        pagination: methods.getPagination(),
        filter: state.filter,
      });
      // await methods.fetch()

      if (props.useUrl && props.tableUrlId) {
        await methods.fetch();
      }

      state.onMountedOngoing = false;
    });

    onUnmounted(() => {
      if (props.useUrl && props.tableUrlId) {
        urlComposable.methods.clearRouteQueryParams(props.tableUrlId);
      }
    });

    watch(
      () => [props.triggerReload],
      async ([triggerReload], [oldTriggerReload]) => {
        if (triggerReload) {
          emit('update:triggerReload', false);
          await methods.fetch();
        }
      }
    );

    watch(
      () => state.rows,
      (val, prevVal) => {
        emit('updatedRows', val);
      }
    );

    watch(
      () => props.columns,
      (val, prevVal) => {
        emit('updatedColumns', val);
      }
    );

    watch(
      () => state.pagination,
      (val: any) => {
        // emit('update:pagination', state.pagination)
      }
    );

    return {
      props,
      state,
      methods,
      quasar,
      emit,
      urlComposable,
    };
  },
});
</script>
