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

      <!-- ===== Layout A: No chronicle loaded ===== -->
      <template v-if="!hasCurrentObservation">
        <div class="col-auto q-pa-xs">
          <WelcomeHero
            :is-cloud-authenticated="cloud.sharedState.isAuthenticated"
            @create="methods.createNewObservation"
            @import="methods.importObservation"
            @cloud="methods.openCloud"
            @load-example="methods.loadExample"
          />
        </div>

        <div class="col row" style="min-height: 0">
          <div class="col-7 column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" title="Vos chroniques" />
              <MyObservations class="col" />
            </div>
          </div>
          <div class="col-5 column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" title="Centre d'aide" />
              <FirstSteps class="col" />
            </div>
          </div>
        </div>
      </template>

      <!-- ===== Layout B: Chronicle loaded ===== -->
      <template v-else>
        <div class="col-auto q-pa-xs">
          <div class="box">
            <cTitle title="Chronique active" />
            <ActiveChronicle />
          </div>
        </div>

        <div class="col row" style="min-height: 0">
          <div class="col-7 column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" title="Vos chroniques" />
              <MyObservations class="col" />
            </div>
          </div>
          <div class="col-5 column q-pa-xs">
            <div class="box col column">
              <cTitle class="col-auto" title="Centre d'aide" />
              <FirstSteps class="col" />
            </div>
          </div>
        </div>
      </template>
    </div>
  </DPage>
</template>

<script lang="ts">
import { defineComponent, computed, nextTick, onMounted } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import cTitle from './_components/Title.vue';
import MyObservations from './_components/my-observations/Index.vue';
import FirstSteps from './_components/first-steps/Index.vue';
import ActiveChronicle from './_components/active-chronicle/Index.vue';
import WelcomeHero from './_components/welcome-hero/Index.vue';
import { useObservation } from 'src/composables/use-observation';
import { useCloud } from 'src/composables/use-cloud';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import CreateObservationDialog from './_components/active-chronicle/CreateObservationDialog.vue';
import CloudLoginDialog from './_components/cloud/CloudLoginDialog.vue';
import CloudSyncDialog from './_components/cloud/CloudSyncDialog.vue';
import { ObservationModeEnum } from '@services/observations/interface';
import { protocolService } from '@services/observations/protocol.service';
import { importService } from '@services/observations/import.service';

export default defineComponent({
  components: {
    cTitle,
    MyObservations,
    FirstSteps,
    ActiveChronicle,
    WelcomeHero,
  },
  setup() {
    const $q = useQuasar();
    const router = useRouter();
    const observation = useObservation();
    const cloud = useCloud();

    onMounted(async () => {
      await cloud.methods.init();
    });

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

      async openCloud() {
        await cloud.methods.init();

        if (!cloud.sharedState.isAuthenticated) {
          $q.dialog({
            component: CloudLoginDialog,
          }).onOk(() => {
            methods.openCloudSyncDialog();
          });
        } else {
          methods.openCloudSyncDialog();
        }
      },

      openCloudSyncDialog() {
        $q.dialog({
          component: CloudSyncDialog,
        }).onOk((result: { action: string; observationId?: number }) => {
          if (result.action === 'logout') {
            methods.openCloud();
          }
        });
      },

      async loadExample() {
        try {
          const exampleObservation =
            await observation.methods.cloneExampleObservation();
          await observation.methods.loadObservation(exampleObservation.id);
        } catch (error) {
          console.error('Erreur lors du chargement de l\'exemple:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors du chargement de l\'exemple',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      },
    };

    return {
      observation,
      cloud,
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
