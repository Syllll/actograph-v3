import {
  isRecordingActiveFromReadings,
  ReadingTypeEnum,
  type IObservation,
  type IReading,
} from '@actograph/core';

export interface MiniGraphSnapshot {
  observation: IObservation;
  selectedTime: number | null;
  dataVersion?: number;
}

/** A private render copy: Pixi hydrates protocol items and must never mutate the editor. */
export function buildMiniGraphObservation(
  observation: IObservation,
  currentTime: number | null,
): IObservation {
  const readings: IReading[] = (observation.readings ?? []).map((reading) => ({
    ...reading,
    dateTime: new Date(reading.dateTime),
  })).filter((reading) => Number.isFinite(reading.dateTime.getTime()));

  if (currentTime !== null && Number.isFinite(currentTime)
    && observation.meta?.entryMode !== 'manual'
    && isRecordingActiveFromReadings(readings)) {
    // Rewinding a video must not cut off already recorded data.
    const end = readings.reduce((max, reading) => Math.max(max, +reading.dateTime), currentTime);
    readings.push({ name: '', type: ReadingTypeEnum.STOP, dateTime: new Date(end) });
  }

  return {
    ...observation,
    readings,
    protocol: observation.protocol
      ? JSON.parse(JSON.stringify(observation.protocol)) as IObservation['protocol']
      : undefined,
  };
}
