import {
  ReadingTypeEnum,
  ProtocolItemTypeEnum,
  ProtocolItemActionEnum,
  ObservableStateEnum,
  ConditionOperatorEnum,
} from '../enums';
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
  intersectTwoPeriods,
  unionPeriods,
  filterByTimeRange,
  subtractPausesFromPeriods,
} from './period-calculator';
import {
  findObservablePeriods,
  countObservableActivationsInPeriods,
} from './category-statistics';
import { scopeReadingsForStatistics } from './reading-scope';

export interface IConditionalStatisticsOptions {
  includePauses?: boolean;
}

/**
 * Resolve the sibling observable names for a condition observable.
 * Continuous "on" periods end when another observable of the same category
 * appears; scoping must not use readings from unrelated categories.
 *
 * Falls back to [observableName] when the name is absent from protocolItems
 * (degenerate singleton: the period ends at STOP or on a re-occurrence).
 */
function resolveCategoryObservableNames(
  protocolItems: IProtocolItem[],
  observableName: string,
): string[] {
  for (const item of protocolItems) {
    if (item.type !== ProtocolItemTypeEnum.Category || !item.children) {
      continue;
    }
    const belongsToCategory = item.children.some(
      (child) =>
        child.type === ProtocolItemTypeEnum.Observable &&
        child.name === observableName,
    );
    if (belongsToCategory) {
      return item.children
        .filter((child) => child.type === ProtocolItemTypeEnum.Observable)
        .map((child) => child.name || '')
        .filter(Boolean);
    }
  }
  return [observableName];
}

function resolveObservationBounds(
  readings: IReading[],
  observationStart?: Date | null,
  observationEnd?: Date | null,
): { start: Date; end: Date } | null {
  if (observationStart && observationEnd) {
    return { start: observationStart, end: observationEnd };
  }

  const sortedReadings = [...readings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
  );
  const startReading = sortedReadings.find((r) => r.type === ReadingTypeEnum.START);
  const stopReading = [...sortedReadings]
    .reverse()
    .find((r) => r.type === ReadingTypeEnum.STOP);

  if (!startReading || !stopReading) {
    return null;
  }

  return {
    start: startReading.dateTime,
    end: stopReading.dateTime,
  };
}

function resolveOnPeriodsForCondition(
  readings: IReading[],
  observableName: string,
  protocolItems: IProtocolItem[],
  pausePeriods: IPeriod[],
  includePauses: boolean,
): IPeriod[] {
  const categoryObservableNames = resolveCategoryObservableNames(
    protocolItems,
    observableName,
  );
  const onPeriods = findObservablePeriods(
    readings,
    observableName,
    categoryObservableNames,
  );

  if (includePauses || pausePeriods.length === 0) {
    return onPeriods;
  }

  return subtractPausesFromPeriods(onPeriods, pausePeriods);
}

function deriveOffPeriods(
  onPeriods: IPeriod[],
  observationBounds: { start: Date; end: Date },
): IPeriod[] {
  const offPeriods: IPeriod[] = [];
  let cursor = observationBounds.start;

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

  if (cursor < observationBounds.end) {
    offPeriods.push({
      start: cursor,
      end: observationBounds.end,
    });
  }

  return offPeriods;
}

/**
 * Apply conditions to filter readings periods
 */
export function applyConditions(
  readings: IReading[],
  conditionGroups: IConditionGroup[],
  groupOperator: ConditionOperatorEnum,
  protocolItems: IProtocolItem[],
  options: IConditionalStatisticsOptions & {
    observationStart?: Date | null;
    observationEnd?: Date | null;
  } = {},
): IPeriod[] {
  const groupPeriods = conditionGroups.map((group) => {
    return applyConditionGroup(readings, group, protocolItems, options);
  });

  if (groupOperator === ConditionOperatorEnum.AND) {
    return intersectPeriods(groupPeriods);
  }

  return unionPeriods(groupPeriods);
}

/**
 * Apply a single condition group
 */
