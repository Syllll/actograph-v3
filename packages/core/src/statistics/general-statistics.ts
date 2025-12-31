import { ReadingTypeEnum, ProtocolItemTypeEnum, ProtocolItemActionEnum } from '../enums';
import {
  IReading,
  IProtocolItem,
  IGeneralStatistics,
  ICategoryStatisticsSummary,
} from '../types';
import { calculatePausePeriods } from './period-calculator';
import {
  calculateContinuousObservableDurations,
  calculateDiscreteObservableCount,
} from './category-statistics';

/**
 * Calculate general statistics for an observation
 */
export function calculateGeneralStatistics(
  readings: IReading[],
  protocolItems: IProtocolItem[],
): IGeneralStatistics {
  if (!readings || readings.length === 0) {
    return {
      totalDuration: 0,
      totalReadings: 0,
      pauseCount: 0,
      pauseDuration: 0,
      observationDuration: 0,
      categories: [],
    };
  }

  const sortedReadings = [...readings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
  );

  // Find START and STOP readings
  const startReading = sortedReadings.find((r) => r.type === ReadingTypeEnum.START);
  const stopReading = sortedReadings.find((r) => r.type === ReadingTypeEnum.STOP);

  if (!startReading || !stopReading) {
    return {
      totalDuration: 0,
      totalReadings: sortedReadings.length,
      pauseCount: 0,
      pauseDuration: 0,
      observationDuration: 0,
      categories: [],
    };
  }

  const totalDuration =
    stopReading.dateTime.getTime() - startReading.dateTime.getTime();

  // Calculate pause duration
  const pausePeriods = calculatePausePeriods(sortedReadings);
  const pauseDuration = pausePeriods.reduce(
    (sum, period) => sum + (period.end.getTime() - period.start.getTime()),
    0,
  );
  const pauseCount = pausePeriods.length;
  const observationDuration = totalDuration - pauseDuration;

  // Calculate category summaries
  const categories = calculateCategorySummaries(
    protocolItems,
    sortedReadings,
    pausePeriods,
    stopReading.dateTime,
  );

  return {
    totalDuration,
    totalReadings: sortedReadings.length,
    pauseCount,
    pauseDuration,
    observationDuration,
    categories,
  };
}

/**
 * Calculate category summaries for general statistics
 */
export function calculateCategorySummaries(
  protocolItems: IProtocolItem[],
  readings: IReading[],
  pausePeriods: Array<{ start: Date; end: Date }>,
  observationEnd: Date,
): ICategoryStatisticsSummary[] {
  const categories = protocolItems.filter(
    (item) => item.type === ProtocolItemTypeEnum.Category,
  );

  if (!categories.length) {
    return [];
  }

  return categories.map((category) => {
    const observables = category.children || [];
    let totalCategoryDuration = 0;
    let activeObservablesCount = 0;

    // Check if category is continuous (only continuous categories have duration)
    const isContinuous = !category.action || category.action === ProtocolItemActionEnum.Continuous;

    for (const observable of observables) {
      if (isContinuous) {
        // For continuous categories: calculate duration
        const durations = calculateContinuousObservableDurations(
          observable.name || '',
          observables.map((o) => o.name || ''),
          readings,
          pausePeriods,
          observationEnd,
        );

        if (durations.onDuration > 0) {
          totalCategoryDuration += durations.onDuration;
          activeObservablesCount++;
        }
      } else {
        // For discrete categories: only count occurrences
        const count = calculateDiscreteObservableCount(
          observable.name || '',
          readings,
        );

        if (count > 0) {
          activeObservablesCount++;
        }
      }
    }

    return {
      categoryId: category.id,
      categoryName: category.name || '',
      activeObservablesCount,
      totalDuration: totalCategoryDuration,
    };
  });
}

