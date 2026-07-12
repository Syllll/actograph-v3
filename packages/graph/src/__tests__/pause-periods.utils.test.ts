import { ReadingTypeEnum } from '@actograph/core';
import type { IReading } from '@actograph/core';
import { getGraphPausePeriods } from '../utils/pause-periods.utils';

function mk(
  partial: Pick<IReading, 'type' | 'dateTime'> &
    Partial<Omit<IReading, 'type' | 'dateTime'>>,
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

describe('pause-periods.utils', () => {
  it('returns pause intervals from PAUSE_START/PAUSE_END pairs', () => {
    const pauseStart = new Date('2024-01-01T10:20:00Z');
    const pauseEnd = new Date('2024-01-01T10:25:00Z');
    const readings = [
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
      mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: pauseStart }),
      mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: pauseEnd }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:30:00Z') }),
    ];

    const periods = getGraphPausePeriods(readings);

    expect(periods).toHaveLength(1);
    expect(periods[0]?.start).toEqual(pauseStart);
    expect(periods[0]?.end).toEqual(pauseEnd);
  });

  it('returns empty when no pause markers exist', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
    ];

    expect(getGraphPausePeriods(readings)).toEqual([]);
  });
});
