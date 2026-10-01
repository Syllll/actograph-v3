import { ReadingTypeEnum } from '@actograph/core';
import { CHRONOMETER_T0 } from './chronometer.constants';

type StartDateReading = {
  type: string;
  dateTime: Date | string;
};

const readingDateTimeMs = (reading: StartDateReading): number => {
  const date = reading.dateTime instanceof Date ? reading.dateTime : new Date(reading.dateTime);
  return date.getTime();
};

/** t0 + elapsed. Never wall-clock Date.now() (that displays as ~13748 days). */
export const chronometerDateTimeFromElapsed = (elapsedSeconds: number): Date => {
  const t0Ms = CHRONOMETER_T0.getTime();
  return new Date(t0Ms + Math.max(0, elapsedSeconds) * 1000);
};

/**
 * Chronometer START dateTime.
 * First session stays at t0 (displayed duration 0). After a STOP, the new
 * START must be strictly later than that STOP: a second START at t0 sorts
 * before the previous STOP, so isRecordingActiveFromReadings stays false
 * and the board still asks for START while Rec/Pause is already running.
 */
export const resolveChronometerStartDateTime = (
  readings: StartDateReading[],
  elapsedSeconds: number,
): Date => {
  const t0Ms = CHRONOMETER_T0.getTime();
  const playheadMs = t0Ms + Math.max(0, elapsedSeconds) * 1000;

  let lastStopMs: number | null = null;
  for (const reading of readings) {
    if (reading.type !== ReadingTypeEnum.STOP) {
      continue;
    }
    const ms = readingDateTimeMs(reading);
    if (!Number.isFinite(ms)) {
      continue;
    }
    if (lastStopMs == null || ms > lastStopMs) {
      lastStopMs = ms;
    }
  }

  if (lastStopMs == null) {
    return new Date(t0Ms);
  }

  return new Date(Math.max(playheadMs, lastStopMs + 1));
};
