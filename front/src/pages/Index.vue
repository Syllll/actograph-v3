<template>
  <router-view />
  <UpdateModal v-model:trigger-open="state.showUpdateModal" />
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, provide, onUnmounted } from 'vue';
import { useQuasar } from 'quasar';
import UpdateModal from '@components/update-modal/Index.vue';
import AutosaveFilePicker from '@components/autosave-file-picker/Index.vue';
import systemService from '@services/system/index.service';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { useObservation } from 'src/composables/use-observation';
import { useAutosave } from 'src/composables/use-autosave';
import { autosaveService } from '@services/observations/autosave.service';
import { importService } from '@services/observations/import.service';
import { observationService } from '@services/observations/index.service';
import { useI18n } from 'vue-i18n';

export default defineComponent({
  components: {
    UpdateModal,
    AutosaveFilePicker,
  },
  setup() {
    const $q = useQuasar();
    const { t } = useI18n();
    const observation = useObservation({
      init: true,
    });

    // Initialize autosave
    const autosave = useAutosave();

    const state = reactive({
      showUpdateModal: false,
    });

    onMounted(async () => {
      // Cleanup old autosave files on startup
      await autosave.methods.cleanupOnStartup();

      // Check if app crashed (brutal exit)
      // We use a timestamp approach: if the app was started recently (< 2 minutes ago)
      // and there's no normal exit flag, it means the app crashed
      const lastStartTime = localStorage.getItem('actograph_last_start');
      const normalExitFlag = localStorage.getItem('actograph_normal_exit');
      const now = Date.now();
      
      // Set current start time FIRST (before checking)
      localStorage.setItem('actograph_last_start', now.toString());
      
      // Clear normal exit flag (will be set again on normal exit)
      if (normalExitFlag) {
        localStorage.removeItem('actograph_normal_exit');
      }
      
      // Only check for autosave restoration if:
      // 1. There was a previous start (not first launch)
      // 2. The previous start was very recent (< 2 minutes ago) - indicates crash
      // 3. There was no normal exit flag (meaning crash)
      let wasCrash = false;
      if (lastStartTime) {
        const startAge = now - parseInt(lastStartTime, 10);
        // Only consider it a crash if the previous start was very recent (< 2 minutes)
        // and there was no normal exit flag
        if (startAge < 2 * 60 * 1000 && !normalExitFlag) {
          wasCrash = true;
        }
        // Clean up old start time (> 1 hour old) to avoid false positives
        if (startAge > 60 * 60 * 1000) {
          localStorage.removeItem('actograph_last_start');
        }
      }

      // DISABLED: Automatic autosave restoration on startup
      // The detection of crashes is unreliable and causes false positives
      // Users can manually restore autosave from the menu (top right > "Restaurer autosave")
      // 
      // If you want to re-enable automatic restoration on crash, uncomment below:
      // 
      // // Only check for autosave restoration if app crashed (brutal exit)
      // // NEVER show automatically on first launch or normal startup
      // if (wasCrash) {
      //   // ... restoration logic ...
      // }

      // Setup update checking (Electron only)
      if (process.env.MODE === 'electron' && window.api) {
        systemService.onUpdateAvailable(async () => {
          const dialogResponse = await createDialog({
            title: t('appRoot.updateAvailableTitle'),
            message: t('appRoot.updateAvailableMessage'),
            cancel: t('appRoot.updateCancel'),
            ok: t('appRoot.updateOk'),
            persistent: true,
          });
          if (!dialogResponse) {
            // Return and do nothing if the user clicks on cancel
            return;
          }
          state.showUpdateModal = true;
        });

        void systemService.readyToCheckUpdates().catch((error) => {
          console.error('Error while checking for updates', error);
        });
      }
    });

    // Set flag on normal exit (beforeunload is called when window closes normally)
    const handleBeforeUnload = () => {
      localStorage.setItem('actograph_normal_exit', 'true');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Cleanup listener on unmount
    onUnmounted(() => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    });

    type AutosaveFile = {
      name: string;
      path: string;
      size: number;
      modified: string;
    };

    const sortAutosaveFiles = (files: AutosaveFile[]) =>
      [...files].sort(
        (a, b) =>
          new Date(b.modified).getTime() - new Date(a.modified).getTime(),
      );

    const filterRecentAutosaveFiles = (files: AutosaveFile[]) => {
      const now = Date.now();
      return sortAutosaveFiles(files).filter((file) => {
        const fileTime = new Date(file.modified).getTime();
        const ageHours = (now - fileTime) / (1000 * 60 * 60);
        return ageHours < 24;
      });
    };

    const isAutosaveNewerThanCurrentObservation = (files: AutosaveFile[]) => {
      if (files.length === 0) {
        return false;
      }

      const currentObservation = observation.sharedState.currentObservation;
      const mostRecentAutosaveTime = new Date(files[0].modified).getTime();

      if (!currentObservation) {
        return true;
      }

      if (!currentObservation.updatedAt) {
        return true;
      }

      const observationTime = new Date(currentObservation.updatedAt).getTime();
      return mostRecentAutosaveTime > observationTime;
    };

    const pickAutosaveFile = (
      files: AutosaveFile[],
      introMode: 'recent' | 'browse',
    ) =>
      new Promise<AutosaveFile | null>((resolve) => {
        $q.dialog({
          component: AutosaveFilePicker,
          componentProps: {
            files,
            introMode,
          },
        })
          .onOk((file: AutosaveFile) => {
            resolve(file);
          })
          .onCancel(() => {
            resolve(null);
          });
      });

    const restoreAutosaveFile = async (selectedFile: AutosaveFile) => {
      const restoredObservation = await importService.importFromFile(
        selectedFile.path,
      );

      let displayName = restoredObservation.name;

      if (restoredObservation.id) {
        displayName = t('appRoot.autosaveRestoreNamePrefix', {
          name: restoredObservation.name,
        });

        await observationService.update(restoredObservation.id, {
          name: displayName,
        });

        await observation.methods.loadObservation(restoredObservation.id);
      }

      await autosaveService.deleteAutosaveFile(selectedFile.path);

      $q.notify({
        type: 'positive',
        message: t('appRoot.restoreSuccess'),
        caption: t('appRoot.restoreSuccessCaption', {
          name: displayName,
        }),
      });
    };

    const confirmBrowseAutosaves = (options: {
      title: string;
      message: string;
      browseLabel?: string;
    }) =>
      new Promise<boolean>((resolve) => {
        $q.dialog({
          class: 'actograph-dialog',
          title: options.title,
          message: options.message,
          cancel: {
            label: t('common.close'),
            flat: true,
          },
          ok: {
            label: options.browseLabel ?? t('appRoot.autosaveBrowseAll'),
            color: 'primary',
          },
        })
          .onOk(() => {
            resolve(true);
          })
          .onCancel(() => {
            resolve(false);
          });
      });

    const runAutosaveRestoreFlow = async (
      files: AutosaveFile[],
      introMode: 'recent' | 'browse',
      options?: { skipUpToDateCheck?: boolean },
    ) => {
      if (files.length === 0) {
        return;
      }

      const selectedFile = await pickAutosaveFile(files, introMode);
      if (!selectedFile) {
        return;
      }

      try {
        await restoreAutosaveFile(selectedFile);
      } catch (error) {
        console.error('Error restoring autosave:', error);
        $q.notify({
          type: 'negative',
          message: t('appRoot.restoreError'),
          caption:
            error instanceof Error ? error.message : t('common.unknownError'),
        });
      }
    };

    /**
     * Check for autosave files and propose restoration if needed
     * Can be called manually from menu or automatically on crash
     */
    const checkAndRestoreAutosave = async () => {
      try {
        const files = await autosaveService.listAutosaveFiles();

        if (files.length === 0) {
          $q.notify({
            type: 'info',
            message: t('appRoot.noAutosaveFiles'),
          });
          return;
        }

        const allFilesSorted = sortAutosaveFiles(files);
        const recentFiles = filterRecentAutosaveFiles(files);

        if (recentFiles.length === 0) {
          const browseAll = await confirmBrowseAutosaves({
            title: t('appRoot.autosaveOlderTitle'),
            message: t('appRoot.autosaveOlderMessage', {
              count: allFilesSorted.length,
            }),
          });
          if (!browseAll) {
            return;
          }

          await runAutosaveRestoreFlow(allFilesSorted, 'browse', {
            skipUpToDateCheck: true,
          });
          return;
        }

        if (!isAutosaveNewerThanCurrentObservation(recentFiles)) {
          const olderCount = allFilesSorted.length - recentFiles.length;
          if (olderCount > 0) {
            const browseAll = await confirmBrowseAutosaves({
              title: t('appRoot.autosaveUpToDateTitle'),
              message: t('appRoot.autosaveUpToDateWithOlder', {
                count: olderCount,
              }),
            });

            if (browseAll) {
              await runAutosaveRestoreFlow(allFilesSorted, 'browse', {
                skipUpToDateCheck: true,
              });
            }
          } else {
            $q.notify({
              type: 'info',
              message: t('appRoot.autosaveUpToDate'),
            });
          }
          return;
        }

        await runAutosaveRestoreFlow(recentFiles, 'recent');
      } catch (error) {
        console.error('Error checking autosave files:', error);
      }
    };

    // Expose method for manual restoration from menu
    const methods = {
      showAutosaveRestore: async () => {
        await checkAndRestoreAutosave();
      },
    };

    // Provide the function for child components to use
    provide('autosaveRestore', methods.showAutosaveRestore);

    return {
      state,
      observation,
      methods,
    };
  },
});
</script>
