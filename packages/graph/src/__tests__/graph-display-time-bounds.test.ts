import { getGraphDisplayTimeBounds } from '@actograph/core';
import { ReadingTypeEnum } from '@actograph/core';
import type { IReading } from '@actograph/core';

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

describe('xAxis multi-session time bounds', () => {
  it('uses START as min and last STOP as max when no session is in progress', () => {
    const start = new Date('2024-01-01T10:00:00Z');
    const stop = new Date('2024-01-01T10:30:00Z');
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: start }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: stop }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T11:00:00Z') }),
    ];

    const bounds = getGraphDisplayTimeBounds(readings);

    expect(bounds?.startMs).toBe(start.getTime());
    expect(bounds?.endMs).toBe(stop.getTime());
  });

  it('extends max to latest reading when session in progress after last STOP', () => {
    const start1 = new Date('2024-01-01T10:00:00Z');
    const stop = new Date('2024-01-01T10:30:00Z');
    const start2 = new Date('2024-01-01T11:00:00Z');
    const latestData = new Date('2024-01-01T11:10:00Z');
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: start1 }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: stop }),
      mk({ type: ReadingTypeEnum.START, dateTime: start2 }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: latestData }),
    ];

    const bounds = getGraphDisplayTimeBounds(readings);

    expect(bounds?.startMs).toBe(start1.getTime());
    expect(bounds?.endMs).toBe(latestData.getTime());
  });

  it('falls back to earliest and latest reading when no START or STOP', () => {
    const first = new Date('2024-01-01T10:05:00Z');
    const last = new Date('2024-01-01T10:25:00Z');
    const readings = [
      mk({ type: ReadingTypeEnum.DATA, dateTime: first }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: last }),
    ];

    const bounds = getGraphDisplayTimeBounds(readings);

    expect(bounds?.startMs).toBe(first.getTime());
    expect(bounds?.endMs).toBe(last.getTime());
  });
});
