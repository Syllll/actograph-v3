import { ReadingTypeEnum } from '../../enums';
import { IReading } from '../../types';
import {
  getActiveRecordingElapsedMs,
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
