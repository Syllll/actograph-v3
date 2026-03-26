<template>
  <div class="active-chronicle">
    <template v-if="observation.sharedState.currentObservation">
      <!-- Header: name + stats on one line -->
      <div class="chronicle-header q-pa-md q-mb-sm">
        <div class="row items-center q-mb-xs">
          <div class="text-h5 text-weight-bold text-primary col">
            {{ observation.sharedState.currentObservation.name }}
          </div>
          <q-chip
            v-if="observation.sharedState.currentObservation.mode"
            dense
            size="sm"
            :label="methods.formatMode(observation.sharedState.currentObservation.mode)"
            :color="observation.sharedState.currentObservation.mode === 'chronometer' ? 'blue-2' : 'orange-2'"
            :text-color="observation.sharedState.currentObservation.mode === 'chronometer' ? 'blue-9' : 'orange-9'"
          />
        </div>
        <div v-if="observation.sharedState.currentObservation.description" class="text-body2 text-grey-8 q-mb-sm">
          {{ observation.sharedState.currentObservation.description }}
        </div>
        <div class="row items-center q-gutter-x-md text-body2 text-grey-7">
          <span>
            <q-icon name="mdi-database" size="xs" class="q-mr-xs" />
            {{ readingsCount }} relevé{{ readingsCount > 1 ? 's' : '' }}
          </span>
          <span>
            <q-icon name="mdi-folder-multiple" size="xs" class="q-mr-xs" />
            {{ categoriesCount }} catégorie{{ categoriesCount > 1 ? 's' : '' }}
          </span>
          <span>
            <q-icon name="mdi-eye" size="xs" class="q-mr-xs" />
            {{ observablesCount }} observable{{ observablesCount > 1 ? 's' : '' }}
          </span>
          <span v-if="observation.sharedState.currentObservation.updatedAt">
            <q-icon name="mdi-update" size="xs" class="q-mr-xs" />
            modifié {{ methods.formatRelativeDate(observation.sharedState.currentObservation.updatedAt) }}
          </span>
        </div>
      </div>

      <!-- Primary actions -->
      <div class="q-px-md q-mb-sm">
        <div class="row q-gutter-sm">
          <q-btn
            label="Constituer mon Protocole"
            @click="methods.navigateToProtocol"
            :class="['col', 'action-btn', { 'primary-action': !hasObservables }]"
            :outline="hasObservables"
            color="primary"
            no-caps
          />
          <q-btn
            label="Faire mon observation"
            @click="methods.navigateToObservation"
            :class="['col', 'action-btn', { 'primary-action': hasObservables && !hasReadings }]"
            :outline="hasObservables && hasReadings"
            color="primary"
            no-caps
            :disable="!hasObservables"
          />
          <q-btn
            label="Voir mon graph d'activité"
            @click="methods.navigateToGraph"
            :class="['col', 'action-btn', { 'primary-action': hasObservables && hasReadings }]"
            :outline="!(hasObservables && hasReadings)"
            color="primary"
            no-caps
            :disable="!(hasObservables && hasReadings)"
          />
        </div>
      </div>

      <!-- Secondary actions: single row -->
      <div class="q-px-md">
        <div class="row items-center q-gutter-sm no-wrap">
          <q-btn flat dense no-caps color="primary" icon="mdi-file-export" label="Exporter" @click="methods.exportObservation" />
          <q-btn flat dense no-caps color="primary" icon="mdi-content-save-edit" label="Enregistrer sous" @click="methods.saveAsObservation" />
          <q-btn flat dense no-caps color="primary" icon="merge_type" label="Fusionner" @click="methods.mergeObservations">
            <q-tooltip>Fusionner deux chroniques</q-tooltip>
          </q-btn>
          <q-btn flat dense no-caps color="primary" icon="mdi-file-import" label="Importer" @click="methods.importObservation" />
          <q-space />
          <q-btn
            flat
            dense
            no-caps
            :color="cloud.sharedState.isAuthenticated ? 'positive' : 'primary'"
            :icon="cloud.sharedState.isAuthenticated ? 'mdi-cloud-sync' : 'mdi-cloud-upload'"
            :label="cloud.sharedState.isAuthenticated ? 'Cloud' : 'Cloud'"
            @click="methods.openCloud"
          >
            <q-tooltip>
              {{ cloud.sharedState.isAuthenticated ? 'Gérer le cloud' : 'Se connecter au cloud' }}
            </q-tooltip>
          </q-btn>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, onMounted } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { useCloud } from 'src/composables/use-cloud';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { ProtocolItemTypeEnum } from '@services/observations/interface';
import { exportService } from '@services/observations/export.service';
import { importService } from '@services/observations/import.service';
import SaveAsDialog from './SaveAsDialog.vue';
import MergeObservationsDialog from '../my-observations/MergeObservationsDialog.vue';
import CloudLoginDialog from '../cloud/CloudLoginDialog.vue';
import CloudSyncDialog from '../cloud/CloudSyncDialog.vue';
import { relativeDay } from '@lib-improba/utils/date-format.utils';
import { nextTick } from 'vue';

