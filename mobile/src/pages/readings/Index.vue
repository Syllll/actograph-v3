<template>
  <DPage>
    <!-- Header avec compteur -->
    <div class="readings-header row items-center q-pa-md bg-grey-1">
      <div class="text-subtitle1 text-weight-medium">
        {{ readings.length }} relevé{{ readings.length > 1 ? 's' : '' }}
      </div>
      <q-space />
      <q-input
        v-model="state.search"
        placeholder="Rechercher..."
        outlined
        dense
        clearable
        class="search-input"
        aria-label="Rechercher dans les relevés"
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
        :rows="filteredReadings"
        :columns="columns"
        row-key="id"
        flat
        dense
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
              class="reading-type-chip"
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
    <div v-if="filteredReadings.length === 0" class="empty-state column items-center justify-center">
      <q-icon name="mdi-table-off" size="64px" color="grey-5" />
      <div class="text-h6 q-mt-md text-grey">
        {{ isSearchActive ? 'Aucun relevé trouvé' : 'Aucun relevé' }}
      </div>
      <div class="text-body2 text-grey">
        {{
          isSearchActive
            ? 'Essayez un autre terme de recherche'
            : 'Démarrez une observation pour enregistrer des relevés'
        }}
      </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useChronicle } from '@composables/use-chronicle';
import { DPage } from '@components';
import type { IReadingEntity, ReadingType } from '@database/repositories/reading.repository';
import { QTableColumn } from 'quasar';

const TYPE_LABELS: Record<ReadingType, string> = {
  START: 'Début',
  STOP: 'Fin',
  PAUSE_START: 'Pause ▶',
  PAUSE_END: 'Pause ■',
  DATA: 'Data',
};

const TYPE_COLORS: Record<ReadingType, string> = {
  START: 'positive',
  STOP: 'negative',
  PAUSE_START: 'warning',
  PAUSE_END: 'warning',
  DATA: 'primary',
};

export default defineComponent({
  name: 'ReadingsIndexPage',
  components: {
    DPage,
  },
  setup() {
    const chronicle = useChronicle();

    const columns: QTableColumn[] = [
      {
        name: 'type',
        label: 'Type',
        field: 'type',
        align: 'left',
      },
      {
        name: 'date',
        label: 'Heure',
        field: 'date',
        align: 'left',
        style: 'width: 90px',
      },
      {
        name: 'name',
        label: 'Libellé',
        field: 'name',
        align: 'left',
      },
    ];

    const state = reactive({
      search: '',
    });

    const readings = computed(() => chronicle.sharedState.currentReadings as IReadingEntity[]);

    const filteredReadings = computed(() => {
      if (!state.search) {
        return readings.value;
      }
      const searchLower = state.search.toLowerCase();
      return readings.value.filter(
        (r) =>
          r.name?.toLowerCase().includes(searchLower) ||
          r.type.toLowerCase().includes(searchLower) ||
          r.description?.toLowerCase().includes(searchLower)
      );
    });

    const isSearchActive = computed(() => state.search.trim().length > 0);

    const methods = {
      getTypeLabel: (type: ReadingType, name?: string): string => {
        // Special handling for comments
        if (type === 'DATA' && name?.startsWith('#')) {
          return 'Commentaire';
        }

        return TYPE_LABELS[type] || type;
      },

      getTypeColor: (type: ReadingType): string => {
        return TYPE_COLORS[type] || 'grey';
      },

      formatDate: (dateStr: string): string => {
        if (!dateStr) return '-';
        const date = new Date(dateStr);
        return date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      },
    };

    return {
      chronicle,
      columns,
      readings,
      state,
      filteredReadings,
      isSearchActive,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.readings-header {
  flex-shrink: 0;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  flex-wrap: wrap;
  gap: 8px;
  min-height: 56px;
}

.search-input {
  width: 180px;
  flex: 1 1 220px;
  max-width: 320px;
}

@media (max-width: 600px) {
  .readings-header {
    align-items: stretch;
  }

  .search-input {
    width: 100%;
    min-width: 0;
  }

  :deep(.readings-header .q-space) {
    flex-basis: 100%;
    height: 0;
  }
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


:deep(.search-input .q-field__control) {
  min-height: 44px;
}

:deep(.search-input .q-field__append .q-icon),
:deep(.search-input .q-field__prepend .q-icon) {
  font-size: 20px;
}

.readings-table {
  :deep(.q-table__middle) {
    background-color: #fff;
  }

  :deep(.q-table tbody tr) {
    height: 52px;
  }

  :deep(.q-table tbody td) {
    padding: 12px 12px;
    font-size: 14px;
  }
}

.reading-type-chip {
  min-height: 32px;
  padding: 0 10px;
  font-weight: 600;
}

@media (max-width: 600px) {
  .readings-header {
    min-height: auto;
    padding: 12px 16px;
  }

  :deep(.search-input .q-field__control) {
    min-height: 48px;
  }

  .readings-table {
    :deep(.q-table tbody tr) {
      height: 56px;
    }

    :deep(.q-table tbody td) {
      padding: 14px 12px;
    }
  }
}
</style>
