import { nextTick } from 'vue';
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useObservation } from 'src/composables/use-observation';
import { useCloud } from 'src/composables/use-cloud';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { exportService } from '@services/observations/export.service';
import { importService } from '@services/observations/import.service';
import { protocolService } from '@services/observations/protocol.service';
import CreateObservationDialog from '@pages/userspace/home/_components/active-chronicle/CreateObservationDialog.vue';
import SaveAsDialog from '@pages/userspace/home/_components/active-chronicle/SaveAsDialog.vue';
import MergeObservationsDialog from '@pages/userspace/home/_components/my-observations/MergeObservationsDialog.vue';
import CloudLoginDialog from '@pages/userspace/home/_components/cloud/CloudLoginDialog.vue';
import CloudSyncDialog from '@pages/userspace/home/_components/cloud/CloudSyncDialog.vue';

/**
 * Single source of truth for all chronicle-related actions
 * (create, import, export, save-as, merge, cloud, load example).
 *
 * Every UI surface (drawer, home page, active-chronicle card…) should
 * delegate to these methods instead of reimplementing the logic.
 */
export const useChronicleActions = () => {
  const $q = useQuasar();
  const router = useRouter();
  const { t } = useI18n();
  const observation = useObservation();
  const cloud = useCloud();

  const createObservation = async () => {
    const diagRes = await createDialog({
      component: CreateObservationDialog,
      componentProps: {},
      persistent: true,
    });

    if (!diagRes || diagRes === false) {
      return;
    }

    const createOptions: {
      name: string;
      description?: string;
      mode: any;
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
          observation.sharedState.currentObservation.id,
        );
        await observation.protocol.methods.loadProtocol(
          observation.sharedState.currentObservation,
        );
      }

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));
      await router.push({ name: 'user_home' });
    } catch (error) {
      console.error('createObservation failed:', error);
      $q.notify({
        type: 'negative',
        message: t('chronicleActions.createError'),
        caption:
          error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  };

  const importObservation = async () => {
    if (!window.api || !window.api.showOpenDialog || !window.api.readFile) {
      $q.notify({
        type: 'negative',
        message: t('dialogs.createObservation.electronUnavailable'),
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
          { name: t('cloud.chronicFiles'), extensions: ['jchronic', 'chronic'] },
          { name: t('dialogs.createObservation.allFiles'), extensions: ['*'] },
        ],
      });

      if (dialogResult.canceled || !dialogResult.filePaths || dialogResult.filePaths.length === 0) {
        return;
      }

      const newObservation = await importService.importFromFile(dialogResult.filePaths[0]);
      await observation.methods.loadObservation(newObservation.id);

      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 150));

      $q.notify({
        type: 'positive',
        message: t('chronicleActions.importSuccess'),
        caption: newObservation.name,
      });
    } catch (error: any) {
      console.error('importObservation failed:', error);
      $q.notify({
        type: 'negative',
        message: t('chronicleActions.importError'),
        caption:
          error?.response?.data?.message ||
          error?.message ||
          t('common.unknownError'),
      });
    }
  };

  const exportObservation = async () => {
    const currentObservation = observation.sharedState.currentObservation;

    if (!currentObservation) {
      $q.notify({
        type: 'warning',
        message: t('chronicleActions.exportNoChronicle'),
      });
      return;
    }

    if (!currentObservation.id) {
      $q.notify({
        type: 'negative',
        message: t('chronicleActions.exportMissingId'),
      });
      return;
    }

    try {
      const filePath = await exportService.exportObservation(currentObservation);

      if (filePath) {
        $q.notify({
          type: 'positive',
          message: t('chronicleActions.exportSuccess'),
          caption: t('chronicleActions.exportSavedTo', { path: filePath }),
          timeout: 10000,
          actions: window.api?.showItemInFolder
            ? [{
                label: t('chronicleActions.openContainingFolder'),
                color: 'white',
                handler: () => { window.api?.showItemInFolder(filePath); },
              }]
            : undefined,
        });
      }
    } catch (error) {
      console.error('exportObservation failed:', error);
      $q.notify({
        type: 'negative',
        message: t('chronicleActions.exportError'),
        caption:
          error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  };

  const saveAsObservation = async () => {
    const currentObservation = observation.sharedState.currentObservation;

    if (!currentObservation) {
      $q.notify({
        type: 'warning',
        message: t('chronicleActions.saveAsNoChronicle'),
      });
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
        message: t('chronicleActions.saveAsSuccess'),
        caption: newObservation.name,
      });
    } catch (error) {
      console.error('saveAsObservation failed:', error);
      $q.notify({
        type: 'negative',
        message: t('chronicleActions.saveAsError'),
        caption:
          error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  };

  const mergeObservations = async () => {
    const mergedObservation = await createDialog({
      component: MergeObservationsDialog,
      componentProps: {},
      persistent: true,
    });

    if (
      !mergedObservation ||
      typeof mergedObservation !== 'object' ||
      !('id' in mergedObservation) ||
      typeof (mergedObservation as { id: unknown }).id !== 'number'
    ) {
      return;
    }

    const merged = mergedObservation as { id: number; name?: string };

    try {
      await observation.methods.loadObservation(merged.id);
      await nextTick();
      await new Promise(resolve => setTimeout(resolve, 100));

      $q.notify({
        type: 'positive',
        message: t('chronicleActions.mergeSuccess'),
        caption: merged.name,
      });
      await router.push({ name: 'user_home' });
    } catch (error) {
      console.error('mergeObservations load failed:', error);
      $q.notify({
        type: 'negative',
        message: t('chronicleActions.mergeLoadError'),
        caption:
          error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  };

  const openCloud = async () => {
    await cloud.methods.init();

    if (!cloud.sharedState.isAuthenticated) {
      $q.dialog({
        component: CloudLoginDialog,
      }).onOk(() => {
        openCloudSyncDialog();
      });
    } else {
      openCloudSyncDialog();
    }
  };

  const openCloudSyncDialog = () => {
    $q.dialog({
      component: CloudSyncDialog,
    }).onOk((result: { action: string; observationId?: number }) => {
      if (result.action === 'logout') {
        openCloud();
      }
    });
  };

  const loadExample = async () => {
    try {
      const exampleObservation = await observation.methods.cloneExampleObservation();
      await observation.methods.loadObservation(exampleObservation.id);
    } catch (error) {
      console.error('loadExample failed:', error);
      $q.notify({
        type: 'negative',
        message: t('chronicleActions.loadExampleError'),
        caption:
          error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  };

  return {
    createObservation,
    importObservation,
    exportObservation,
    saveAsObservation,
    mergeObservations,
    openCloud,
    loadExample,
  };
};