export default defineComponent({
  name: 'ActiveChronicle',
  setup() {
    const $q = useQuasar();
    const router = useRouter();
    const observation = useObservation();
    const cloud = useCloud();

    onMounted(async () => {
      await cloud.methods.init();
    });

    const hasObservables = computed(() => {
      return observablesCount.value > 0;
    });

    const hasReadings = computed(() => {
      return observation.readings.sharedState.currentReadings.length > 0;
    });

    const readingsCount = computed(() => {
      return observation.readings.sharedState.currentReadings.length;
    });

    const categoriesCount = computed(() => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) {
        return 0;
      }
      return protocol._items.filter(
        (item: any) => item.type === ProtocolItemTypeEnum.Category
      ).length;
    });

    const observablesCount = computed(() => {
      const protocol = observation.protocol.sharedState.currentProtocol;
      if (!protocol || !protocol._items) {
        return 0;
      }
      let count = 0;
      count += protocol._items.filter(
        (item: any) => item.type === ProtocolItemTypeEnum.Observable
      ).length;
      protocol._items.forEach((item: any) => {
        if (item.type === ProtocolItemTypeEnum.Category && item.children) {
          count += item.children.filter(
            (child: any) => child.type === ProtocolItemTypeEnum.Observable
          ).length;
        }
      });
      return count;
    });

    const methods = {
      formatMode(mode: string | null | undefined): string {
        if (mode === 'chronometer') return 'Chronomètre';
        if (mode === 'calendar') return 'Calendrier';
        return '';
      },

      formatRelativeDate(dateString: string | Date | undefined): string {
        if (!dateString) return '';
        return relativeDay(typeof dateString === 'string' ? dateString : dateString.toISOString());
      },

      navigateToProtocol() {
        router.push({ name: 'user_protocol' });
      },

      navigateToObservation() {
        router.push({ name: 'user_observation' });
      },

      navigateToGraph() {
        router.push({ name: 'user_analyse' });
      },

      async exportObservation() {
        const currentObservation = observation.sharedState.currentObservation;
        if (!currentObservation) {
          $q.notify({ type: 'warning', message: 'Aucune chronique chargée à exporter' });
          return;
        }
        if (!currentObservation.id) {
          $q.notify({ type: 'negative', message: 'Impossible d\'exporter : ID manquant' });
          return;
        }

        try {
          const filePath = await exportService.exportObservation(currentObservation);
          if (filePath) {
            $q.notify({
              type: 'positive',
              message: 'Chronique exportée avec succès',
              caption: `Enregistré dans : ${filePath}`,
              timeout: 10000,
              actions: window.api?.showItemInFolder
                ? [{
                    label: 'Ouvrir le dossier',
                    color: 'white',
                    handler: () => { window.api?.showItemInFolder(filePath); },
                  }]
                : undefined,
            });
          }
        } catch (error) {
          console.error('Erreur lors de l\'export:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'export de la chronique',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      },

      async saveAsObservation() {
        const currentObservation = observation.sharedState.currentObservation;
        if (!currentObservation) {
          $q.notify({ type: 'warning', message: 'Aucune chronique chargée' });
          return;
        }

        const newName = await createDialog({
          component: SaveAsDialog,
          componentProps: { currentName: currentObservation.name },
          persistent: true,
        });

        if (!newName || typeof newName !== 'string') {
          return;
        }

        try {
          const newObservation = await exportService.saveAsObservation(currentObservation, newName);
          await observation.methods.loadObservation(newObservation.id);
          $q.notify({
            type: 'positive',
            message: 'Chronique enregistrée sous un nouveau nom',
            caption: newObservation.name,
          });
        } catch (error) {
          console.error('Erreur lors de l\'enregistrement sous:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'enregistrement',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      },

      async importObservation() {
        if (!window.api || !window.api.showOpenDialog || !window.api.readFile) {
          $q.notify({
            type: 'negative',
            message: 'L\'API Electron n\'est pas disponible.',
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

          const newObservation = await importService.importFromFile(dialogResult.filePaths[0]);
          await observation.methods.loadObservation(newObservation.id);

          $q.notify({
            type: 'positive',
            message: 'Chronique importée avec succès',
            caption: newObservation.name,
          });
        } catch (error: any) {
          console.error('Erreur lors de l\'import:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de l\'import de la chronique',
            caption: error?.response?.data?.message || error?.message || 'Erreur inconnue',
          });
        }
      },

      async mergeObservations() {
        const mergedObservation = await createDialog({
          component: MergeObservationsDialog,
          componentProps: {},
          persistent: true,
        });

        if (!mergedObservation || typeof mergedObservation !== 'object') {
          return;
        }

        try {
          await observation.methods.loadObservation(mergedObservation.id);
          await nextTick();
          await new Promise(resolve => setTimeout(resolve, 100));
          $q.notify({
            type: 'positive',
            message: 'Chroniques fusionnées avec succès',
            caption: mergedObservation.name,
          });
          await router.push({ name: 'user_home' });
        } catch (error) {
          console.error('Erreur lors du chargement de la chronique fusionnée:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors du chargement de la chronique fusionnée',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
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
    };

    return {
      observation,
      cloud,
      hasObservables,
      hasReadings,
      readingsCount,
      categoriesCount,
      observablesCount,
      methods,
    };
  },
});
</script>

<style lang="scss" scoped>
.active-chronicle {
  .chronicle-header {
    background: linear-gradient(135deg, rgba(31, 41, 55, 0.08) 0%, rgba(31, 41, 55, 0.05) 100%);
    border-left: 4px solid var(--primary);
    border-radius: 0.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  }

  .action-btn {
    transition: all 0.3s ease;

    &.primary-action {
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    &:not(.primary-action) {
      opacity: 0.7;

      &:hover {
        opacity: 1;
      }
    }
  }
}
</style>
