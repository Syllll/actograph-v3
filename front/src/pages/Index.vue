<template>
  <router-view />
  <UpdateModal v-model:trigger-open="state.showUpdateModal" />
</template>

<script lang="ts">
import { defineComponent, ref, onMounted, reactive } from 'vue';
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

export default defineComponent({
  components: {
    UpdateModal,
    AutosaveFilePicker,
  },
  setup() {
    const $q = useQuasar();
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

      // Check for autosave files to restore
      await checkAndRestoreAutosave();

      // Setup update checking
      systemService.onUpdateAvailable(async () => {
        const dialogResponse = await createDialog({
          title: 'Mise à jour disponible',
          message:
            "Une mise à jour est disponible. Souhaitez-vous l'installer ?",
          cancel: 'Non',
          ok: 'Oui',
          persistent: true,
        });
        if (!dialogResponse) {
          // Return and do nothing if the user clicks on cancel
          return;
        }
        state.showUpdateModal = true;
      });

      systemService.readyToCheckUpdates();
    });

    /**
     * Check for autosave files and propose restoration if needed
     */
    const checkAndRestoreAutosave = async () => {
      try {
        const files = await autosaveService.listAutosaveFiles();

        if (files.length === 0) {
          return;
        }

        // Filter recent files (within last 24 hours) and sort by date (most recent first)
        const now = Date.now();
        const recentFiles = files
          .filter((file) => {
            const fileTime = new Date(file.modified).getTime();
            const ageHours = (now - fileTime) / (1000 * 60 * 60);
            return ageHours < 24; // Files from last 24 hours
          })
          .sort(
            (a, b) =>
              new Date(b.modified).getTime() - new Date(a.modified).getTime()
          );

        if (recentFiles.length === 0) {
          return;
        }

        // Check if we should propose restoration
        const currentObservation = observation.sharedState.currentObservation;
        const mostRecentAutosaveTime = new Date(recentFiles[0].modified).getTime();

        // Only propose restoration if:
        // 1. No observation is loaded, OR
        // 2. Current observation is older than the most recent autosave
        let shouldProposeRestore = false;
        if (!currentObservation) {
          shouldProposeRestore = true;
        } else if (currentObservation.updatedAt) {
          const observationTime = new Date(currentObservation.updatedAt).getTime();
          // Only propose if autosave is newer than current observation
          if (mostRecentAutosaveTime > observationTime) {
            shouldProposeRestore = true;
          }
        }

        if (!shouldProposeRestore) {
          return;
        }

        // Show file picker dialog directly (no intermediate dialog)
        const selectedFile = await new Promise<{
          name: string;
          path: string;
          size: number;
          modified: string;
        } | null>((resolve) => {
          $q.dialog({
            component: AutosaveFilePicker,
            componentProps: {
              files: recentFiles,
            },
          })
            .onOk((file: { name: string; path: string; size: number; modified: string }) => {
              resolve(file);
            })
            .onCancel(() => {
              resolve(null);
            });
        });

        if (!selectedFile) {
          // User cancelled, do nothing
          return;
        }

        try {
          // Import the autosave file (this creates a new observation)
          const restoredObservation = await importService.importFromFile(
            selectedFile.path
          );

          // Rename the restored observation with prefix
          if (restoredObservation.id) {
            const originalName = restoredObservation.name;
            const restoredName = `Restauration auto - ${originalName}`;
            
            await observationService.update(restoredObservation.id, {
              name: restoredName,
            });

            // Reload the observation with the new name
            await observation.methods.loadObservation(restoredObservation.id);
          }

          // Delete the autosave file after successful restoration
          await autosaveService.deleteAutosaveFile(selectedFile.path);

          $q.notify({
            type: 'positive',
            message: 'Restauration réussie',
            caption: `L'observation "${restoredObservation.name}" a été restaurée`,
          });
        } catch (error) {
          console.error('Error restoring autosave:', error);
          $q.notify({
            type: 'negative',
            message: 'Erreur lors de la restauration',
            caption: error instanceof Error ? error.message : 'Erreur inconnue',
          });
        }
      } catch (error) {
        console.error('Error checking autosave files:', error);
      }
    };

    return {
      state,
      observation,
    };
  },
});
</script>
