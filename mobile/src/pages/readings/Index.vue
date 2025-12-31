<template>
  <DPage>
    <!-- Header avec compteur -->
    <div class="readings-header row items-center q-pa-md bg-grey-1">
      <div class="text-subtitle1 text-weight-medium">
        {{ state.readings.length }} relevé{{ state.readings.length > 1 ? 's' : '' }}
      </div>
      <q-space />
      <q-input
        v-model="state.search"
        placeholder="Rechercher..."
        dense
        outlined
        clearable
        class="search-input"
      >
        <template v-slot:prepend>
          <q-icon name="mdi-magnify" />
        </template>
      </q-input>
    </div>

    <!-- Table des relevés -->
    <div class="col table-container">
      <q-table
        class="readings-table"
        :rows="computedState.filteredReadings.value"
        :columns="columns"
        row-key="id"
        dense
        flat
        virtual-scroll
        :rows-per-page-options="[0]"
        hide-pagination
        hide-bottom
      >
        <template v-slot:body-cell-type="props">
          <q-td :props="props">
            <q-chip
              :color="methods.getTypeColor(props.row.type)"
              text-color="white"
              size="sm"
              dense
            >
              {{ methods.getTypeLabel(props.row.type, props.row.name) }}
            </q-chip>
          </q-td>
        </template>

        <template v-slot:body-cell-date="props">
          <q-td :props="props">
            <span class="text-caption">
              {{ methods.formatDate(props.row.date) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-name="props">
          <q-td :props="props">
            <span 
              :class="{ 
                'text-grey-6': !props.row.name,
                'comment-reading': props.row.name?.startsWith('#')
              }"
            >
              {{ props.row.name || '-' }}
            </span>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Empty state -->
    <div v-if="state.readings.length === 0" class="empty-state column items-center justify-center">
      <q-icon name="mdi-table-off" size="64px" color="grey-5" />
      <div class="text-h6 q-mt-md text-grey">Aucun relevé</div>
      <div class="text-body2 text-grey">
        Démarrez une observation pour enregistrer des relevés
      </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, watch, onMounted } from 'vue';
import { useChronicle } from '@composables/use-chronicle';
import { DPage } from '@components';
import type { IReadingEntity, ReadingType } from '@database/repositories/reading.repository';
import { QTableColumn } from 'quasar';

export default defineComponent({
  name: 'ReadingsIndexPage',
  components: {
    DPage,
  },
  setup() {
    const chronicle = useChronicle();

    const columns: QTableColumn[] = [
      {
        name: 'order',
        label: 'N°',
        field: 'id',
        align: 'left',
        style: 'width: 50px',
      },
      {
        name: 'type',
        label: 'Type',
        field: 'type',
        align: 'left',
        style: 'width: 100px',
      },
      {
        name: 'date',
        label: 'Date & Heure',
        field: 'date',
        align: 'left',
        style: 'width: 180px',
      },
      {
        name: 'name',
        label: 'Libellé',
        field: 'name',
        align: 'left',
      },
    ];

    const state = reactive({
      readings: [] as IReadingEntity[],
      search: '',
    });

    const computedState = {
      filteredReadings: computed(() => {
        if (!state.search) {
          return state.readings;
        }
        const searchLower = state.search.toLowerCase();
        return state.readings.filter(
          (r) =>
            r.name?.toLowerCase().includes(searchLower) ||
            r.type.toLowerCase().includes(searchLower) ||
            r.description?.toLowerCase().includes(searchLower)
        );
      }),
    };

    const methods = {
      loadReadings: () => {
        state.readings = chronicle.sharedState.currentReadings;
      },

      getTypeLabel: (type: ReadingType, name?: string): string => {
        // Special handling for comments
        if (type === 'DATA' && name?.startsWith('#')) {
          return 'Commentaire';
        }
        
        const labels: Record<ReadingType, string> = {
          START: 'Début',
          STOP: 'Fin',
          PAUSE_START: 'Pause ▶',
          PAUSE_END: 'Pause ■',
          DATA: 'Data',
        };
        return labels[type] || type;
      },

      getTypeColor: (type: ReadingType): string => {
        const colors: Record<ReadingType, string> = {
          START: 'positive',
          STOP: 'negative',
          PAUSE_START: 'warning',
          PAUSE_END: 'warning',
          DATA: 'primary',
        };
        return colors[type] || 'grey';
      },

      formatDate: (dateStr: string): string => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          fractionalSecondDigits: 3,
        });
      },
    };

    onMounted(() => {
      methods.loadReadings();
    });

    watch(
      () => chronicle.sharedState.currentReadings,
      () => methods.loadReadings(),
      { deep: true }
    );

    return {
      chronicle,
      columns,
      state,
      computedState,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.readings-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.search-input {
  width: 180px;
}

.table-container {
  position: relative;
  overflow: hidden;
}

.readings-table {
  position: absolute;
  inset: 0;

  :deep(.q-table__container) {
    height: 100%;
  }

  :deep(thead tr th) {
    position: sticky;
    top: 0;
    z-index: 1;
    background-color: white;
  }
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  padding: 2rem;
}

/* Style for comment readings (name starting with "#") */
.comment-reading {
  color: #3b82f6; /* Blue color */
  font-weight: 500;
}
</style>