export function applyConditionGroup(
  readings: IReading[],
  group: IConditionGroup,
  protocolItems: IProtocolItem[],
  options: IConditionalStatisticsOptions & {
    observationStart?: Date | null;
    observationEnd?: Date | null;
  } = {},
): IPeriod[] {
  const sortedReadings = [...readings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
  );
  const includePauses = options.includePauses ?? false;
  const pausePeriods = calculatePausePeriods(sortedReadings);
  const observationBounds = resolveObservationBounds(
    sortedReadings,
    options.observationStart,
    options.observationEnd,
  );

  const observablePeriods = group.observables.map((condition) => {
    const onPeriods = resolveOnPeriodsForCondition(
      sortedReadings,
      condition.observableName,
      protocolItems,
      pausePeriods,
      includePauses,
    );

    if (condition.state === ObservableStateEnum.ON) {
      return onPeriods;
    }

    if (!observationBounds) {
      return [];
    }

    return deriveOffPeriods(onPeriods, observationBounds);
  });

  let combinedPeriods: IPeriod[] = [];
  if (group.operator === ConditionOperatorEnum.AND) {
    combinedPeriods = intersectPeriods(observablePeriods);
  } else {
    combinedPeriods = unionPeriods(observablePeriods);
  }

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
  includePauses = false,
): ICategoryStatistics {
  const category = protocolItems.find(
    (item) => item.id === categoryId && item.type === ProtocolItemTypeEnum.Category,
  );

  if (!category) {
    throw new Error('Category not found');
  }

  const observables = category.children || [];
  const pausePeriods = calculatePausePeriods(readings);
  const categoryObservableNames = observables
    .map((obs) => obs.name || '')
    .filter(Boolean);
  const isContinuous =
    !category.action || category.action === ProtocolItemActionEnum.Continuous;

  const observableStats: IObservableStatistics[] = observables.map(
    (observable) => {
      const observableName = observable.name || '';

      if (!isContinuous) {
        const onCount = countObservableActivationsInPeriods(
          readings,
          observableName,
          periods,
        );

        return {
          observableId: observable.id,
          observableName,
          onDuration: 0,
          onPercentage: 0,
          onCount,
        };
      }

      const observablePeriods = findObservablePeriods(
        readings,
        observableName,
        categoryObservableNames,
      );
      const filteredObservablePeriods = intersectPeriods([
        observablePeriods,
        periods,
      ]);

      const onDuration = filteredObservablePeriods.reduce((sum, period) => {
        const rawDuration = period.end.getTime() - period.start.getTime();
        if (includePauses) {
          return sum + rawDuration;
        }

        const pauseOverlap = calculatePauseOverlap(
          period.start,
          period.end,
          pausePeriods,
        );
        return sum + Math.max(0, rawDuration - pauseOverlap);
      }, 0);

      // Count distinct "on" episodes that overlap the filtered window at all,
      // rather than raw activation readings landing inside it: the reading
      // that starts an episode predates the window whenever the observable
      // was already active before a condition turned on, which would
      // otherwise undercount (down to zero) the very common case where the
      // target observable activates first and the condition follows.
      const onCount = observablePeriods.filter((period) =>
        periods.some((filterPeriod) => intersectTwoPeriods(period, filterPeriod) !== null),
      ).length;

      return {
        observableId: observable.id,
        observableName,
        onDuration,
        onPercentage: 0,
        onCount,
      };
    },
  );

  const totalCategoryDuration = observableStats.reduce(
    (sum, obs) => sum + (obs.onDuration || 0),
    0,
  );

  const periodsDuration = periods.reduce(
    (sum, period) => sum + (period.end.getTime() - period.start.getTime()),
    0,
  );
  const percentageBasis =
    periodsDuration > 0 ? periodsDuration : totalCategoryDuration;

  const pauseDurationInPeriods = intersectPeriods([pausePeriods, periods]).reduce(
    (sum, pause) => sum + (pause.end.getTime() - pause.start.getTime()),
    0,
  );

  const observableStatsWithCategoryPercentage = observableStats.map((obs) => ({
    ...obs,
    onPercentage:
      percentageBasis > 0 ? (obs.onDuration / percentageBasis) * 100 : 0,
  }));

  const effectiveObservationDuration = includePauses
    ? periodsDuration
    : periodsDuration > 0
      ? periodsDuration - pauseDurationInPeriods
      : undefined;

  return {
    categoryId: category.id,
    categoryName: category.name || '',
    observables: observableStatsWithCategoryPercentage,
    pauseDuration: pauseDurationInPeriods,
    totalCategoryDuration,
    observationDuration:
      periodsDuration > 0 ? effectiveObservationDuration : undefined,
    windowDuration: periodsDuration > 0 ? periodsDuration : undefined,
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
  includePauses = false,
): { categoryStatistics: ICategoryStatistics; filteredPeriods: IPeriod[] } {
  const { scopedReadings, observationStart, observationEnd } =
    scopeReadingsForStatistics(readings);

  const sortedReadings = [...scopedReadings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime(),
  );

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
      protocolItems,
      {
        includePauses,
        observationStart,
        observationEnd,
      },
    );
  }

  const targetCategoryStats = calculateCategoryStatisticsForPeriods(
    protocolItems,
    request.targetCategoryId,
    sortedReadings,
    filteredPeriods,
    includePauses,
  );

  return {
    categoryStatistics: targetCategoryStats,
    filteredPeriods,
  };
}
