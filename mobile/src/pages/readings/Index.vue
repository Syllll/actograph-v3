<template>
  <DPage>
    <!-- Header avec compteur + search dédiée sur sa ligne -->
    <div class="readings-header q-px-md q-pt-md q-pb-sm">
      <div class="row items-center q-mb-sm">
        <q-chip
          color="primary"
          text-color="white"
          icon="mdi-table"
          class="q-ma-none"
        >
          {{ readings.length }} relevé{{ readings.length > 1 ? 's' : '' }}
        </q-chip>
      </div>
      <q-input
        v-model="state.search"
        placeholder="Rechercher..."
        outlined
        clearable
        class="search-input full-width"
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
        @row-click="(_evt, row) => methods.openCommentDialog(row)"
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
            <span class="text-caption" style="color: var(--text, #000)">
              {{ methods.formatDate(props.row.date) }}
            </span>
          </q-td>
        </template>

        <template v-slot:body-cell-name="props">
          <q-td :props="props">
            <span 
              class="reading-name"
              :class="{ 
                'text-faint': !props.row.name,
                'comment-reading': props.row.name?.startsWith('#')
              }"
            >
              {{ props.row.name || '-' }}
            </span>
            <div v-if="props.row.description" class="reading-description text-caption">
              {{ props.row.description }}
            </div>
          </q-td>
        </template>
      </q-table>
    </div>

    <!-- Empty state -->
    <div v-if="filteredReadings.length === 0" class="empty-state column items-center justify-center">
      <q-icon name="mdi-table-off" size="64px" color="grey-5" />
      <div class="text-h6 q-mt-md text-muted">
        {{ isSearchActive ? 'Aucun relevé trouvé' : 'Aucun relevé' }}
      </div>
      <div class="text-body2 text-muted">
        {{
          isSearchActive
            ? 'Essayez un autre terme de recherche'
            : 'Démarrez une observation pour enregistrer des relevés'
        }}
      </div>
    </div>

    <!-- Dialog ajout commentaire sur un relevé -->
    <q-dialog v-model="state.showCommentDialog">
      <q-card style="min-width: 320px">
        <q-card-section class="bg-info text-white">
          <div class="text-h6">Ajouter un commentaire</div>
          <div v-if="state.selectedReading" class="text-caption q-mt-xs">
            Relevé du {{ methods.formatDate(state.selectedReading.date) }}
          </div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input
            v-model="state.commentText"
            label="Commentaire"
            placeholder="Saisir un commentaire..."
            outlined
            autofocus
            :rules="[(val) => (val && val.trim().length > 0) || 'Le commentaire ne peut pas être vide']"
            @keyup.enter="methods.saveComment"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" v-close-popup />
          <q-btn
            color="info"
            label="Ajouter"
            @click="methods.saveComment"
            :loading="state.savingComment"
            :disable="!state.commentText || !state.commentText.trim() || state.savingComment"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useQuasar } from 'quasar';
import { useChronicle } from '@composables/use-chronicle';
import { observationService } from '@services/observation.service';
import { DPage } from '@components';
import type { IReadingEntity, ReadingType } from '@database/repositories/reading.repository';
import { QTableColumn } from 'quasar';
import { toAbsoluteTimeString } from '@utils/date-time';

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
    const $q = useQuasar();
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
      showCommentDialog: false,
      selectedReading: null as IReadingEntity | null,
      commentText: '',
      savingComment: false,
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
        return toAbsoluteTimeString(dateStr, true);
      },

      openCommentDialog: (reading: IReadingEntity) => {
        state.selectedReading = reading;
        state.commentText = '';
        state.showCommentDialog = true;
      },

      saveComment: async () => {
        const currentChronicle = chronicle.sharedState.currentChronicle;
        if (!currentChronicle || !state.selectedReading?.id || !state.commentText.trim() || state.savingComment) {
          return;
        }

        state.savingComment = true;
        try {
          await observationService.appendReadingComment(
            state.selectedReading.id,
            state.commentText,
            currentChronicle.id
          );
          await chronicle.methods.refreshReadings();
          state.showCommentDialog = false;
          state.selectedReading = null;
          state.commentText = '';
          $q.notify({
            type: 'positive',
            message: 'Commentaire ajouté',
            position: 'top',
          });
        } catch (error) {
          console.error('Failed to add comment:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'ajout du commentaire',
            position: 'top',
          });
        } finally {
          state.savingComment = false;
        }
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
  background-color: var(--background, #fff);
  color: var(--text, #000);
}

.search-input {
  width: 100%;
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
    background-color: var(--background, #fff);
    color: var(--text, #000);
  }
}

.empty-state {
  position: absolute;
  inset: 0;
  display: flex;
  padding: 2rem;
}

.reading-name {
  color: var(--text, #000);
  font-weight: 500;
}

.comment-reading {
  color: #3b82f6 !important;
  font-weight: 500;
}

.reading-description {
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: pre-wrap;
}


:deep(.search-input .q-field__control) {
  min-height: 48px;
}

:deep(.search-input .q-field__append .q-icon),
:deep(.search-input .q-field__prepend .q-icon) {
  font-size: 20px;
}

.readings-table {
  :deep(.q-table__middle) {
    background-color: var(--background, #fff);
    color: var(--text, #000);
  }

  :deep(.q-table tbody tr) {
    min-height: 56px;
    cursor: pointer;
  }

  :deep(.q-table tbody td) {
    padding: 14px 12px;
    font-size: 14px;
  }
}

.reading-type-chip {
  min-height: 32px;
  padding: 0 10px;
  font-weight: 600;
}
</style>
