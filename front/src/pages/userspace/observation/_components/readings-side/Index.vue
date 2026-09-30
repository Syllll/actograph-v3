<template>
  <div class="readings-side-container">
    <div ref="contentRef" class="readings-side-content q-pa-sm column">
      <!-- Toolbar with search, add, and remove buttons -->
      <readings-toolbar
        class="col-auto"
        v-model:search="search"
        :match-count="filteredReadings.length"
        :is-add-disabled="false"
        :can-activate-chronometer-mode="canActivateChronometerMode"
        @add-reading="handleAddReading"
        @add-comment="handleAddComment"
        @activate-chronometer-mode="handleActivateChronometerMode"
        @auto-correct-readings="handleAutoCorrectReadings"
        @replace-all="handleReplaceAll"
      />

      <div class="col table-wrapper">
        <readings-table
          :readings="filteredReadings"
          :can-clear-all="hasReadings"
          @remove-reading="handleRemoveReading"
          @duplicate-reading="handleDuplicateReading"
          @clear-all="handleClearAllWithConfirm"
        />
      </div>

      <readings-after-last-stop-banner
        v-if="hasReadingsAfterLastStop"
        class="readings-scope-warning q-mt-sm"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { useReadings } from 'src/composables/use-observation/use-readings';
import { IReading, ReadingTypeEnum, ObservationModeEnum } from '@services/observations/interface';
import ReadingsToolbar from './ReadingsToolbar.vue';
import ReadingsTable from './ReadingsTable.vue';
import ReadingsAfterLastStopBanner from 'src/pages/userspace/_components/ReadingsAfterLastStopBanner.vue';
import { useObservation } from 'src/composables/use-observation';
import { useQuasar } from 'quasar';
import { useI18n } from 'vue-i18n';
import { hasReadingsAfterLastStop as detectReadingsAfterLastStop } from '@actograph/core';
import { Dialog } from 'quasar';
import AutoCorrectReadingsDialog from './AutoCorrectReadingsDialog.vue';
import AddCommentDialog from './AddCommentDialog.vue';
import ReadingsConfirmDialog from './ReadingsConfirmDialog.vue';

