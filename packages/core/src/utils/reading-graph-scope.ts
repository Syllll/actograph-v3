import { ReadingTypeEnum } from '../enums/reading-type.enum';
import type { IReading } from '../types/reading.types';

function getReadingTimeMs(reading: IReading): number {
  return new Date(reading.dateTime).getTime();
}

function sortReadingsByTime(readings: IReading[]): IReading[] {
  return [...readings]
    .filter((reading) => Number.isFinite(getReadingTimeMs(reading)))
    .sort((a, b) => getReadingTimeMs(a) - getReadingTimeMs(b));
}

function readingKey(reading: IReading): string {
  const id = reading.id ?? reading.tempId ?? '';
  return `${id}:${getReadingTimeMs(reading)}:${reading.type}:${reading.name ?? ''}`;
}

/**
 * Returns the last STOP reading in chronological order.
 */
export function getLastStopReading(readings: IReading[]): IReading | null {
  const sorted = sortReadingsByTime(readings);
  for (let i = sorted.length - 1; i >= 0; i--) {
    const reading = sorted[i];
    if (reading?.type === ReadingTypeEnum.STOP) {
      return reading;
    }
  }
  return null;
}

/**
 * True when a new session START exists strictly after the last STOP.
 */
export function hasSessionStartAfterLastStop(readings: IReading[]): boolean {
  const lastStop = getLastStopReading(readings);
  if (!lastStop) {
    return false;
  }
  const stopTime = getReadingTimeMs(lastStop);
  return sortReadingsByTime(readings).some(
    (reading) =>
      reading.type === ReadingTypeEnum.START && getReadingTimeMs(reading) > stopTime
  );
}

/**
 * Time bounds for graph display.
 * - Starts at first START (or earliest reading if none).
 * - Ends at last STOP, unless a new session STARTed after that STOP:
 *   then extends to the latest reading (in-progress session).
 */
export function getGraphDisplayTimeBounds(
  readings: IReading[]
): { startMs: number; endMs: number } | null {
  const sorted = sortReadingsByTime(readings);
  if (!sorted.length) {
    return null;
  }

  const firstStart = sorted.find((r) => r.type === ReadingTypeEnum.START);
  const startMs = firstStart
    ? getReadingTimeMs(firstStart)
    : getReadingTimeMs(sorted[0]!);

  const lastReadingMs = getReadingTimeMs(sorted[sorted.length - 1]!);
  const lastStop = getLastStopReading(readings);

  if (!lastStop) {
    return { startMs, endMs: lastReadingMs };
  }

  const stopMs = getReadingTimeMs(lastStop);
  const endMs = hasSessionStartAfterLastStop(readings) ? lastReadingMs : stopMs;

  return { startMs, endMs };
}

/**
 * Readings used for graph rendering, scoped to completed sessions up to the last STOP,
 * plus any in-progress session that STARTed after that STOP.
 * Readings between a STOP and the next START (without a new session) are excluded.
 */
export function filterReadingsForGraphDisplay(readings: IReading[]): IReading[] {
  if (!readings?.length) {
    return readings ?? [];
  }

  const bounds = getGraphDisplayTimeBounds(readings);
  if (!bounds) {
    return [];
  }

  const sorted = sortReadingsByTime(readings);
  const result: IReading[] = [];
  let inOrphanZone = false;

  for (const reading of sorted) {
    const timeMs = getReadingTimeMs(reading);
    if (timeMs < bounds.startMs || timeMs > bounds.endMs) {
      continue;
    }

    if (reading.type === ReadingTypeEnum.STOP) {
      inOrphanZone = true;
      result.push(reading);
      continue;
    }

    if (reading.type === ReadingTypeEnum.START) {
      inOrphanZone = false;
      result.push(reading);
      continue;
    }

    if (inOrphanZone) {
      continue;
    }

    result.push(reading);
  }

  return result;
}

/**
 * True when readings exist after the last STOP that are excluded from graph display
 * (orphans after a completed session, or between STOP and the next START).
 */
export function hasReadingsAfterLastStop(readings: IReading[]): boolean {
  const lastStop = getLastStopReading(readings);
  if (!lastStop) {
    return false;
  }

  const stopTime = getReadingTimeMs(lastStop);
  const sorted = sortReadingsByTime(readings);
  const shownKeys = new Set(filterReadingsForGraphDisplay(readings).map(readingKey));

  return sorted.some((reading) => {
    if (getReadingTimeMs(reading) <= stopTime) {
      return false;
    }
    if (reading.type === ReadingTypeEnum.START) {
      return false;
    }
    return !shownKeys.has(readingKey(reading));
  });
}
