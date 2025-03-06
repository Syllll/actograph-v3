<template>
  <DTable :columns="stateless.columns" :rows="state.rows">
    <template v-slot:table-col-colc="scope">
      {{ scope.row.col1 }}
      <DActionRemoveBtn />
    </template>
  </DTable>
</template>

<script lang="ts">
import { defineComponent, reactive } from 'vue';

export default defineComponent({
  setup() {
    const stateless = {
      columns: [
        {
          label: 'Column 1',
          name: 'col1',
          align: 'center',
          field: 'col1',
          format: (val: any) => val,
        },
        {
          label: 'Column 2',
          name: 'col2',
          align: 'center',
          field: 'col2',
          format: (val: any) => val,
        },
        {
          label: 'Custom column',
          name: 'colc',
          align: 'center',
        },
      ],
    };
    const state = reactive({
      rows: [
        {
          col1: 'Row 1 Col 1',
          col2: 'Row 1 Col 2',
        },
        {
          col1: 'Row 2 Col 1',
          col2: 'Row 2 Col 2',
        },
      ],
    });
    return {
      stateless,
      state,
    };
  },
});
</script>
