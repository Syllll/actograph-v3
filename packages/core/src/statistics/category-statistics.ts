import { ReadingTypeEnum, ProtocolItemActionEnum } from '../enums';
import { IReading, IProtocolItem, IPeriod, IObservableStatistics, ICategoryStatistics } from '../types';
import { calculatePausePeriods, calculatePauseOverlap } from './period-calculator';

/**
 * Filter out comment readings (DATA readings with name starting with "#")
 * Comments should not be included in statistics calculations
 */
function filterOutComments(readings: IReading[]): IReading[] {
  return readings.filter(
    (r) => !(r.type === ReadingTypeEnum.DATA && r.name?.startsWith('#'))
  );
}

/**
 * Calculate durations when an observable was "on" for CONTINUOUS categories
 * Rule: Observable is "on" from the moment it appears until another observable
 * of the same category appears. Exception: during pauses, all observables are "off"
 */
export function calculateContinuousObservableDurations(
  observableName: string,
  categoryObservableNames: string[],
  readings: IReading[],
  pausePeriods: IPeriod[],
  observationEnd: Date,
): { onDuration: number; onCount: number } {
  let onDuration = 0;
  let onCount = 0;
  let currentStart: Date | null = null;
  let currentObservable: string | null = null;

  // Filter readings to only include DATA readings for observables in this category
  // Exclude comments (readings with name starting with "#")
  const relevantReadings = filterOutComments(readings)
    .filter(
      (r) =>
        r.type === ReadingTypeEnum.DATA &&
        categoryObservableNames.includes(r.name || ''),
    )
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  // Process readings chronologically
  for (const reading of relevantReadings) {
    const readingTime = reading.dateTime;
    const readingName = reading.name || '';

    // If we were tracking THIS observable, end its period when any new reading appears
    if (currentStart && currentObservable === observableName) {
      const periodDuration = readingTime.getTime() - currentStart.getTime();
      
      // Only calculate pause overlap if period duration is positive
      let pauseOverlap = 0;
      if (periodDuration > 0) {
        pauseOverlap = calculatePauseOverlap(
          currentStart,
          readingTime,
          pausePeriods,
        );
      }
      
      const effectiveDuration = Math.max(0, periodDuration - pauseOverlap);
      onDuration += effectiveDuration;
      
      currentStart = null;
      currentObservable = null;
    }

    // If this reading is for our observable, start tracking it
    if (readingName === observableName) {
      currentStart = readingTime;
      currentObservable = readingName;
      onCount++;
    }
  }

  // Handle case where observable is still "on" at the end
  if (currentStart && currentObservable === observableName) {
    const periodDuration = observationEnd.getTime() - currentStart.getTime();
    const pauseOverlap = calculatePauseOverlap(
      currentStart,
      observationEnd,
      pausePeriods,
    );
    const effectiveDuration = Math.max(0, periodDuration - pauseOverlap);
    onDuration += effectiveDuration;
  }

  return { onDuration, onCount };
}

/**
 * Calculate count of occurrences for DISCRETE (one-shot) categories
 * Rule: Only count occurrences, no duration calculation
 */
export function calculateDiscreteObservableCount(
  observableName: string,
  readings: IReading[],
): number {
  return filterOutComments(readings).filter(
    (r) =>
      r.type === ReadingTypeEnum.DATA && r.name === observableName,
  ).length;
}

/**
 * Find periods where an observable was in a specific state
 * For continuous categories: observable is "on" from when it appears until another observable of the same category appears
 * 
 * @param readings - All readings from the observation
 * @param observableName - Name of the observable to find periods for
 * @param categoryObservableNames - Names of all observables in the same category (to know when our observable stops)
 */
export function findObservablePeriods(
  readings: IReading[],
  observableName: string,
  categoryObservableNames: string[] = [],
): IPeriod[] {
  const periods: IPeriod[] = [];

  // Filter readings to only include DATA readings for observables in this category
  // Exclude comments (readings with name starting with "#")
  const relevantReadings = filterOutComments(readings)
    .filter(
      (r) =>
        r.type === ReadingTypeEnum.DATA &&
        (categoryObservableNames.length === 0 || categoryObservableNames.includes(r.name || '')),
    )
    .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

  let currentStart: Date | null = null;
  let currentObservable: string | null = null;

  for (const reading of relevantReadings) {
    const readingTime = reading.dateTime;
    const readingName = reading.name || '';

    // If we were tracking our observable, end its period when another reading appears
    if (currentStart && currentObservable === observableName) {
      periods.push({
        start: currentStart,
        end: readingTime,
      });
      currentStart = null;
      currentObservable = null;
    }

    // Start tracking this observable if it's the one we're looking for
    if (readingName === observableName) {
      currentStart = readingTime;
      currentObservable = readingName;
    }
  }

  // Handle case where observable is still "on" at the end
  // We need to find the observation end time
  const stopReading = readings.find((r) => r.type === ReadingTypeEnum.STOP);
  if (currentStart && currentObservable === observableName && stopReading) {
    periods.push({
      start: currentStart,
      end: stopReading.dateTime,
    });
  }

  return periods;
}

/**
 * Calculate category statistics
 */
export function calculateCategoryStatistics(
  category: IProtocolItem,
  readings: IReading[],
  observationStart: Date,
  observationEnd: Date,
): ICategoryStatistics {
  const sortedReadings = [...readings].sort(
    (a, b) => a.dateTime.getTime() - b.dateTime.getTime()
  );
  
  const pausePeriods = calculatePausePeriods(sortedReadings);
  const pauseDuration = pausePeriods.reduce(
    (sum, period) => sum + (period.end.getTime() - period.start.getTime()),
    0
  );
  
  const totalDuration = 
    observationEnd.getTime() - observationStart.getTime() - pauseDuration;

  const observables = category.children || [];
  const isContinuous = !category.action || category.action === ProtocolItemActionEnum.Continuous;

  const observableStats: IObservableStatistics[] = observables.map((observable) => {
    if (isContinuous) {
      const durations = calculateContinuousObservableDurations(
        observable.name,
        observables.map((o) => o.name),
        sortedReadings,
        pausePeriods,
        observationEnd,
      );

      return {
        observableId: observable.id,
        observableName: observable.name,
        onDuration: durations.onDuration,
        onPercentage: totalDuration > 0 ? (durations.onDuration / totalDuration) * 100 : 0,
        onCount: durations.onCount,
      };
    } else {
      const count = calculateDiscreteObservableCount(observable.name, sortedReadings);
      return {
        observableId: observable.id,
        observableName: observable.name,
        onDuration: 0,
        onPercentage: 0,
        onCount: count,
      };
    }
  });

  const totalCategoryDuration = observableStats.reduce(
    (sum, obs) => sum + obs.onDuration,
    0
  );

  return {
    categoryId: category.id,
    categoryName: category.name,
    observables: observableStats,
    pauseDuration,
    totalCategoryDuration,
  };
}

