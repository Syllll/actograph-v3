<template>
  <DPage :padding="true">
    <!-- Si chronique chargée -->
    <template v-if="chronicle.hasChronicle.value">
      <q-card class="chronicle-card q-mb-md">
        <q-card-section class="chronicle-header">
          <div class="row items-center">
            <q-avatar color="accent" text-color="white" icon="mdi-clipboard-text" size="48px" class="q-mr-md" />
            <div>
              <div class="text-h6">{{ chronicle.sharedState.currentChronicle?.name }}</div>
              <div class="text-caption text-grey">
                {{ chronicle.sharedState.currentChronicle?.description || 'Aucune description' }}
              </div>
            </div>
          </div>
        </q-card-section>

        <q-card-section class="stats-section">
          <div class="row q-gutter-md justify-center">
            <div class="stat-item text-center">
              <q-icon name="mdi-database" size="24px" color="primary" />
              <div class="text-h6 text-weight-bold">{{ chronicle.sharedState.currentReadings.length }}</div>
              <div class="text-caption text-grey">Relevés</div>
            </div>
            <div class="stat-item text-center">
              <q-icon name="mdi-folder-outline" size="24px" color="primary" />
              <div class="text-h6 text-weight-bold">{{ chronicle.sharedState.currentProtocol.length }}</div>
              <div class="text-caption text-grey">Catégories</div>
            </div>
          </div>
        </q-card-section>

        <q-card-actions vertical class="q-pa-md">
          <q-btn
            color="accent"
            label="Faire une observation"
            icon="mdi-binoculars"
            @click="$router.push({ name: 'observation' })"
            class="full-width q-mb-sm"
            unelevated
          />
          <q-btn
            color="primary"
            label="Voir les relevés"
            icon="mdi-table"
            @click="$router.push({ name: 'readings' })"
            class="full-width q-mb-sm"
            unelevated
          />
          <q-btn
            color="primary"
            label="Voir le graphe"
            icon="mdi-chart-line"
            @click="$router.push({ name: 'graph' })"
            :disable="!chronicle.hasReadings.value"
            class="full-width q-mb-sm"
            unelevated
          />
          <q-btn
            flat
            color="grey-7"
            label="Charger une autre chronique"
            icon="mdi-swap-horizontal"
            @click="chronicle.methods.unloadChronicle()"
            class="full-width q-mt-sm"
          />
        </q-card-actions>
      </q-card>
    </template>

    <!-- Si pas de chronique -->
    <template v-else>
      <div class="empty-state q-pa-lg text-center">
        <div class="logo-container q-mb-lg">
          <q-avatar size="80px" color="accent" text-color="white" icon="mdi-clipboard-pulse-outline" />
        </div>
        <div class="text-h5 q-mt-md text-weight-medium">Bienvenue sur ActoGraph</div>
        <div class="text-body1 text-grey q-mb-lg">
          Créez ou chargez une chronique pour commencer
        </div>

        <q-btn
          color="accent"
          label="Nouvelle chronique"
          icon="mdi-plus"
          @click="state.showCreateDialog = true"
          class="q-mb-md"
          size="lg"
          unelevated
        />
      </div>

      <!-- Liste des chroniques existantes -->
      <q-card v-if="state.chronicles.length > 0" class="chronicles-list q-mt-md">
        <q-card-section class="q-pb-none">
          <div class="text-subtitle1 text-weight-medium">Chroniques sur l'appareil</div>
        </q-card-section>

        <q-list separator>
          <q-item
            v-for="chr in state.chronicles"
            :key="chr.id"
            clickable
            @click="methods.loadChronicle(chr.id)"
            class="chronicle-item"
          >
            <q-item-section avatar>
              <q-avatar color="primary" text-color="white" icon="mdi-clipboard-text" />
            </q-item-section>
            <q-item-section>
              <q-item-label class="text-weight-medium">{{ chr.name }}</q-item-label>
              <q-item-label caption>
                <q-icon name="mdi-database" size="12px" class="q-mr-xs" />
                {{ chr.readings_count }} relevés
              </q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-icon name="mdi-chevron-right" color="grey-5" />
            </q-item-section>
          </q-item>
        </q-list>
      </q-card>

      <!-- Empty list state -->
      <div v-else class="text-center q-mt-xl text-grey">
        <q-icon name="mdi-clipboard-text-off-outline" size="48px" />
        <div class="q-mt-sm">Aucune chronique enregistrée</div>
      </div>
    </template>

    <!-- Dialog création -->
    <q-dialog v-model="state.showCreateDialog">
      <q-card style="min-width: 320px" class="create-dialog">
        <q-card-section class="bg-primary text-white">
          <div class="text-h6">Nouvelle chronique</div>
        </q-card-section>

        <q-card-section class="q-pt-md">
          <q-input
            v-model="state.newChronicle.name"
            label="Nom de la chronique"
            outlined
            dense
            autofocus
            :rules="[val => !!val || 'Le nom est requis']"
          />
          <q-input
            v-model="state.newChronicle.description"
            label="Description (optionnel)"
            outlined
            dense
            type="textarea"
            rows="3"
            class="q-mt-md"
          />
        </q-card-section>

        <q-card-actions align="right" class="q-px-md q-pb-md">
          <q-btn flat label="Annuler" color="grey-7" v-close-popup />
          <q-btn
            color="accent"
            label="Créer"
            unelevated
            @click="methods.createChronicle"
            :disable="!state.newChronicle.name"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, reactive, onMounted } from 'vue';
import { useChronicle } from '@composables/use-chronicle';
import { observationService } from '@services/observation.service';
import { DPage } from '@components';
import type { IObservationWithCounts } from '@database/repositories/observation.repository';

export default defineComponent({
  name: 'HomePage',
  components: {
    DPage,
  },
  setup() {
    const chronicle = useChronicle();

    const state = reactive({
      chronicles: [] as IObservationWithCounts[],
      loading: false,
      showCreateDialog: false,
      newChronicle: {
        name: '',
        description: '',
      },
    });

    const methods = {
      loadChronicles: async () => {
        state.loading = true;
        try {
          state.chronicles = await observationService.getAll();
        } finally {
          state.loading = false;
        }
      },

      loadChronicle: async (id: number) => {
        await chronicle.methods.loadChronicle(id);
      },

      createChronicle: async () => {
        try {
          await chronicle.methods.createChronicle({
            name: state.newChronicle.name,
            description: state.newChronicle.description || undefined,
          });
          state.showCreateDialog = false;
          state.newChronicle.name = '';
          state.newChronicle.description = '';
          await methods.loadChronicles();
        } catch (error) {
          console.error('Failed to create chronicle:', error);
        }
      },
    };

    onMounted(() => {
      methods.loadChronicles();
    });

    return {
      chronicle,
      state,
      methods,
    };
  },
});
</script>

<style scoped lang="scss">
.empty-state {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.logo-container {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.9;
  }
}

.chronicle-card {
  border-radius: 16px;
  overflow: hidden;
}

.chronicle-header {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, transparent 100%);
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.stats-section {
  background: rgba(31, 41, 55, 0.02);
}

.stat-item {
  padding: 8px 16px;
  min-width: 80px;
}

.chronicles-list {
  border-radius: 12px;
}

.chronicle-item {
  transition: background-color 0.2s ease;
  
  &:active {
    background-color: rgba(249, 115, 22, 0.1);
  }
}

.create-dialog {
  border-radius: 12px;
  overflow: hidden;
}
</style>
