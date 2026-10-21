import { normalizeJchronicData } from '../../import/jchronic-parser';
import { IJchronicImport } from '../../import/types';

describe('manual reading order in chronic imports', () => {
  const normalize = (sortOrders: Array<number | null | undefined>) => normalizeJchronicData({
    observation: { name: 'Manual day' },
    readings: sortOrders.map((sortOrder, index) => ({
      name: `Reading ${index}`, type: 'data', dateTime: '2026-10-20T08:00:00.123Z', sortOrder,
    })),
  } as IJchronicImport).readings;

  it('preserves explicit equal-time positions including zero, without shifting the time', () => {
    const readings = normalize([0, 2, 1]);
    expect(readings.map((r) => r.sortOrder)).toEqual([0, 2, 1]);
    expect(readings.map((r) => r.dateTime.toISOString())).toEqual(Array(3).fill('2026-10-20T08:00:00.123Z'));
  });

  it('keeps legacy readings compatible and discards invalid ordering metadata', () => {
    for (const reading of normalize([undefined, null, -1, 1.5, Infinity, Number.MAX_SAFE_INTEGER + 1])) {
      expect(reading).not.toHaveProperty('sortOrder');
    }
  });
});
