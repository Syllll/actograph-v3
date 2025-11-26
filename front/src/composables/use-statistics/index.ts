/**
 * Statistics composable
 * Manages statistics data and calculations for observations
 */

import { reactive, computed } from 'vue';
import { useObservation } from 'src/composables/use-observation';
import { statisticsService } from '@services/observations/statistics.service';
import {
  IGeneralStatistics,
  ICategoryStatistics,
  IConditionalStatistics,
  IConditionalStatisticsRequest,
} from '@services/observations/statistics.interface';

const sharedState = reactive({
  generalStatistics: null as IGeneralStatistics | null,
  categoryStatistics: null as ICategoryStatistics | null,
  conditionalStatistics: null as IConditionalStatistics | null,
  loading: false,
  error: null as string | null,
});

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
        sharedState.generalStatistics =
          await statisticsService.getGeneralStatistics(currentObservation.id);
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
        sharedState.categoryStatistics =
          await statisticsService.getCategoryStatistics(
            currentObservation.id,
            categoryId,
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

