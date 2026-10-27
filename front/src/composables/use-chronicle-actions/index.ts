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
import { observationService } from '@services/observations/index.service';
import type { IObservation } from '@services/observations/interface';
import { usePopout } from 'src/composables/use-popout';
import { useMiniGraph } from 'src/composables/use-mini-graph';
import { waitForPendingReadingSynchronization } from 'src/composables/use-observation/use-readings';
import { observationGraphMetaPersistQueue } from 'src/utils/observation-meta-update';
import {
  deletingObservationIds,
  observationDeletionRevision,
  isObservationMutationBlocked,
  setObservationMutationBlocked,
  markObservationDeleted,
  waitForObservationTasks,
} from 'src/utils/observation-mutation-guard';

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

  const deleteObservation = async (target: Pick<IObservation, 'id' | 'name'>): Promise<boolean> => {
    if (!target.id || isObservationMutationBlocked(target.id)) return false;
    const recording = () => observation.sharedState.currentObservation?.id === target.id
      && (observation.sharedState.isPlaying || observation.sharedState.startTime != null);
    if (recording()) {
      $q.notify({ type: 'warning', message: t('chronicleActions.deleteRecording') });
      return false;
    }
    const confirmed = await new Promise<boolean>((resolve) => {
      $q.dialog({
        title: t('chronicleActions.deleteTitle'),
        message: t('chronicleActions.deleteMessage', { name: target.name }),
        cancel: { label: t('dialogs.cancel'), flat: true, noCaps: true },
        ok: { label: t('chronicleActions.deleteConfirm'), color: 'negative', noCaps: true },
      }).onOk(() => resolve(true)).onDismiss(() => resolve(false));
    });
    if (!confirmed || isObservationMutationBlocked(target.id)) return false;
    if (recording()) {
      $q.notify({ type: 'warning', message: t('chronicleActions.deleteRecording') });
      return false;
    }
    const active = observation.sharedState.currentObservation?.id === target.id;
    setObservationMutationBlocked(target.id, true);
    try {
      if (active) {
        observation.sharedState.loading = true;
        const popout = usePopout();
        popout.requestClose('buttons');
        popout.requestClose('video');
        useMiniGraph().requested.value = false;
        await waitForPendingReadingSynchronization();
      }
      await observationGraphMetaPersistQueue.whenIdle(target.id);
      await waitForObservationTasks(target.id);
      await observationService.delete(target.id);
      markObservationDeleted(target.id);
      if (observation.sharedState.currentObservation?.id === target.id) {
        observation.methods.closeObservation();
        void router.push({ name: 'user_home' }).catch((error: unknown) => console.error('Navigation after deletion failed:', error));
      }
      $q.notify({ type: 'positive', message: t('chronicleActions.deleteSuccess', { name: target.name }) });
      return true;
    } catch (error) {
      console.error('deleteObservation failed:', error);
      $q.notify({ type: 'negative', message: t('chronicleActions.deleteError') });
      return false;
    } finally {
      setObservationMutationBlocked(target.id, false);
      if (active && observation.sharedState.currentObservation?.id === target.id) {
        observation.sharedState.loading = false;
      }
    }
  };

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
      meta?: Record<string, unknown>;
    } = {
      name: diagRes.name,
      description: diagRes.description,
      mode: diagRes.mode,
      ...(diagRes.meta ? { meta: diagRes.meta } : {}),
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
      await router.push({
        name: diagRes.meta?.entryMode === 'manual' && !diagRes.sourceObservationId
          ? 'user_protocol'
          : 'user_observation',
      });
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

  const uploadActiveChronicleToCloud = async () => {
    await cloud.methods.init();

    const currentObservation = observation.sharedState.currentObservation;
    if (!currentObservation?.id) {
      $q.notify({ type: 'warning', message: t('cloud.noActiveChronicle') });
      return;
    }

    if (!cloud.sharedState.isAuthenticated) {
      await openCloud();
      return;
    }

    try {
      const result = await cloud.methods.uploadChronicle(
        currentObservation.id,
        currentObservation.name,
        t('cloud.uploadDescriptionDefault'),
      );

      if (result.success) {
        $q.notify({
          type: 'positive',
          message: t('cloud.uploadSuccess'),
          caption: t('cloud.uploadActiveSuccessCaption', { name: currentObservation.name }),
        });
      } else {
        $q.notify({
          type: 'negative',
          message: t('cloud.uploadError'),
          caption: result.error || t('common.unknownError'),
        });
      }
    } catch (error) {
      console.error('uploadActiveChronicleToCloud failed:', error);
      $q.notify({
        type: 'negative',
        message: t('cloud.uploadError'),
        caption:
          error instanceof Error ? error.message : t('common.unknownError'),
      });
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

  const loadNamedExample = async (exampleKey: string) => {
    try {
      const exampleObservation =
        await observation.methods.cloneExampleObservationByKey(exampleKey);
      await observation.methods.loadObservation(exampleObservation.id);
    } catch (error) {
      console.error('loadNamedExample failed:', error);
      $q.notify({
        type: 'negative',
        message: t('chronicleActions.loadExampleError'),
        caption:
          error instanceof Error ? error.message : t('common.unknownError'),
      });
    }
  };

  return {
    deleteObservation,
    deletingObservationIds,
    observationDeletionRevision,
    createObservation,
    importObservation,
    exportObservation,
    saveAsObservation,
    mergeObservations,
    openCloud,
    uploadActiveChronicleToCloud,
    loadExample,
    loadNamedExample,
  };
};
