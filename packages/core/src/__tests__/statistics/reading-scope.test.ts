import { ReadingTypeEnum } from '../../enums';
import { IReading } from '../../types';
import { scopeReadingsForStatistics } from '../../statistics/reading-scope';

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

describe('scopeReadingsForStatistics', () => {
  it('aligns bounds with graph scope across completed sessions', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T11:00:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T11:30:00Z') }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T12:00:00Z'), tempId: 'orphan' }),
    ];

    const { scopedReadings, observationStart, observationEnd } =
      scopeReadingsForStatistics(readings);

    expect(scopedReadings.some((r) => r.tempId === 'orphan')).toBe(false);
    expect(observationStart).toEqual(new Date('2024-01-01T10:00:00Z'));
    expect(observationEnd).toEqual(new Date('2024-01-01T11:30:00Z'));
  });
});
