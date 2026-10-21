import { ReadingTypeEnum } from '../../enums';
import { IReading } from '../../types';
import {
  getActiveRecordingElapsedMs,
  hasMissingStopReading,
  isRecordingActiveFromReadings,
  isRecordingPausedFromReadings,
} from '../../utils/reading-recording-state';

function mk(
  partial: Pick<IReading, 'type' | 'dateTime'> &
    Partial<Omit<IReading, 'type' | 'dateTime'>>
): IReading {
  return {
    name: partial.name ?? 'obs',
    type: partial.type,
    dateTime: partial.dateTime,
    id: partial.id,
    tempId: partial.tempId,
    description: partial.description,
  };
}

describe('isRecordingActiveFromReadings', () => {
  it('returns false when there are no START/STOP markers', () => {
    expect(isRecordingActiveFromReadings([])).toBe(false);
  });

  it('uses chronological order, not array order', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T11:00:00Z') }),
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
    ];

    expect(isRecordingActiveFromReadings(readings)).toBe(false);
  });

  it('returns true when the last chronological marker is START', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T11:00:00Z') }),
    ];

    expect(isRecordingActiveFromReadings(readings)).toBe(true);
  });
});

describe('isRecordingPausedFromReadings', () => {
  it('returns false when recording is not active', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:05:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:10:00Z') }),
    ];

    expect(isRecordingPausedFromReadings(readings)).toBe(false);
  });

  it('returns true when the active session has an unmatched PAUSE_START', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:05:00Z') }),
    ];

    expect(isRecordingPausedFromReadings(readings)).toBe(true);
  });

  it('returns false after PAUSE_END', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:05:00Z') }),
      mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:06:00Z') }),
    ];

    expect(isRecordingPausedFromReadings(readings)).toBe(false);
  });
});

describe('getActiveRecordingElapsedMs', () => {
  it('returns 0 when recording is not active', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00.000Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:01:00.000Z') }),
    ];

    expect(getActiveRecordingElapsedMs(readings, Date.parse('2024-01-01T10:02:00.000Z'))).toBe(0);
  });

  it('excludes pause intervals and freezes elapsed while paused', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00.000Z') }),
      mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:00:10.000Z') }),
    ];

    expect(getActiveRecordingElapsedMs(readings, Date.parse('2024-01-01T10:01:00.000Z'))).toBe(10_000);
  });

  it('resumes elapsed time after PAUSE_END', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00.000Z') }),
      mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:00:10.000Z') }),
      mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:00:20.000Z') }),
    ];

    expect(getActiveRecordingElapsedMs(readings, Date.parse('2024-01-01T10:00:25.000Z'))).toBe(15_000);
  });
});


describe('hasMissingStopReading', () => {
  const start = mk({ type: ReadingTypeEnum.START, dateTime: new Date(1000) });
  const data = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date(2000) });
  const stop = mk({ type: ReadingTypeEnum.STOP, dateTime: new Date(3000) });
  it('does not warn for an empty chronicle', () => expect(hasMissingStopReading([])).toBe(false));
  it('warns for raw readings without any session markers', () => expect(hasMissingStopReading([data])).toBe(true));
  it('warns for an unfinished session', () => expect(hasMissingStopReading([start, data])).toBe(true));
  it('accepts a completed session regardless of array order', () => expect(hasMissingStopReading([stop, data, start])).toBe(false));
  it('warns again when a new session starts after a previous STOP', () => {
    expect(hasMissingStopReading([start, stop, { ...start, dateTime: new Date(4000) }])).toBe(true);
  });
  it('does not treat an invalid STOP as a completed session', () => {
    expect(hasMissingStopReading([start, { ...stop, dateTime: new Date(NaN) }])).toBe(true);
  });
});
