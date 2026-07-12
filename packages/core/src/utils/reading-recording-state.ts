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
