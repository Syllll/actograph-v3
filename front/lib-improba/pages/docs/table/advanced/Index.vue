<template>
  <DPaginationTable
    v-model:selected="state.selected"
    selection="multiple"
    expandable
    :columns="stateless.columns"
    :fetchFunction="methods.fetch"
    useUrl
    tableUrlId="table-exemple"
  >
    <template v-slot:table-col-colc="scope">
      {{ scope.row.id }}
      <DActionRemoveBtn />
    </template>
    <template v-slot:expanded-row="scope">
      Content of the expanded row. {{ scope.row.col1 }}
    </template>
  </DPaginationTable>
</template>

<script lang="ts">
import { defineComponent, reactive, watch } from 'vue';
import { columns } from './columns';

export default defineComponent({
  setup() {
    const stateless = {
      columns,
    };
    const state = reactive({
      selected: [{ id: 1 }],
    });
    const methods = {
      fetch: (
        limit: number,
        offset: number,
        orderBy?: string,
        order?: string
      ) => {
        return {
          count: 1000,
          results: [
            {
              id: 0,
              col1: 'Row 1 Col 1',
              col2: 'Row 1 Col 2',
            },
            {
              id: 1,
              col1: 'Row 2 Col 1',
              col2: 'Row 2 Col 2',
            },
          ],
        };
      },
    };

    watch(
      () => state.selected,
      (val) => {
        console.log(val);
      }
    );

    return {
      stateless,
      state,
      methods,
    };
  },
});
</script>
