<template>
  <DPage>
    <div class="fit column relative-position">
      <div
        v-if="observation.sharedState.loading"
        class="loading-overlay column items-center justify-center"
      >
        <q-spinner-dots size="48px" color="primary" />
        <div class="text-body2 text-grey-7 q-mt-md">Chargement de la chronique...</div>
      </div>

      <!-- Hero: only when a chronicle is loaded -->
      <div v-if="hasCurrentObservation" class="col-auto q-pa-xs">
        <div class="box">
          <cTitle title="Chronique active" />
          <ActiveChronicle />
        </div>
      </div>

      <!-- Main content row -->
      <div class="col row" style="min-height: 0">
        <div class="col-7 column q-pa-xs">
          <div class="box col column">
            <cTitle class="col-auto" title="Vos chroniques" />
            <MyObservations class="col" mode="compact" />
            <template v-if="!hasCurrentObservation">
              <q-separator class="q-my-sm" />
              <div class="col-auto row items-center justify-center q-gutter-sm q-pb-xs">
                <DSubmitBtn
                  label="Nouvelle chronique"
                  icon="mdi-plus"
                  @click="methods.createNewObservation"
                />
                <q-btn
                  icon="mdi-file-import"
                  label="Importer"
                  outline
                  color="primary"
                  no-caps
                  @click="methods.importObservation"
                />
              </div>
            </template>
          </div>
        </div>
        <div class="col-5 column q-pa-xs">
          <div class="box col column">
            <cTitle class="col-auto" title="Centre d'aide" />
            <FirstSteps class="col" />
          </div>
        </div>
      </div>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, computed, nextTick } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import cTitle from './_components/Title.vue';
import MyObservations from './_components/my-observations/Index.vue';
import FirstSteps from './_components/first-steps/Index.vue';
import ActiveChronicle from './_components/active-chronicle/Index.vue';
import { DSubmitBtn } from '@lib-improba/components';
import { useObservation } from 'src/composables/use-observation';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import CreateObservationDialog from './_components/active-chronicle/CreateObservationDialog.vue';
import { ObservationModeEnum } from '@services/observations/interface';
import { protocolService } from '@services/observations/protocol.service';
import { importService } from '@services/observations/import.service';

export default defineComponent({
  components: {
    cTitle,
    MyObservations,
    FirstSteps,
    ActiveChronicle,
    DSubmitBtn,
  },
  setup() {
    const $q = useQuasar();
    const router = useRouter();
    const observation = useObservation();

    const hasCurrentObservation = computed(
      () => !!observation.sharedState.currentObservation
    );

    const methods = {
      async createNewObservation() {
        const diagRes = await createDialog({
          component: CreateObservationDialog,
          componentProps: {},
          persistent: true,
        });

        if (!diagRes || diagRes === false) {
          return;
        }

        await new Promise(resolve => {
          setTimeout(() => {
            resolve(undefined);
          }, 200);
        });

        const createOptions: {
          name: string;
          description?: string;
          mode: ObservationModeEnum;
          videoPath?: string;
        } = {
          name: diagRes.name,
          description: diagRes.description,
          mode: diagRes.mode,
        };

        if (diagRes.videoPath) {
          createOptions.videoPath = diagRes.videoPath;
        }

        try {
          await observation.methods.createObservation(createOptions);

          if (diagRes.sourceObservationId && observation.sharedState.currentObservation?.id) {
            await protocolService.cloneProtocol(
              diagRes.sourceObservationId,
              observation.sharedState.currentObservation.id
            );
            await observation.protocol.methods.loadProtocol(
              observation.sharedState.currentObservation
            );
          }

          await nextTick();
          await new Promise(resolve => setTimeout(resolve, 100));
          await router.push({ name: 'user_home' });
        } catch (error) {
          console.error('Erreur lors de la création de l\'observation:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la création de la chronique',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      },

      async importObservation() {
        if (!window.api || !window.api.showOpenDialog || !window.api.readFile) {
          $q.notify({
            type: 'negative',
            message: 'L\'API Electron n\'est pas disponible. Cette fonctionnalité nécessite Electron.',
          });
          return;
        }

        try {
          let defaultPath = '';
          if (window.api?.getActographFolder) {
            defaultPath = await window.api.getActographFolder();
          }

          const dialogResult = await window.api.showOpenDialog({
            defaultPath: defaultPath || undefined,
            filters: [
              { name: 'Fichiers Chronique', extensions: ['jchronic', 'chronic'] },
              { name: 'Tous les fichiers', extensions: ['*'] },
            ],
          });

          if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
            return;
          }

          const filePath = dialogResult.filePaths[0];
          const newObservation = await importService.importFromFile(filePath);
          await observation.methods.loadObservation(newObservation.id);

          $q.notify({
            type: 'positive',
            message: 'Chronique importée avec succès',
            caption: newObservation.name,
          });
        } catch (error: any) {
          console.error('Erreur lors de l\'import:', error);
          const errorMessage =
            error?.response?.data?.message ||
            error?.message ||
            'Erreur inconnue lors de l\'import';
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'import de la chronique',
            caption: errorMessage,
          });
        }
      },
    };

    return {
      observation,
      hasCurrentObservation,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.75);
  z-index: 100;
  pointer-events: none;
}

.box {
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid $grey-5;
}
</style>
