<template>
  <q-table
    :class="`${props.maxHeight ? 'my-fixedHeaderTable' : ''}`"
    :table-header-class="props.tableHeaderClass"
    :style="`${props.maxHeight ? 'max-height: ' + props.maxHeight : ''}`"
    row-key="id"
    :pagination="props.pagination ? props.pagination : state.pagination"
    :selected="props.selected"
    :selection="<any>props.selection"
    binary-state-sort
    @update:selected="methods.emitSelected"
    @update:pagination="
      props.pagination
        ? emit('update:pagination', $event)
        : (state.pagination = $event)
    "
  >
    <template
      v-if="props.expandable || slots.header"
      v-slot:header="headerProps"
    >
      <slot name="header" :props="headerProps">
        <q-tr :props="headerProps" :class="props.tableHeaderClass">
          <q-th auto-width v-if="props.selection">
            <DCheckbox v-model="headerProps.selected" />
          </q-th>
          <q-th auto-width />
          <q-th
            v-for="col in headerProps.cols"
            :key="col.name"
            :props="headerProps"
          >
            {{ col.label }}
          </q-th>
        </q-tr>
      </slot>
    </template>
    <!--
    <template v-slot:header="headerProps" v-if="slots.header">
      <slot name="header" :props="headerProps">
        <slot
          name="header-selection"
          :props="headerProps"
          v-if="props.selection"
        >
          <DCheckbox v-model="headerProps.selected" />
        </slot>
      </slot>
    </template>-->

    <template v-slot:body="dTablebodyProps">
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
            <DExpandableLineBtn
              :expand="dTablebodyProps.expand"
              @click="dTablebodyProps.expand = !dTablebodyProps.expand"
              :style="`visibility: ${
                dTablebodyProps.row._expandable === undefined ||
                dTablebodyProps.row._expandable === true
                  ? 'visible'
                  : 'hidden'
              }`"
            />
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
                :row="dTablebodyProps.row"
              >
                <div>
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
          <q-td colspan="100%">
            <slot name="expanded-row" :row="dTablebodyProps.row"></slot>
          </q-td>
        </q-tr>
      </slot>
    </template>

    <template v-slot:item="itemsProps" v-if="slots.item">
      <slot name="item" :props="itemsProps"></slot>
    </template>
  </q-table>
</template>

<script lang="ts">
import type { PropType } from 'vue';
import { defineComponent, reactive } from 'vue';

import DExpandableLineBtn from 'src/../lib-improba/components/app/buttons/DExpandableLineBtn.vue';
import type { QTablePagination } from 'src/../lib-improba/utils/q-table-types.utils';

export default defineComponent({
  props: {
    selection: {
      type: String, // single, multiple
      default: undefined,
    },
    selected: {
      type: Array as any,
      default: [] as any,
    },
    maxHeight: {
      type: String as PropType<string | null>,
      default: null,
    },
    pagination: {
      type: Object as PropType<QTablePagination> | undefined,
      default: undefined,
    },
    expandable: { type: Boolean, default: false },
    tableHeaderClass: {
      type: String,
      default: 'bg-secondary-low',
    },
  },
  components: {
    DExpandableLineBtn,
  },
  emits: ['update:pagination', 'update:selected'],
  setup(props, context) {
    const state = reactive({
      pagination: {
        // sortBy: 'id',
        // descending: true,
        // page: 1,
        rowsPerPage: 0,
        // rowsNumber: 10
      },
    });

    const methods = {
      emitSelected: (event: any[]) => {
        context.emit(
          'update:selected',
          event.filter((row: any) => row._selectable !== false)
        );
      },
      filteredChips: (chips: any[], value: any) => {
        return chips.filter(
          (chip) => chip.value === value || value.includes(chip.value)
        );
      },
    };

    return {
      props,
      state,
      methods,
      slots: context.slots,
      emit: context.emit,
    };
  },
});
</script>

<style scoped lang="scss">
.my-fixedHeaderTable {
  &:deep() {
    thead tr th {
      position: sticky;
      z-index: 1;
    }
    thead tr:first-child th {
      top: 0;
    }
    /* this is when the loading indicator appears */
    &.q-table--loading thead tr:last-child th {
      /* height of all previous header rows */
      top: 48px;
    }
  }
}

.q-table__container {
  &:deep() {
    .q-table__bottom {
      background: var(--toolbar);
    }
  }
}
</style>
