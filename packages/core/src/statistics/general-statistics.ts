import { ProtocolItemTypeEnum, ProtocolItemActionEnum } from '../enums';
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
import { scopeReadingsForStatistics } from './reading-scope';

/**
 * Calculate general statistics for an observation
 */
export function calculateGeneralStatistics(
  readings: IReading[],
  protocolItems: IProtocolItem[],
  includePauses = false,
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

  const { scopedReadings, observationStart, observationEnd } =
    scopeReadingsForStatistics(readings);

  if (!observationStart || !observationEnd || scopedReadings.length === 0) {
    return {
      totalDuration: 0,
      totalReadings: scopedReadings.length,
      pauseCount: 0,
      pauseDuration: 0,
      observationDuration: 0,
      categories: [],
    };
  }

  const sortedReadings = [...scopedReadings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
  );

  const totalDuration =
    observationEnd.getTime() - observationStart.getTime();

  const pausePeriods = calculatePausePeriods(sortedReadings);
  const pauseDuration = pausePeriods.reduce(
    (sum, period) => sum + (period.end.getTime() - period.start.getTime()),
    0,
  );
  const pauseCount = pausePeriods.length;
  const observationDuration = includePauses
    ? totalDuration
    : totalDuration - pauseDuration;

  const categories = calculateCategorySummaries(
    protocolItems,
    sortedReadings,
    pausePeriods,
    observationEnd,
    includePauses,
  );

  return {
    totalDuration,
    totalReadings: scopedReadings.length,
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
  includePauses = false,
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
          includePauses,
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

