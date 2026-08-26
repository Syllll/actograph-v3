import type { IReading } from '../types/reading.types';
import { ReadingTypeEnum } from '../enums/reading-type.enum';

function getReadingTimeMs(reading: IReading): number {
  return new Date(reading.dateTime).getTime();
}

function sortReadingsByTime(readings: IReading[]): IReading[] {
  return [...readings]
    .filter((reading) => Number.isFinite(getReadingTimeMs(reading)))
    .sort((a, b) => getReadingTimeMs(a) - getReadingTimeMs(b));
}

/**
 * True when the chronologically last START/STOP marker is a START (recording active).
 */
export function isRecordingActiveFromReadings(readings: IReading[]): boolean {
  const startStopReadings = sortReadingsByTime(readings).filter(
    (reading) =>
      reading.type === ReadingTypeEnum.START ||
      reading.type === ReadingTypeEnum.STOP
  );

  if (startStopReadings.length === 0) {
    return false;
  }

  return startStopReadings[startStopReadings.length - 1]!.type === ReadingTypeEnum.START;
}

/**
 * True when recording is active and the last pause marker is an unmatched PAUSE_START.
 */
export function isRecordingPausedFromReadings(readings: IReading[]): boolean {
  if (!isRecordingActiveFromReadings(readings)) {
    return false;
  }

  let paused = false;

  for (const reading of sortReadingsByTime(readings)) {
    if (
      reading.type === ReadingTypeEnum.START ||
      reading.type === ReadingTypeEnum.STOP
    ) {
      paused = false;
    } else if (reading.type === ReadingTypeEnum.PAUSE_START) {
      paused = true;
    } else if (reading.type === ReadingTypeEnum.PAUSE_END) {
      paused = false;
    }
  }

  return paused;
}

/**
 * Elapsed recording time for the active session, excluding pause intervals.
 * Returns 0 when recording is not active.
 */
export function getActiveRecordingElapsedMs(
  readings: IReading[],
  nowMs: number = Date.now(),
): number {
  if (!isRecordingActiveFromReadings(readings)) {
    return 0;
  }

  let inSession = false;
  let runningFromMs: number | null = null;
  let elapsedMs = 0;

  for (const reading of sortReadingsByTime(readings)) {
    const timeMs = getReadingTimeMs(reading);

    if (reading.type === ReadingTypeEnum.START) {
      inSession = true;
      runningFromMs = timeMs;
      elapsedMs = 0;
    } else if (reading.type === ReadingTypeEnum.STOP) {
      if (runningFromMs != null) {
        elapsedMs += Math.max(0, timeMs - runningFromMs);
      }
      runningFromMs = null;
      inSession = false;
    } else if (reading.type === ReadingTypeEnum.PAUSE_START) {
      if (runningFromMs != null) {
        elapsedMs += Math.max(0, timeMs - runningFromMs);
        runningFromMs = null;
      }
    } else if (reading.type === ReadingTypeEnum.PAUSE_END) {
      if (inSession && runningFromMs == null) {
        runningFromMs = timeMs;
      }
    }
  }

  if (runningFromMs != null) {
    elapsedMs += Math.max(0, nowMs - runningFromMs);
  }

  return elapsedMs;
}
