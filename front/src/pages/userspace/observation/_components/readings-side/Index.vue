<template>
  <div class="readings-side-container">
    <div class="readings-side-content q-pa-sm column">
      <q-banner
        v-if="hasReadingsAfterLastStop"
        dense
        rounded
        class="readings-scope-warning q-mb-sm"
      >
        <template #avatar>
          <q-icon name="warning" color="warning" />
        </template>
        {{ t('graphUi.readingsAfterLastStopWarning') }}
      </q-banner>

      <!-- Toolbar with search, add, and remove buttons -->
      <readings-toolbar
        class="col-auto"
        v-model:search="search"
        :has-selected="hasSelectedReading"
        :match-count="filteredReadings.length"
        :is-add-disabled="false"
        :can-activate-chronometer-mode="canActivateChronometerMode"
        :current-mode="currentObservationMode || undefined"
        @add-reading="handleAddReading"
        @add-comment="handleAddComment"
        @remove-reading="handleRemoveReading"
        @remove-all-readings="handleRemoveAllReadings"
        @activate-chronometer-mode="handleActivateChronometerMode"
        @auto-correct-readings="handleAutoCorrectReadings"
        @replace-selected="handleReplaceSelected"
        @replace-all="handleReplaceAll"
      />

      <div class="col table-wrapper">
        <readings-table
          :readings="filteredReadings"
          v-model:selected="selectedReading"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, watch, onBeforeUnmount, nextTick } from 'vue';
import { useReadings } from 'src/composables/use-observation/use-readings';
import { IReading, ReadingTypeEnum, ObservationModeEnum } from '@services/observations/interface';
import ReadingsToolbar from './ReadingsToolbar.vue';
import ReadingsTable from './ReadingsTable.vue';
import { useObservation } from 'src/composables/use-observation';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { hasReadingsAfterLastStop as detectReadingsAfterLastStop } from '@actograph/core';
import { createDialog } from '@lib-improba/utils/dialog.utils';
import { Dialog } from 'quasar';
import AutoCorrectReadingsDialog from './AutoCorrectReadingsDialog.vue';

