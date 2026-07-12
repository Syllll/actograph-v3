import { ReadingTypeEnum } from '../../enums';
import { IReading } from '../../types';
import {
  filterReadingsForGraphDisplay,
  getLastStopReading,
  getGraphDisplayTimeBounds,
  hasReadingsAfterLastStop,
  hasSessionStartAfterLastStop,
} from '../../utils/reading-graph-scope';

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

describe('reading-graph-scope', () => {
  it('returns the last STOP chronologically', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T11:00:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T11:30:00Z') }),
    ];

    expect(getLastStopReading(readings)?.dateTime).toEqual(new Date('2024-01-01T11:30:00Z'));
  });

  it('detects orphan readings after the last STOP', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:40:00Z') }),
    ];

    expect(hasReadingsAfterLastStop(readings)).toBe(true);
  });

  it('does not warn for an in-progress session after the last STOP', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T11:00:00Z') }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T11:10:00Z') }),
    ];

    expect(hasSessionStartAfterLastStop(readings)).toBe(true);
    expect(hasReadingsAfterLastStop(readings)).toBe(false);
  });

  it('warns for orphans between STOP and the next START', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      mk({
        type: ReadingTypeEnum.DATA,
        dateTime: new Date('2024-01-01T10:35:00Z'),
        tempId: 'orphan',
      }),
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T11:00:00Z') }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T11:10:00Z') }),
    ];

    const filtered = filterReadingsForGraphDisplay(readings);

    expect(filtered.some((r) => r.tempId === 'orphan')).toBe(false);
    expect(hasReadingsAfterLastStop(readings)).toBe(true);
  });

  it('filters graph readings through the last STOP across completed sessions', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T11:00:00Z') }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T11:10:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T11:30:00Z') }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T12:00:00Z') }),
    ];

    const filtered = filterReadingsForGraphDisplay(readings);

    expect(filtered).toHaveLength(6);
    expect(filtered.filter((r) => r.type === ReadingTypeEnum.STOP)).toHaveLength(2);
    expect(filtered[filtered.length - 1]?.dateTime).toEqual(new Date('2024-01-01T11:30:00Z'));
  });

  it('includes an in-progress session after the last STOP', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T11:00:00Z') }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T11:10:00Z') }),
    ];

    const filtered = filterReadingsForGraphDisplay(readings);
    const bounds = getGraphDisplayTimeBounds(readings);

    expect(filtered).toHaveLength(4);
    expect(bounds?.endMs).toBe(new Date('2024-01-01T11:10:00Z').getTime());
  });

  it('keeps all readings when there is no STOP', () => {
    const readings = [
      mk({ type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00Z') }),
      mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
    ];

    expect(filterReadingsForGraphDisplay(readings)).toHaveLength(2);
  });
});
