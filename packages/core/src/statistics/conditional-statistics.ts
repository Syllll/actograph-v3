import { ReadingTypeEnum, ProtocolItemTypeEnum, ObservableStateEnum, ConditionOperatorEnum } from '../enums';
import {
  IReading,
  IProtocolItem,
  IPeriod,
  IConditionGroup,
  IConditionalStatisticsRequest,
  ICategoryStatistics,
  IObservableStatistics,
} from '../types';
import {
  calculatePausePeriods,
  calculatePauseOverlap,
  intersectPeriods,
  unionPeriods,
  filterByTimeRange,
} from './period-calculator';
import { findObservablePeriods } from './category-statistics';

/**
 * Apply conditions to filter readings periods
 */
export function applyConditions(
  readings: IReading[],
  conditionGroups: IConditionGroup[],
  groupOperator: ConditionOperatorEnum,
): IPeriod[] {
  // For each group, find periods where conditions are met
  const groupPeriods = conditionGroups.map((group) => {
    return applyConditionGroup(readings, group);
  });

  // Combine groups based on operator
  if (groupOperator === ConditionOperatorEnum.AND) {
    return intersectPeriods(groupPeriods);
  } else {
    return unionPeriods(groupPeriods);
  }
}

/**
 * Apply a single condition group
 */
export function applyConditionGroup(
  readings: IReading[],
  group: IConditionGroup,
): IPeriod[] {
  // Find periods for each observable condition
  // We need to find which category each observable belongs to
  // For now, we'll pass an empty array to findObservablePeriods, which means it will use all readings
  // This is acceptable because we're looking for when ANY observable is on, regardless of category
  const observablePeriods = group.observables
    .filter((condition) => condition.state === ObservableStateEnum.ON)
    .map((condition) => {
      return findObservablePeriods(
        readings,
        condition.observableName,
        [], // Empty array means use all readings (we don't know the category here)
      );
    });

  // Combine observable periods based on group operator
  let combinedPeriods: IPeriod[] = [];
  if (group.operator === ConditionOperatorEnum.AND) {
    combinedPeriods = intersectPeriods(observablePeriods);
  } else {
    combinedPeriods = unionPeriods(observablePeriods);
  }

  // Apply time range filter if specified
  if (group.timeRange) {
    combinedPeriods = filterByTimeRange(
      combinedPeriods,
      group.timeRange.startTime,
      group.timeRange.endTime,
    );
  }

  return combinedPeriods;
}

/**
 * Calculate category statistics for specific time periods
 */
export function calculateCategoryStatisticsForPeriods(
  protocolItems: IProtocolItem[],
  categoryId: string,
  readings: IReading[],
  periods: IPeriod[],
): ICategoryStatistics {
  const category = protocolItems.find(
    (item) => item.id === categoryId && item.type === ProtocolItemTypeEnum.Category,
  );

  if (!category) {
    throw new Error('Category not found');
  }

  const observables = category.children || [];
  const pausePeriods = calculatePausePeriods(readings);

  // Get all observable names in this category for filtering
  const categoryObservableNames = observables.map((obs) => obs.name || '').filter(Boolean);

  // Calculate statistics for each observable within filtered periods
  const observableStats: IObservableStatistics[] = observables.map(
    (observable) => {
      // Find observable periods within filtered periods
      // Pass categoryObservableNames so we only consider readings from this category
      const observablePeriods = findObservablePeriods(
        readings,
        observable.name || '',
        categoryObservableNames,
      );

      // Intersect with filtered periods
      const filteredObservablePeriods = intersectPeriods([
        observablePeriods,
        periods,
      ]);

      // Calculate duration (minus pauses)
      const onDuration = filteredObservablePeriods.reduce((sum, period) => {
        const pauseOverlap = calculatePauseOverlap(
          period.start,
          period.end,
          pausePeriods,
        );
        return (
          sum +
          (period.end.getTime() - period.start.getTime()) -
          pauseOverlap
        );
      }, 0);

      return {
        observableId: observable.id,
        observableName: observable.name || '',
        onDuration,
        onPercentage: 0, // Will be recalculated below relative to totalCategoryDuration
        onCount: filteredObservablePeriods.length,
      };
    },
  );

  // Calculate total category duration (sum of all observable durations)
  const totalCategoryDuration = observableStats.reduce(
    (sum, obs) => sum + (obs.onDuration || 0),
    0,
  );

  // Recalculate percentages within the category (not relative to total filtered duration)
  const observableStatsWithCategoryPercentage = observableStats.map((obs) => ({
    ...obs,
    onPercentage:
      totalCategoryDuration > 0
        ? (obs.onDuration / totalCategoryDuration) * 100
        : 0,
  }));

  const pauseDuration = pausePeriods.reduce(
    (sum, pause) => sum + (pause.end.getTime() - pause.start.getTime()),
    0,
  );

  return {
    categoryId: category.id,
    categoryName: category.name || '',
    observables: observableStatsWithCategoryPercentage,
    pauseDuration,
    totalCategoryDuration,
  };
}

/**
 * Calculate conditional statistics
 * Returns both the category statistics and the filtered periods used
 */
export function calculateConditionalStatistics(
  readings: IReading[],
  protocolItems: IProtocolItem[],
  request: IConditionalStatisticsRequest,
): { categoryStatistics: ICategoryStatistics; filteredPeriods: IPeriod[] } {
  const sortedReadings = [...readings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
  );

  // Filter readings based on conditions
  // If no conditions, use the entire observation period
  let filteredPeriods: IPeriod[] = [];
  if (request.conditionGroups.length === 0) {
    // No conditions: use entire observation period
    const startReading = sortedReadings.find((r) => r.type === ReadingTypeEnum.START);
    const stopReading = sortedReadings.find((r) => r.type === ReadingTypeEnum.STOP);
    if (startReading && stopReading) {
      filteredPeriods = [
        {
          start: startReading.dateTime,
          end: stopReading.dateTime,
        },
      ];
    }
  } else {
    filteredPeriods = applyConditions(
      sortedReadings,
      request.conditionGroups,
      request.groupOperator,
    );
  }

  // Calculate statistics for target category within filtered periods
  const targetCategoryStats = calculateCategoryStatisticsForPeriods(
    protocolItems,
    request.targetCategoryId,
    sortedReadings,
    filteredPeriods,
  );

  return {
    categoryStatistics: targetCategoryStats,
    filteredPeriods,
  };
}

