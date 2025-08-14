<template>
  <div class="fit">
    <q-table
      class="fit" dense
      style="max-height: 46rem;"
      :rows="readings"
      :columns="columns"
      row-key="id"
      :selected="selectedInternal"
      selection="single"
      binary-state-sort
      virtual-scroll
      :virtual-scroll-sticky-size-start="48"
      :rows-per-page-options="[0]"
      hide-pagination
      hide-bottom
      @request:selected="handleRequestSelected"
    >
      <template v-slot:header="props">
        <q-tr :props="props">
          <q-th v-for="col in props.cols" :key="col.name" :props="props">
            {{ col.label }}
          </q-th>
        </q-tr>
      </template>

      <template v-slot:body="props">
        <q-tr 
          :props="props" 
          :class="{ 'selected-row': isRowSelected(props.row) }"
          @click="toggleRowSelection(props.row)"
        >
          <q-td key="order" :props="props">
            {{ props.rowIndex + 1 }}
          </q-td>
          <q-td key="type" :props="props">
            {{ getReadingTypeLabel(props.row.type) }}
          </q-td>
          <q-td key="dateTime" :props="props">
            {{ formatDateTime(props.row.dateTime) }}
            <q-popup-edit v-model="props.row.dateTime" title="Editer la date et l'heure" buttons v-slot="scope">
              <q-input type="text" v-model="scope.value" dense autofocus />
            </q-popup-edit>

          </q-td>
          <q-td key="name" :props="props">
            {{ props.row.name }}
            <q-popup-edit v-model="props.row.name" title="Editer le label" buttons v-slot="scope">
              <q-input type="text" v-model="scope.value" dense autofocus />
            </q-popup-edit>
          </q-td>
        </q-tr>
      </template>
    </q-table>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref, watch } from 'vue';
import { IReading, ReadingTypeEnum } from '@services/observations/interface';
import { QTableColumn } from 'quasar';
import { date as qDate}  from 'quasar';

export default defineComponent({
  name: 'ReadingsTable',
  
  props: {
    readings: {
      type: Array as () => IReading[],
      required: true,
    },
    selected: {
      type: Array as () => IReading[],
      default: () => [],
    },
  },
  
  emits: ['update:selected'],
  
  setup(props, { emit }) {
    const columns: QTableColumn[] = [
      {
        name: 'order',
        label: 'N°',
        field: 'order',
        align: 'left',
        sortable: false,
      },
      {
        name: 'type',
        label: 'Type',
        field: 'type',
        align: 'left',
        sortable: true,
      },
      {
        name: 'dateTime',
        label: 'Date & heure',
        field: 'dateTime',
        align: 'left',
        sortable: true,
      },
      {
        name: 'name',
        label: 'Libellé',
        field: 'name',
        align: 'left',
        sortable: true,
      },
    ];

    const selectedInternal = ref<IReading[]>([]);
    
    // Watch the parent's selected readings and update internal state
    watch(() => props.selected, (newVal) => {
      selectedInternal.value = newVal || [];
    }, { immediate: true });
    
    // Check if a row is selected using a safe comparison
    const isRowSelected = (row: IReading) => {
      if (!row || !row.id || selectedInternal.value.length === 0) {
        return false;
      }
      
      return selectedInternal.value.some(r => r && r.id === row.id);
    };
    
    // Toggle row selection with improved safety
    const toggleRowSelection = (row: IReading) => {
      if (!row || !row.id) return;
      console.log('toggleRowSelection', row);
      if (isRowSelected(row)) {
        selectedInternal.value = [];
      } else {
        // Make sure we only select this row
        selectedInternal.value = [row];
      }
      
      emit('update:selected', selectedInternal.value);
    };
    
    // Handle selection request from q-table
    const handleRequestSelected = (details: any) => {
      // Force single selection mode
      if (details.rows && details.rows.length > 0) {
        selectedInternal.value = [details.rows[0]];
      } else {
        selectedInternal.value = [];
      }
      
      emit('update:selected', selectedInternal.value);
    };
    
    // Format date and time for display
    const formatDateTime = (dateTime: Date | string) => {
      if (!dateTime) return '';
      
      const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
      
      return qDate.formatDate(date, 'DD/MM/YYYY HH:mm:ss.SSS');
    };
    
    // Get readable label for reading type
    const getReadingTypeLabel = (type: ReadingTypeEnum) => {
      const labels = {
        [ReadingTypeEnum.START]: 'Début',
        [ReadingTypeEnum.STOP]: 'Fin',
        [ReadingTypeEnum.PAUSE_START]: 'Déb pause',
        [ReadingTypeEnum.PAUSE_END]: 'Fin pause',
        [ReadingTypeEnum.DATA]: 'Data',
      };
      
      return labels[type] || type;
    };
    
    return {
      columns,
      selectedInternal,
      handleRequestSelected,
      formatDateTime,
      getReadingTypeLabel,
      isRowSelected,
      toggleRowSelection,
    };
  },
});
</script>

<style scoped>

.selected-row {
  background-color: rgba(25, 118, 210, 0.1);
}

/* Style the selected row more clearly */
tr.selected-row td {
  font-weight: 500;
}
</style> 