export default defineComponent({
  name: 'ReadingsSideIndex',
  
  components: {
    ReadingsToolbar,
    ReadingsTable,
    ReadingsAfterLastStopBanner,
    AutoCorrectReadingsDialog,
  },

  emits: ['content-width'],

  setup(_, { emit }) {
    const $q = useQuasar();
    const { t } = useI18n();
    const observation = useObservation();
    // Use the readings composable to access shared state and methods
    const { sharedState, methods } = observation.readings;

    // Local state for this component
    const search = ref('');
    const contentRef = ref<HTMLElement | null>(null);
    let contentResizeObserver: ResizeObserver | null = null;

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

    const handleAddReading = () => {
      methods.addReading();
    };

    const handleDuplicateReading = (source: IReading) => {
      if (!source) return;
      methods.addReading(
        {
          name: source.name,
          description: source.description,
          type: source.type,
          dateTime: source.dateTime ? new Date(source.dateTime) : new Date(),
        },
        source,
      );
    };

    // Handler for adding a comment (Bug 2.7 - Bouton Commentaire BULLE)
    // Opens a prompt dialog, then creates a reading with name '# ' + commentText
    // Uses current observation timestamp (currentDate + elapsedTime)
    const handleAddComment = () => {
      if (!observation.sharedState.currentObservation) {
        $q.notify({
          type: 'negative',
          message: t('chronicleActions.saveAsNoChronicle'),
        });
        return;
      }

      Dialog.create({
        component: AddCommentDialog,
      }).onOk((commentText: string) => {
        const trimmed = String(commentText).trim();
        if (!trimmed) return;

        methods.addReading({
          name: '# ' + trimmed,
          type: ReadingTypeEnum.DATA,
          currentDate: observation.sharedState.currentDate || new Date(),
          elapsedTime: observation.sharedState.elapsedTime ?? 0,
        });
      });
    };

    const handleRemoveAllReadings = () => {
      methods.removeAllReadings();
    };

    const handleClearAllWithConfirm = () => {
      Dialog.create({
        component: ReadingsConfirmDialog,
        componentProps: {
          title: t('readingsUi.clearAllTitle'),
          message: t('readingsUi.clearAllMessage'),
          okLabel: t('readingsUi.clearAllOk'),
          destructive: true,
        },
      }).onOk(() => {
        handleRemoveAllReadings();
      });
    };

    const handleRemoveReading = (readingToRemove: IReading) => {
      if (!readingToRemove) return;

      Dialog.create({
        component: ReadingsConfirmDialog,
        componentProps: {
          title: t('readingsUi.deleteReadingTitle'),
          message: t('readingsUi.deleteReadingMessage'),
          okLabel: t('readingsUi.deleteReadingOk'),
          destructive: true,
        },
      }).onOk(() => {
        methods.removeReading(readingToRemove);
      });
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

    // Handler for replace all filtered readings (search is a filter, not a selection).
    const handleReplaceAll = async ({ search: searchTerm, replace: replaceValue }: { search: string; replace: string }) => {
      const searchLower = searchTerm.toLowerCase();
      const matchCount = filteredReadings.value.filter((reading) =>
        reading.name?.toLowerCase().includes(searchLower)
      ).length;

      const confirmed = await new Promise<boolean>((resolve) => {
        Dialog.create({
          component: ReadingsConfirmDialog,
          componentProps: {
            title: t('readingsUi.replaceAllTitle'),
            message: t('readingsUi.replaceAllMessage', {
              search: searchTerm,
              replace: replaceValue,
              count: matchCount,
            }),
            okLabel: t('readingsUi.replaceAllOk'),
            destructive: false,
          },
        })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
          .onDismiss(() => resolve(false));
      });

      if (!confirmed) return;

      const escapedSearch = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escapedSearch, 'gi');
      // Snapshot identities first: updateReading replaces objects and re-sorts.
      const replacements = filteredReadings.value
        .filter((reading) => reading.name?.toLowerCase().includes(searchLower))
        .map((reading) => ({
          identity: { id: reading.id, tempId: reading.tempId },
          name: (reading.name ?? '').replace(regex, replaceValue),
        }));

      for (const replacement of replacements) {
        methods.updateReading(replacement.identity, { name: replacement.name });
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
      const confirmed = await new Promise<boolean>((resolve) => {
        Dialog.create({
          component: ReadingsConfirmDialog,
          componentProps: {
            title: t('observation.activateChronometerTitle'),
            message: t('observation.activateChronometerMessage'),
            okLabel: t('observation.activateChronometerOk'),
            destructive: false,
          },
        })
          .onOk(() => resolve(true))
          .onCancel(() => resolve(false))
          .onDismiss(() => resolve(false));
      });

      if (!confirmed) return;
      
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

    const hasReadings = computed(() => sharedState.currentReadings.length > 0);

    const measureContentWidth = () => {
      const root = contentRef.value;
      if (!root) return;
      const headerRow = root.querySelector('table.q-table thead tr');
      if (!(headerRow instanceof HTMLElement)) return;
      const cells = headerRow.querySelectorAll('th');
      if (cells.length === 0) return;
      let tableWidth = 0;
      cells.forEach((cell) => {
        tableWidth += Math.max(cell.scrollWidth, cell.offsetWidth);
      });
      if (tableWidth < 80) return;
      // Table thead only: the search/replace toolbar width must not clamp the splitter.
      const styles = window.getComputedStyle(root);
      const padding =
        (Number.parseFloat(styles.paddingLeft) || 0)
        + (Number.parseFloat(styles.paddingRight) || 0);
      emit('content-width', Math.ceil(tableWidth + padding));
    };

    watch(filteredReadings, () => {
      void nextTick(measureContentWidth);
    });

    onMounted(() => {
      void nextTick(() => {
        measureContentWidth();
        const table = contentRef.value?.querySelector('table.q-table');
        if (table && typeof ResizeObserver !== 'undefined') {
          contentResizeObserver = new ResizeObserver(() => {
            measureContentWidth();
          });
          contentResizeObserver.observe(table);
        }
      });
    });

    // Lifecycle hook: synchronize readings when component is unmounted
    onBeforeUnmount(() => {
      if (contentResizeObserver) {
        contentResizeObserver.disconnect();
        contentResizeObserver = null;
      }
      if (!observation.sharedState.currentObservation?.id) {
        return;
      }
      void methods.synchronizeReadings();
    });

    return {
      t,
      search,
      contentRef,
      filteredReadings,
      canActivateChronometerMode,
      hasReadingsAfterLastStop,
      hasReadings,
      handleAddReading,
      handleDuplicateReading,
      handleAddComment,
      handleRemoveReading,
      handleClearAllWithConfirm,
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
  overflow: auto;
  position: relative;
}
</style>
