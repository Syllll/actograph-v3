import { ReadingTypeEnum } from '../../enums';
import { IReading } from '../../types';
import { isRecordingActiveFromReadings } from '../../utils/reading-recording-state';

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
