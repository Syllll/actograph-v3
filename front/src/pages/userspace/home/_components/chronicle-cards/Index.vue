<template>
  <div class="chronicle-cards">
    <div class="cards-header row items-center justify-between q-mb-md">
      <div class="text-subtitle1 text-weight-bold text-primary">
        📁 Mes chroniques
      </div>
      <q-btn
        label="Nouvelle"
        icon="mdi-plus"
        flat
        dense
        no-caps
        color="accent"
        size="sm"
        @click="methods.createNewObservation"
      />
    </div>

    <!-- Barre de recherche -->
    <DSearchInput
      v-model:searchText="state.searchText"
      placeholder="Rechercher..."
      class="q-mb-md"
      @update:searchText="methods.handleSearch"
    />

    <!-- Loading state -->
    <div v-if="state.loading" class="loading-state">
      <q-spinner-dots size="40px" color="accent" />
    </div>

    <!-- Grille de cards -->
    <div v-else-if="state.chronicles.length > 0" class="cards-grid">
      <div
        v-for="chronicle in state.chronicles"
        :key="chronicle.id"
        class="chronicle-card"
        :class="{ 'card-active': isActive(chronicle.id) }"
        @click="methods.loadChronicle(chronicle.id)"
      >
        <div class="card-content">
          <div class="card-name">{{ chronicle.name }}</div>
          <div class="card-stats">
            <span class="stat">
              <q-icon name="mdi-database" size="xs" />
              {{ chronicle._readingsCount ?? 0 }}
            </span>
          </div>
          <div class="card-date">
            {{ methods.formatDate(chronicle.updatedAt) }}
          </div>
        </div>
        <div v-if="isActive(chronicle.id)" class="active-badge">
          <q-icon name="mdi-check-circle" size="xs" />
          Active
        </div>
        <div class="card-actions">
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="mdi-download"
            @click.stop="methods.exportChronicle(chronicle)"
          >
            <q-tooltip>Exporter</q-tooltip>
          </q-btn>
          <q-btn
            flat
            round
            dense
            size="sm"
            icon="mdi-delete-outline"
            color="negative"
            @click.stop="methods.deleteChronicle(chronicle)"
          >
            <q-tooltip>Supprimer</q-tooltip>
          </q-btn>
        </div>
      </div>

      <!-- Card "Nouvelle" -->
      <div class="chronicle-card new-card" @click="methods.createNewObservation">
        <q-icon name="mdi-plus" size="lg" color="accent" />
        <div class="text-body2 text-accent q-mt-sm">Nouvelle</div>
      </div>
    </div>

    <!-- État vide -->
    <div v-else class="empty-state">
      <q-icon name="mdi-folder-open-outline" size="xl" color="grey-5" class="q-mb-md" />
      <div class="text-body1 text-grey-7 q-mb-sm">Aucune chronique</div>
      <div class="text-body2 text-grey-6 q-mb-md">
        Créez votre première chronique pour commencer
      </div>
      <q-btn
        label="Nouvelle chronique"
        icon="mdi-plus"
        color="accent"
        no-caps
        @click="methods.createNewObservation"
      />
    </div>

    <!-- Pagination simple -->
    <div v-if="state.totalCount > state.pageSize" class="pagination q-mt-md">
      <q-btn
        flat
        dense
        icon="mdi-chevron-left"
        :disable="state.currentPage === 1"
        @click="methods.prevPage"
      />
      <span class="text-body2 q-mx-md">
        {{ state.currentPage }} / {{ totalPages }}
      </span>
      <q-btn
        flat
        dense
        icon="mdi-chevron-right"
        :disable="state.currentPage >= totalPages"
        @click="methods.nextPage"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed, onMounted, nextTick } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { useQuasar } from 'quasar';
import { observationService } from '@services/observations/index.service';
import { IObservation } from '@services/observations/interface';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import CreateObservationDialog from '../active-chronicle/CreateObservationDialog.vue';
import { exportService } from '@services/observations/export.service';
import { DSearchInput } from '@lib-improba/components/app/inputs';

