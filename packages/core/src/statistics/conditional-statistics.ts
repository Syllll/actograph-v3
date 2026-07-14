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
import { scopeReadingsForStatistics } from './reading-scope';

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
  const sortedReadings = [...readings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
  );
  const startReading = sortedReadings.find((r) => r.type === ReadingTypeEnum.START);
  const stopReading = [...sortedReadings]
    .reverse()
    .find((r) => r.type === ReadingTypeEnum.STOP);

  // Find periods for each observable condition.
  // We still do not know the category at this stage, so periods are computed
  // globally by observable name, but OFF conditions are now represented as the
  // complement of the observable ON periods within the observation boundaries.
  const observablePeriods = group.observables.map((condition) => {
    const onPeriods = findObservablePeriods(
      sortedReadings,
      condition.observableName,
      [],
    );

    if (condition.state === ObservableStateEnum.ON) {
      return onPeriods;
    }

    if (!startReading || !stopReading) {
      return [];
    }

    const offPeriods: IPeriod[] = [];
    let cursor = startReading.dateTime;
    for (const period of onPeriods) {
      if (cursor < period.start) {
        offPeriods.push({
          start: cursor,
          end: period.start,
        });
      }
      if (cursor < period.end) {
        cursor = period.end;
      }
    }

    if (cursor < stopReading.dateTime) {
      offPeriods.push({
        start: cursor,
        end: stopReading.dateTime,
      });
    }

    return offPeriods;
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

  // Total duration of all observables (kept as a secondary "active time" metric)
  const totalCategoryDuration = observableStats.reduce(
    (sum, obs) => sum + (obs.onDuration || 0),
    0,
  );

  // Real window under analysis: the total duration of the filtered periods
  // themselves, not just the sum of on-durations. Using the periods' own
  // duration as the percentage basis (instead of self-normalizing against
  // totalCategoryDuration) means any time within those periods not covered
  // by an observable shows up as a gap rather than being silently absorbed
  // into the other observables' percentages.
  const periodsDuration = periods.reduce(
    (sum, period) => sum + (period.end.getTime() - period.start.getTime()),
    0,
  );
  const percentageBasis = periodsDuration > 0 ? periodsDuration : totalCategoryDuration;

  // Recalculate percentages within the filtered window
  const observableStatsWithCategoryPercentage = observableStats.map((obs) => ({
    ...obs,
    onPercentage:
      percentageBasis > 0
        ? (obs.onDuration / percentageBasis) * 100
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
    observationDuration: periodsDuration > 0 ? periodsDuration : undefined,
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
  const { scopedReadings, observationStart, observationEnd } =
    scopeReadingsForStatistics(readings);

  const sortedReadings = [...scopedReadings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
  );

  // Filter readings based on conditions
  // If no conditions, use the graph-aligned observation period
  let filteredPeriods: IPeriod[] = [];
  if (request.conditionGroups.length === 0) {
    if (observationStart && observationEnd) {
      filteredPeriods = [
        {
          start: observationStart,
          end: observationEnd,
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