export default defineComponent({
  name: 'ReadingsSideIndex',
  
  components: {
    ReadingsToolbar,
    ReadingsTable,
    AutoCorrectReadingsDialog,
  },

  setup() {
    const $q = useQuasar();
    const { t } = useI18n();
    const observation = useObservation();
    // Use the readings composable to access shared state and methods
    const { sharedState, methods } = observation.readings;

    // Local state for this component
    const search = ref('');
    const selectedReading = ref<IReading[]>([]);
    
    // Get current observation mode
    const currentObservationMode = computed(() => {
      return observation.sharedState.currentObservation?.mode || null;
    });
    
    // Check if chronometer mode can be activated
    // Conditions:
    // 1. Observation mode is not Calendar (must be null or Chronometer)
    // 2. Observation has not been started (no reading of type START)
    const canActivateChronometerMode = computed(() => {
      const currentMode = observation.sharedState.currentObservation?.mode;
      const hasStartReading = sharedState.currentReadings.some(
        (reading: IReading) => reading.type === ReadingTypeEnum.START
      );
      
      // Can activate if:
      // - Mode is not Calendar (null or Chronometer)
      // - No START reading exists (observation not started)
      return currentMode !== ObservationModeEnum.Calendar && !hasStartReading;
    });
    
    // Watch for selection changes to keep the composable's selected reading in sync
    // This ensures that other components can access the selected reading via the composable
    watch(selectedReading, (newValue) => {
      methods.selectReading(newValue.length > 0 ? newValue[0] : null);
    }, { immediate: true });
    
    // Computed property to check if a reading is selected
    // Used to enable/disable the remove button in the toolbar
    const hasSelectedReading = computed(() => {
      return selectedReading.value.length > 0;
    });
    
    // Filtered readings based on search query
    // This computed property filters the current readings by name, id, or description
    const filteredReadings = computed(() => {
      let result = [...sharedState.currentReadings];

      // Apply search filter if search query exists
      if (search.value) {
        const searchLower = search.value.toLowerCase();
        result = result.filter(
          (reading) =>
            reading.name?.toLowerCase().includes(searchLower) ||
            reading.id?.toString().toLowerCase().includes(searchLower) ||
            reading.description?.toLowerCase().includes(searchLower)
        );
      }

      return result;
    });

    // Handler for adding a new reading
    // Behavior:
    // - If a reading is selected: creates a copy of the selected reading with all its properties
    // - If no reading is selected: creates a new empty reading
    // After creation, the new reading is automatically selected
    const handleAddReading = () => {
      let newReading: IReading;
      const wasSelected = selectedReading.value.length > 0 && selectedReading.value[0];
      
      // If a reading is selected, create a copy of it
      if (wasSelected) {
        const selected = selectedReading.value[0];
        
        // Create a copy of the selected reading with all its properties
        // Use a slightly later dateTime (+1 second) to avoid exact duplicates
        const copiedDateTime = selected.dateTime 
          ? new Date(new Date(selected.dateTime).getTime() + 1000) // Add 1 second
          : new Date();
        
        newReading = methods.addReading({
          name: selected.name,
          description: selected.description,
          type: selected.type,
          dateTime: copiedDateTime,
        });
      } else {
        // No selection, create a new empty reading with default values
        newReading = methods.addReading();
      }
      
      // Use nextTick to ensure the reading is added to the reactive array before selecting
      // This is important because Vue's reactivity needs to process the array update first
      nextTick(() => {
        // Find the reading in the current readings array by tempId or id
        // This ensures we use the correct reference from the reactive array
        const readingToSelect = sharedState.currentReadings.find(
          (r: IReading) => 
            (newReading.tempId && r.tempId === newReading.tempId) ||
            (newReading.id && r.id === newReading.id)
        );
        
        if (readingToSelect) {
          // Use the reading from the array to ensure proper reactivity
          selectedReading.value = [readingToSelect];
        } else {
          // Fallback: use the returned reading (should not happen in normal flow)
          selectedReading.value = [newReading];
        }
      });
    };

    // Handler for adding a comment (Bug 2.7 - Bouton Commentaire BULLE)
    // Opens a prompt dialog, then creates a reading with name '# ' + commentText
    // Uses current observation timestamp (currentDate + elapsedTime)
    const handleAddComment = async () => {
      if (!observation.sharedState.currentObservation) {
        $q.notify({
          type: 'negative',
          message: t('chronicleActions.saveAsNoChronicle'),
        });
        return;
      }

      const commentText = await createDialog({
        title: t('readingsUi.addCommentTitle'),
        message: t('readingsUi.addCommentPrompt'),
        prompt: {
          model: '',
          type: 'text',
        },
        cancel: t('dialogs.cancel'),
        ok: {
          label: t('readingsUi.addCommentOk'),
          color: 'primary',
        },
        persistent: true,
      });

      if (commentText === false || commentText === undefined) return;

      const trimmed = String(commentText).trim();
      if (!trimmed) return;

      const newReading = methods.addReading({
        name: '# ' + trimmed,
        type: ReadingTypeEnum.DATA,
        currentDate: observation.sharedState.currentDate || new Date(),
        elapsedTime: observation.sharedState.elapsedTime ?? 0,
      });

      nextTick(() => {
        const readingToSelect = sharedState.currentReadings.find(
          (r: IReading) =>
            (newReading.tempId && r.tempId === newReading.tempId) ||
            (newReading.id && r.id === newReading.id)
        );
        selectedReading.value = readingToSelect ? [readingToSelect] : [newReading];
      });
    };

    // Handler for removing all readings
    // This clears the entire readings list
    const handleRemoveAllReadings = () => {
      methods.removeAllReadings();
      // Clear selection after removing all readings
      selectedReading.value = [];
    }

    // Handler for removing a reading
    // This handler removes the currently selected reading from the list
    // It supports both readings with an id (persisted) and tempId (newly created)
    const handleRemoveReading = () => {
      // Safety check: ensure we have a selected reading
      if (selectedReading.value.length === 0 || !selectedReading.value[0]) {
        return;
      }
      
      const readingToRemove = selectedReading.value[0];
      
      // Remove the reading using the composable method
      // Pass the reading object itself so the method can use either id or tempId
      const wasRemoved = methods.removeReading(readingToRemove);
      
      // Clear the selection after removal
      // This ensures the UI reflects that no reading is selected
      if (wasRemoved) {
        selectedReading.value = [];
      }
    };
    
    // Handler for auto-correcting readings
    const handleAutoCorrectReadings = async () => {
      // Analyser les relevés et obtenir les actions proposées
      const result = methods.autoCorrectReadings(false);
      
      if (result.actions.length === 0) {
        $q.notify({
          type: 'positive',
          message: t('readingsUi.autoCorrectNone'),
          caption: t('readingsUi.autoCorrectNoneCaption'),
        });
        return;
      }

      // Afficher le dialog avec les actions proposées
      Dialog.create({
        component: AutoCorrectReadingsDialog,
        componentProps: {
          actions: result.actions,
        },
      }).onOk(async () => {
        // Appliquer les corrections
        methods.autoCorrectReadings(true);
        
        $q.notify({
          type: 'positive',
          message: t('readingsUi.autoCorrectApplied'),
          caption: t('readingsUi.autoCorrectAppliedCaption', {
            count: result.actions.length,
          }),
        });
      });
    };

    // Handler for replace selected reading (Rechercher/Remplacer)
    const handleReplaceSelected = async (replaceValue: string) => {
      if (selectedReading.value.length === 0) return;
      const reading = selectedReading.value[0];
      const searchTerm = search.value;
      if (!searchTerm) return;
      const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      reading.name = (reading.name ?? '').replace(regex, replaceValue);
      await methods.synchronizeReadings();
    };

    // Handler for replace all filtered readings (Rechercher/Remplacer)
    const handleReplaceAll = async ({ search: searchTerm, replace: replaceValue }: { search: string; replace: string }) => {
      const searchLower = searchTerm.toLowerCase();
      const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'gi');
      for (const reading of filteredReadings.value) {
        if (reading.name?.toLowerCase().includes(searchLower)) {
          reading.name = reading.name.replace(regex, replaceValue);
        }
      }
      await methods.synchronizeReadings();
    };

    // Handler for activating chronometer mode
    const handleActivateChronometerMode = async () => {
      // Double check conditions
      if (!canActivateChronometerMode.value) {
        $q.notify({
          type: 'negative',
          message: t('observation.chronometerBlocked'),
          caption: t('observation.chronometerBlockedCaption'),
        });
        return;
      }
      
      // Confirm action
      const dialog = await createDialog({
        title: t('observation.activateChronometerTitle'),
        message: t('observation.activateChronometerMessage'),
        cancel: t('components.DModal.cancel'),
        ok: {
          label: t('observation.activateChronometerOk'),
          color: 'primary',
        },
        persistent: true,
      });
      
      if (!dialog) return;
      
      // Update observation mode
      const observationId = observation.sharedState.currentObservation?.id;
      if (!observationId) {
        $q.notify({
          type: 'negative',
          message: t('observation.errorShort'),
          caption: t('observation.observationNotFoundCaption'),
        });
        return;
      }
      
      try {
        await observation.methods.updateObservation(observationId, {
          mode: ObservationModeEnum.Chronometer,
        });
        
        $q.notify({
          type: 'positive',
          message: t('observation.chronometerActivated'),
          caption: t('observation.chronometerActivatedCaption'),
        });
      } catch (error: any) {
        $q.notify({
          type: 'negative',
          message: t('observation.chronometerActivateError'),
          caption: error.message || t('observation.unknownErrorCaption'),
        });
      }
    };

    const hasReadingsAfterLastStop = computed(() =>
      detectReadingsAfterLastStop(sharedState.currentReadings)
    );

    // Lifecycle hook: synchronize readings when component is unmounted
    onBeforeUnmount(() => {
      void methods.synchronizeReadings();
    });

    return {
      t,
      search,
      selectedReading,
      hasSelectedReading,
      filteredReadings,
      currentObservationMode,
      canActivateChronometerMode,
      hasReadingsAfterLastStop,
      handleAddReading,
      handleAddComment,
      handleRemoveReading,
      handleRemoveAllReadings,
      handleReplaceSelected,
      handleReplaceAll,
      handleActivateChronometerMode,
      handleAutoCorrectReadings,
    };
  },
});
</script>

<style scoped>
.readings-side-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.readings-side-content {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.table-wrapper {
  flex: 1 1 0;
  min-height: 0;
  overflow: hidden;
  position: relative;
}
</style>