export default defineComponent({
  name: 'ChronicleCards',
  components: {
    DSearchInput,
  },
  setup() {
    const observation = useObservation();
    const $q = useQuasar();

    const state = reactive({
      chronicles: [] as IObservation[],
      loading: true,
      searchText: '',
      currentPage: 1,
      pageSize: 8,
      totalCount: 0,
      searchTimeout: null as NodeJS.Timeout | null,
    });

    const totalPages = computed(() => Math.ceil(state.totalCount / state.pageSize));

    const isActive = (id: number) => {
      return observation.sharedState.currentObservation?.id === id;
    };

    const methods = {
      async loadChronicles() {
        state.loading = true;
        try {
          const response = await observationService.findWithPagination(
            {
              limit: state.pageSize,
              offset: (state.currentPage - 1) * state.pageSize,
              orderBy: 'updatedAt',
              order: 'DESC',
            },
            {
              searchString: state.searchText || undefined,
            }
          );
          state.chronicles = response.results;
          state.totalCount = response.count;
        } catch (error) {
          console.error('Error loading chronicles:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors du chargement des chroniques',
          });
        } finally {
          state.loading = false;
        }
      },

      handleSearch() {
        if (state.searchTimeout) {
          clearTimeout(state.searchTimeout);
        }
        state.searchTimeout = setTimeout(() => {
          state.currentPage = 1;
          methods.loadChronicles();
        }, 300);
      },

      prevPage() {
        if (state.currentPage > 1) {
          state.currentPage--;
          methods.loadChronicles();
        }
      },

      nextPage() {
        if (state.currentPage < totalPages.value) {
          state.currentPage++;
          methods.loadChronicles();
        }
      },

      async loadChronicle(id: number) {
        await observation.methods.loadObservation(id);
      },

      async createNewObservation() {
        const diagRes = await createDialog({
          component: CreateObservationDialog,
          componentProps: {},
          persistent: true,
        });

        if (!diagRes || diagRes === false) return;

        await new Promise(resolve => setTimeout(resolve, 200));

        const createOptions: any = {
          name: diagRes.name,
          description: diagRes.description,
          mode: diagRes.mode,
        };

        if (diagRes.videoPath) {
          createOptions.videoPath = diagRes.videoPath;
        }

        try {
          await observation.methods.createObservation(createOptions);
          await nextTick();
          methods.loadChronicles();
        } catch (error) {
          console.error('Erreur lors de la création:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la création de la chronique',
          });
        }
      },

      async exportChronicle(chronicle: IObservation) {
        if (!chronicle.id) return;

        try {
          const filePath = await exportService.exportObservation(chronicle);
          if (filePath) {
            $q.notify({
              type: 'positive',
              message: 'Chronique exportée',
              caption: filePath,
            });
          }
        } catch (error) {
          console.error('Erreur lors de l\'export:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'export',
          });
        }
      },

      async deleteChronicle(chronicle: IObservation) {
        $q.dialog({
          title: 'Supprimer la chronique',
          message: `Êtes-vous sûr de vouloir supprimer "${chronicle.name}" ? Cette action est irréversible.`,
          cancel: {
            label: 'Annuler',
            flat: true,
          },
          ok: {
            label: 'Supprimer',
            color: 'negative',
          },
          persistent: true,
        }).onOk(async () => {
          try {
            await observationService.delete(chronicle.id);
            
            // Si c'était la chronique active, réinitialiser l'état
            if (isActive(chronicle.id)) {
              observation.sharedState.currentObservation = null;
              observation.readings.sharedState.currentReadings = [];
              observation.protocol.sharedState.currentProtocol = null;
            }
            
            methods.loadChronicles();
            
            $q.notify({
              type: 'positive',
              message: 'Chronique supprimée',
            });
          } catch (error) {
            console.error('Erreur lors de la suppression:', error);
            $q.notify({
              type: 'negative',
              message: 'Erreur lors de la suppression',
            });
          }
        });
      },

      formatDate(dateString: string | Date | undefined) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'short',
        });
      },
    };

    onMounted(() => {
      methods.loadChronicles();
    });

    return {
      state,
      totalPages,
      isActive,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.chronicle-cards {
  background: var(--background);
  border-radius: 0.75rem;
  padding: 1.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(31, 41, 55, 0.08);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 0.75rem;
}

.chronicle-card {
  background: linear-gradient(135deg, rgba(31, 41, 55, 0.03) 0%, rgba(31, 41, 55, 0.06) 100%);
  border: 1px solid rgba(31, 41, 55, 0.08);
  border-radius: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  min-height: 100px;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    border-color: var(--accent);
    
    .card-actions {
      opacity: 1;
    }
  }
  
  &.card-active {
    border-color: var(--accent);
    background: linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(249, 115, 22, 0.1) 100%);
  }
  
  &.new-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-style: dashed;
    border-color: rgba(31, 41, 55, 0.2);
    background: transparent;
    
    &:hover {
      border-color: var(--accent);
      background: rgba(249, 115, 22, 0.05);
    }
  }
}

.card-content {
  flex: 1;
}

.card-name {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--primary);
  margin-bottom: 0.5rem;
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-stats {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
  
  .stat {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: rgba(31, 41, 55, 0.6);
  }
}

.card-date {
  font-size: 0.7rem;
  color: rgba(31, 41, 55, 0.5);
}

.active-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--accent);
  background: rgba(249, 115, 22, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
}

.card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.25rem;
  margin-top: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s;
}

.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 150px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  text-align: center;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>

