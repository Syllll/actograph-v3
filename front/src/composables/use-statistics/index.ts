/**
 * Statistics composable
 * Manages statistics data and calculations for observations
 */

import { reactive, computed, watch } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { statisticsService } from '@services/observations/statistics.service';
import { protocolService } from '@services/observations/protocol.service';
import {
  IGeneralStatistics,
  ICategoryStatistics,
  IConditionalStatistics,
  IConditionalStatisticsRequest,
} from '@services/observations/statistics.interface';
import {
  calculateGeneralStatistics,
  calculateCategoryStatistics,
  scopeReadingsForStatistics,
  ReadingTypeEnum,
  type IReading as ICoreReading,
  type IProtocolItem,
} from '@actograph/core';

const sharedState = reactive({
  generalStatistics: null as IGeneralStatistics | null,
  categoryStatistics: null as ICategoryStatistics | null,
  conditionalStatistics: null as IConditionalStatistics | null,
  loading: false,
  error: null as string | null,
  treatPausesAsSeparateState: true,
  lastCategoryId: null as string | null,
});

let statisticsObservationWatchRegistered = false;

const resetStatisticsCache = () => {
  sharedState.generalStatistics = null;
  sharedState.categoryStatistics = null;
  sharedState.conditionalStatistics = null;
  sharedState.error = null;
  sharedState.lastCategoryId = null;
};

function normalizeReadingsForStatistics(readings: ICoreReading[]): {
  normalizedReadings: ICoreReading[];
  observationStart: Date;
  observationEnd: Date;
} | null {
  const { scopedReadings, observationStart, observationEnd } =
    scopeReadingsForStatistics(readings);

  if (!observationStart || !observationEnd || scopedReadings.length === 0) {
    return null;
  }

  const startT = observationStart.getTime();
  const endT = observationEnd.getTime();
  const normalizedReadings = scopedReadings.map((r) => {
    if (r.type !== ReadingTypeEnum.DATA) {
      return r;
    }
    const t = r.dateTime.getTime();
    if (t < startT || t > endT) {
      return { ...r, dateTime: new Date(Math.max(startT, Math.min(endT, t))) };
    }
    return r;
  });

  return { normalizedReadings, observationStart, observationEnd };
}

function getLocalStatisticsInputs(observation: ReturnType<typeof useObservation>) {
  const readings = observation.readings.sharedState.currentReadings as ICoreReading[];
  const protocol = observation.protocol.sharedState.currentProtocol;
  if (!readings.length || !protocol) {
    return null;
  }

  const normalized = normalizeReadingsForStatistics(readings);
  if (!normalized) {
    return null;
  }

  const protocolItems = protocolService.parseProtocolItems(protocol) as IProtocolItem[];
  return { ...normalized, protocolItems };
}

/**
 * Format duration in milliseconds to human-readable string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}j ${hours % 24}h ${minutes % 60}min`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}min ${seconds % 60}s`;
  }
  if (minutes > 0) {
    return `${minutes}min ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Statistics composable
 */
export const useStatistics = () => {
  const observation = useObservation();

  if (!statisticsObservationWatchRegistered) {
    statisticsObservationWatchRegistered = true;
    watch(
      () => observation.sharedState.currentObservation?.id,
      (observationId, previousObservationId) => {
        if (observationId !== previousObservationId) {
          resetStatisticsCache();
        }
      },
    );
  }

  const methods = {
    /**
     * Load general statistics
     */
    loadGeneralStatistics: async () => {
      const currentObservation = observation.sharedState.currentObservation;
      if (!currentObservation?.id) {
        throw new Error('No observation loaded');
      }

      try {
        sharedState.loading = true;
        sharedState.error = null;

        const includePauses = !sharedState.treatPausesAsSeparateState;
        if (includePauses) {
          const inputs = getLocalStatisticsInputs(observation);
          if (!inputs) {
            sharedState.generalStatistics = {
              totalDuration: 0,
              totalReadings: 0,
              pauseCount: 0,
              pauseDuration: 0,
              observationDuration: 0,
              categories: [],
            };
            return;
          }
          sharedState.generalStatistics = calculateGeneralStatistics(
            inputs.normalizedReadings,
            inputs.protocolItems,
            true,
          );
        } else {
          sharedState.generalStatistics =
            await statisticsService.getGeneralStatistics(currentObservation.id);
        }
      } catch (error) {
        sharedState.error =
          error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        sharedState.loading = false;
      }
    },

    /**
     * Load category statistics
     */
    loadCategoryStatistics: async (categoryId: string) => {
      const currentObservation = observation.sharedState.currentObservation;
      if (!currentObservation?.id) {
        throw new Error('No observation loaded');
      }

      try {
        sharedState.loading = true;
        sharedState.error = null;
        sharedState.lastCategoryId = categoryId;

        const includePauses = !sharedState.treatPausesAsSeparateState;
        if (includePauses) {
          const inputs = getLocalStatisticsInputs(observation);
          if (!inputs) {
            sharedState.categoryStatistics = null;
            return;
          }

          const category = inputs.protocolItems.find(
            (item) => item.id === categoryId,
          );
          if (!category) {
            throw new Error('Category not found');
          }

          sharedState.categoryStatistics = calculateCategoryStatistics(
            category,
            inputs.normalizedReadings,
            inputs.observationStart,
            inputs.observationEnd,
            true,
          );
        } else {
          sharedState.categoryStatistics =
            await statisticsService.getCategoryStatistics(
              currentObservation.id,
              categoryId,
            );
        }
      } catch (error) {
        sharedState.error =
          error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        sharedState.loading = false;
      }
    },

    /**
     * Toggle whether pauses are treated as a separate state (ON) or transparent (OFF).
     * ON: pauses excluded from observable durations, pause segment shown in pie chart.
     * OFF: pauses included in durations, no separate pause segment.
     */
    setTreatPausesAsSeparateState: async (treatPausesAsSeparateState: boolean) => {
      if (sharedState.treatPausesAsSeparateState === treatPausesAsSeparateState) {
        return;
      }

      const categoryIdToReload = sharedState.lastCategoryId;
      sharedState.treatPausesAsSeparateState = treatPausesAsSeparateState;
      sharedState.generalStatistics = null;
      sharedState.categoryStatistics = null;
      sharedState.conditionalStatistics = null;
      sharedState.error = null;

      const reloadTasks: Promise<void>[] = [
        methods.loadGeneralStatistics(),
      ];
      if (categoryIdToReload) {
        reloadTasks.push(
          methods.loadCategoryStatistics(categoryIdToReload),
        );
      }
      await Promise.all(reloadTasks);
    },

    /**
     * Load conditional statistics
     */
    loadConditionalStatistics: async (
      request: IConditionalStatisticsRequest,
    ) => {
      const currentObservation = observation.sharedState.currentObservation;
      if (!currentObservation?.id) {
        throw new Error('No observation loaded');
      }

      try {
        sharedState.loading = true;
        sharedState.error = null;
        sharedState.conditionalStatistics =
          await statisticsService.getConditionalStatistics(
            currentObservation.id,
            request,
          );
      } catch (error) {
        sharedState.error =
          error instanceof Error ? error.message : 'Unknown error';
        throw error;
      } finally {
        sharedState.loading = false;
      }
    },

    /**
     * Format duration helper
     */
    formatDuration,
  };

  const computedState = {
    /**
     * Check if statistics can be calculated (observation has readings)
     */
    canCalculateStatistics: computed(() => {
      const readings =
        observation.readings.sharedState.currentReadings || [];
      return readings.length > 0;
    }),
  };

  return {
    methods,
    sharedState,
    computedState,
  };
};

