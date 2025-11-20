<template>
  <div class="active-chronicle fit column">
    <q-scroll-area class="col">
      <div class="column items-center justify-center fit">
        <!-- Si chronique chargée : afficher les informations -->
        <template v-if="observation.sharedState.currentObservation">
          <!-- Header avec nom de la chronique -->
          <div class="chronicle-header q-pa-md q-mb-md full-width">
            <div class="text-h6 text-weight-bold q-mb-xs text-center">
              {{ observation.sharedState.currentObservation.name }}
            </div>
            <div v-if="observation.sharedState.currentObservation.description" class="text-body2 text-grey-7 q-mt-xs text-center">
              {{ observation.sharedState.currentObservation.description }}
            </div>
          </div>

          <!-- Informations sur la chronique dans une card -->
          <div class="info-card q-pa-md q-mb-md full-width">
            <div class="text-subtitle2 text-weight-bold text-primary q-mb-sm">
              Informations
            </div>
            <div class="column q-gutter-sm">
              <div class="row items-center">
                <q-icon name="mdi-calendar" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  Créée le {{ methods.formatDate(observation.sharedState.currentObservation.createdAt) }}
                </span>
              </div>
              <div class="row items-center">
                <q-icon name="mdi-update" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  Modifiée le {{ methods.formatDate(observation.sharedState.currentObservation.updatedAt) }}
                </span>
              </div>
              <div class="row items-center">
                <q-icon name="mdi-database" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  {{ readingsCount }} relevé{{ readingsCount > 1 ? 's' : '' }}
                </span>
              </div>
              <div v-if="hasReadings" class="row items-center">
                <q-icon name="mdi-clock-outline" size="sm" class="q-mr-sm text-primary" />
                <span class="text-body2">
                  {{ lastReadingDateText }}
                </span>
              </div>
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="q-px-md full-width">
            <q-btn
              label="Charger une autre chronique"
              @click="methods.openSelectDialog"
              outline
              color="accent"
              no-caps
              class="full-width"
            />
          </div>
        </template>

        <!-- Si aucune chronique : afficher les boutons d'action -->
        <template v-else>
          <div class="empty-state q-pa-md q-mb-md text-center full-width">
            <q-icon name="mdi-folder-open-outline" size="64px" class="text-grey-5 q-mb-md" />
            <div class="text-body1 text-grey-7 q-mb-lg">
              Aucune chronique n'est actuellement chargée.
            </div>
            <div class="text-body2 text-grey-6 q-mb-md">
              Créez-en une nouvelle ou importez une chronique existante.
            </div>
          </div>

          <!-- Boutons d'action -->
          <div class="q-px-md q-pb-md full-width">
            <div class="column q-gutter-sm">
              <DSubmitBtn
                label="Nouvelle chronique"
                @click="methods.createNewObservation"
              />
              <q-btn
                label="Importer"
                @click="methods.importObservation"
                outline
                color="primary"
                no-caps
                disabled
                class="full-width"
              />
              <q-btn
                label="Exporter"
                @click="methods.exportObservation"
                outline
                color="primary"
                no-caps
                disabled
                class="full-width"
              />
            </div>
          </div>
        </template>
      </div>
    </q-scroll-area>

    <!-- Dialog de sélection de chronique -->
    <SelectChronicleDialog
      v-model="state.showSelectDialog"
      @selected="methods.loadSelectedObservation"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, reactive, computed } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import SelectChronicleDialog from './SelectChronicleDialog.vue';
import { DSubmitBtn } from '@lib-improba/components';
import { useQuasar } from 'quasar';

export default defineComponent({
  name: 'ActiveChronicle',
  components: {
    SelectChronicleDialog,
    DSubmitBtn,
  },
  setup() {
    const $q = useQuasar();
    const observation = useObservation();

    const state = reactive({
      showSelectDialog: false,
    });

    const hasReadings = computed(() => {
      return observation.readings.sharedState.currentReadings.length > 0;
    });

    const readingsCount = computed(() => {
      return observation.readings.sharedState.currentReadings.length;
    });

    const lastReadingDateText = computed(() => {
      const readings = observation.readings.sharedState.currentReadings;
      if (readings.length === 0) {
        return 'Aucun relevé enregistré';
      }
      
      // Trier par date décroissante pour obtenir le dernier
      const sortedReadings = [...readings].sort((a, b) => {
        const dateA = new Date(a.dateTime).getTime();
        const dateB = new Date(b.dateTime).getTime();
        return dateB - dateA;
      });
      
      const lastReading = sortedReadings[0];
      const date = new Date(lastReading.dateTime);
      return `Dernière observation : ${date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`;
    });

    const methods = {
      formatDate: (dateString: string | Date | undefined) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },

      openSelectDialog: () => {
        state.showSelectDialog = true;
      },

      loadSelectedObservation: async (observationId: number) => {
        await observation.methods.loadObservation(observationId);
        state.showSelectDialog = false;
      },

      createNewObservation: async () => {
        const diagRes = await createDialog({
          title: 'Créer une chronique',
          message: 'Veuillez entrer le nom de votre chronique',
          prompt: {
            model: '',
            type: 'text',
            placeholder: 'Nom de la chronique',
          },
        });

        if (!diagRes) {
          return;
        }

        await observation.methods.createObservation({
          name: diagRes as string,
        });
      },

      importObservation: () => {
        $q.notify({
          type: 'info',
          message: 'Fonctionnalité d\'import à venir',
        });
      },

      exportObservation: () => {
        $q.notify({
          type: 'info',
          message: 'Fonctionnalité d\'export à venir',
        });
      },
    };

    return {
      observation,
      state,
      hasReadings,
      readingsCount,
      lastReadingDateText,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.active-chronicle {
  .chronicle-header {
    background-color: rgba(31, 41, 55, 0.03); // primary color with 3% opacity
    border-left: 3px solid var(--primary);
    border-radius: 0.5rem;
  }

  .info-card {
    background-color: rgba(31, 41, 55, 0.03); // primary color with 3% opacity
    border-left: 3px solid var(--primary);
    border-radius: 0.5rem;
  }

  .empty-state {
    min-height: 200px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
}
</style>

