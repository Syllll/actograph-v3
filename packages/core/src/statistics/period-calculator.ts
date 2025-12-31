import { ReadingTypeEnum } from '../enums';
import { IReading, IPeriod } from '../types';

/**
 * Calculate pause periods from readings
 */
export function calculatePausePeriods(readings: IReading[]): IPeriod[] {
  const pausePeriods: IPeriod[] = [];
  let pauseStart: IReading | null = null;

  for (const reading of readings) {
    if (reading.type === ReadingTypeEnum.PAUSE_START) {
      pauseStart = reading;
    } else if (
      reading.type === ReadingTypeEnum.PAUSE_END &&
      pauseStart
    ) {
      pausePeriods.push({
        start: pauseStart.dateTime,
        end: reading.dateTime,
      });
      pauseStart = null;
    }
  }

  return pausePeriods;
}

/**
 * Calculate pause overlap with a time period
 */
export function calculatePauseOverlap(
  start: Date,
  end: Date,
  pausePeriods: IPeriod[],
): number {
  let overlap = 0;

  for (const pause of pausePeriods) {
    const overlapStart = new Date(
      Math.max(start.getTime(), pause.start.getTime()),
    );
    const overlapEnd = new Date(
      Math.min(end.getTime(), pause.end.getTime()),
    );

    if (overlapStart < overlapEnd) {
      overlap += overlapEnd.getTime() - overlapStart.getTime();
    }
  }

  return overlap;
}

/**
 * Intersect two periods
 */
export function intersectTwoPeriods(
  period1: IPeriod,
  period2: IPeriod,
): IPeriod | null {
  const start = new Date(
    Math.max(period1.start.getTime(), period2.start.getTime()),
  );
  const end = new Date(
    Math.min(period1.end.getTime(), period2.end.getTime()),
  );

  if (start < end) {
    return { start, end };
  }

  return null;
}

/**
 * Intersect multiple period arrays (AND logic)
 */
export function intersectPeriods(
  periodArrays: IPeriod[][],
): IPeriod[] {
  if (periodArrays.length === 0) {
    return [];
  }

  if (periodArrays.length === 1) {
    return periodArrays[0];
  }

  let result = periodArrays[0];

  for (let i = 1; i < periodArrays.length; i++) {
    const newResult: IPeriod[] = [];

    for (const period1 of result) {
      for (const period2 of periodArrays[i]) {
        const intersection = intersectTwoPeriods(period1, period2);
        if (intersection) {
          newResult.push(intersection);
        }
      }
    }

    result = newResult;
  }

  return result;
}

/**
 * Union multiple period arrays (OR logic)
 */
export function unionPeriods(
  periodArrays: IPeriod[][],
): IPeriod[] {
  const allPeriods = periodArrays.flat();
  if (allPeriods.length === 0) {
    return [];
  }

  // Sort by start time
  allPeriods.sort((a, b) => a.start.getTime() - b.start.getTime());

  // Merge overlapping periods
  const merged: IPeriod[] = [allPeriods[0]];

  for (let i = 1; i < allPeriods.length; i++) {
    const current = allPeriods[i];
    const last = merged[merged.length - 1];

    if (current.start <= last.end) {
      // Overlapping or adjacent, merge
      last.end = new Date(Math.max(last.end.getTime(), current.end.getTime()));
    } else {
      // Non-overlapping, add as new period
      merged.push(current);
    }
  }

  return merged;
}

/**
 * Filter periods by time range
 */
export function filterByTimeRange(
  periods: IPeriod[],
  startTime?: Date,
  endTime?: Date,
): IPeriod[] {
  return periods
    .map((period) => {
      const filteredStart = startTime
        ? new Date(Math.max(period.start.getTime(), startTime.getTime()))
        : period.start;
      const filteredEnd = endTime
        ? new Date(Math.min(period.end.getTime(), endTime.getTime()))
        : period.end;

      if (filteredStart < filteredEnd) {
        return { start: filteredStart, end: filteredEnd };
      }

      return null;
    })
    .filter(
      (period): period is IPeriod => period !== null,
    );
}

