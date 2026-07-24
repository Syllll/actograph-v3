import { ReadingTypeEnum } from '@actograph/core';
import type { IReading } from '@actograph/core';
import {
  extractSessionBoundaryReadings,
  getContinuousSegmentStartIndices,
  isNewSessionWithoutBridge,
  iterContinuousDataPairs,
  mergeContinuousCategoryReadings,
  shouldSkipConsecutiveStop,
  shouldSkipInContinuousDraw,
} from '../utils/continuous-segments.utils';

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

describe('continuous-segments.utils', () => {
  describe('extractSessionBoundaryReadings', () => {
    it('extracts STOP markers only, not pause markers', () => {
      const readings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:20:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:25:00Z') }),
        mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      ];

      const boundaries = extractSessionBoundaryReadings(readings);

      expect(boundaries).toHaveLength(1);
      expect(boundaries[0]?.type).toBe(ReadingTypeEnum.STOP);
    });
  });

  describe('mergeContinuousCategoryReadings', () => {
    it('returns empty when category has no DATA', () => {
      const boundaries = [
        mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      ];
      expect(mergeContinuousCategoryReadings([], boundaries)).toEqual([]);
    });

    it('trims leading STOP readings before first DATA', () => {
      const data = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') });
      const stop = mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:00:00Z') });
      const merged = mergeContinuousCategoryReadings([data], [stop]);
      expect(merged).toHaveLength(1);
      expect(merged[0]?.type).toBe(ReadingTypeEnum.DATA);
    });

    it('keeps STOP readings after first DATA', () => {
      const data = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') });
      const stop = mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') });
      const merged = mergeContinuousCategoryReadings([data], [stop]);
      expect(merged).toHaveLength(2);
      expect(merged[1]?.type).toBe(ReadingTypeEnum.STOP);
    });

    it('does not inject pause markers into category readings', () => {
      const data1 = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') });
      const data2 = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:30:00Z') });
      const sortedReadings = [
        data1,
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:20:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:25:00Z') }),
        data2,
      ];

      const merged = mergeContinuousCategoryReadings(
        [data1, data2],
        extractSessionBoundaryReadings(sortedReadings),
      );

      expect(merged.map((r) => r.type)).toEqual([
        ReadingTypeEnum.DATA,
        ReadingTypeEnum.DATA,
      ]);
      expect(getContinuousSegmentStartIndices(merged)).toEqual([0]);
    });
  });

  describe('isNewSessionWithoutBridge', () => {
    it('detects new session after STOP', () => {
      const data = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T11:00:00Z') });
      const stop = mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') });
      expect(isNewSessionWithoutBridge(data, stop)).toBe(true);
    });

    it('does not treat PAUSE_END as a session boundary', () => {
      const data = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T11:00:00Z') });
      const pauseEnd = mk({
        type: ReadingTypeEnum.PAUSE_END,
        dateTime: new Date('2024-01-01T10:45:00Z'),
      });
      expect(isNewSessionWithoutBridge(data, pauseEnd)).toBe(false);
    });

    it('does not treat PAUSE_START as a session boundary', () => {
      const pauseStart = mk({
        type: ReadingTypeEnum.PAUSE_START,
        dateTime: new Date('2024-01-01T10:20:00Z'),
      });
      const data = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') });
      expect(isNewSessionWithoutBridge(pauseStart, data)).toBe(false);
    });
  });

  describe('shouldSkipInContinuousDraw', () => {
    it('skips PAUSE markers and consecutive STOP readings', () => {
      const stop1 = mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') });
      const stop2 = mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:31:00Z') });
      const pauseEnd = mk({
        type: ReadingTypeEnum.PAUSE_END,
        dateTime: new Date('2024-01-01T10:25:00Z'),
      });

      expect(shouldSkipConsecutiveStop(stop2, stop1)).toBe(true);
      expect(shouldSkipInContinuousDraw(pauseEnd, stop1)).toBe(true);
      expect(shouldSkipInContinuousDraw(stop1, undefined)).toBe(false);
    });

    it('calendar mode: draws PAUSE_START after DATA but skips trailing boundary markers', () => {
      const data = mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') });
      const pauseStart = mk({
        type: ReadingTypeEnum.PAUSE_START,
        dateTime: new Date('2024-01-01T10:20:00Z'),
      });
      const pauseEnd = mk({
        type: ReadingTypeEnum.PAUSE_END,
        dateTime: new Date('2024-01-01T10:25:00Z'),
      });
      const stop = mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') });

      expect(shouldSkipInContinuousDraw(pauseStart, data, true)).toBe(false);
      expect(shouldSkipInContinuousDraw(pauseEnd, pauseStart, true)).toBe(true);
      expect(shouldSkipInContinuousDraw(stop, pauseStart, true)).toBe(true);
    });
  });

  describe('getContinuousSegmentStartIndices', () => {
    it('splits DATA-STOP-DATA into two segments without bridge', () => {
      const readings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T11:00:00Z') }),
      ];
      expect(getContinuousSegmentStartIndices(readings)).toEqual([0, 2]);
    });

    it('keeps a single segment across DATA-PAUSE_START-PAUSE_END-DATA', () => {
      const readings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:20:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:25:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:30:00Z') }),
      ];
      expect(getContinuousSegmentStartIndices(readings)).toEqual([0]);
    });

    it('returns no segments when category has no DATA', () => {
      const readings = [
        mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
        mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:31:00Z') }),
      ];
      expect(getContinuousSegmentStartIndices(readings)).toEqual([]);
    });

    it('starts first segment at first DATA, not at axis origin', () => {
      const readings = [
        mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:00:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:20:00Z') }),
      ];
      const merged = mergeContinuousCategoryReadings(
        readings.filter((r) => r.type === ReadingTypeEnum.DATA),
        extractSessionBoundaryReadings(readings),
      );
      expect(getContinuousSegmentStartIndices(merged)).toEqual([0]);
      expect(merged[0]?.type).toBe(ReadingTypeEnum.DATA);
    });

    it('calendar mode: splits at each PAUSE_START between DATA readings', () => {
      const sortedReadings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:20:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:30:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:40:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:50:00Z') }),
      ];
      const categoryData = sortedReadings.filter((r) => r.type === ReadingTypeEnum.DATA);
      const boundaries = extractSessionBoundaryReadings(sortedReadings, true);
      const merged = mergeContinuousCategoryReadings(categoryData, boundaries);

      expect(merged.map((r) => r.type)).toEqual([
        ReadingTypeEnum.DATA,
        ReadingTypeEnum.PAUSE_START,
        ReadingTypeEnum.DATA,
        ReadingTypeEnum.PAUSE_START,
        ReadingTypeEnum.DATA,
      ]);
      expect(getContinuousSegmentStartIndices(merged, true)).toEqual([0, 2, 4]);
    });
  });

  describe('iterContinuousDataPairs', () => {
    it('pairs DATA across a pause interval', () => {
      const readings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:20:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:25:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:30:00Z') }),
      ];

      const pairs = iterContinuousDataPairs(readings);

      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.from.dateTime).toEqual(new Date('2024-01-01T10:10:00Z'));
      expect(pairs[0]?.to.dateTime).toEqual(new Date('2024-01-01T10:30:00Z'));
    });

    it('pairs consecutive DATA within the same segment only, and extends the last DATA to the STOP', () => {
      const readings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:15:00Z') }),
        mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T11:00:00Z') }),
      ];

      const pairs = iterContinuousDataPairs(readings);

      expect(pairs).toHaveLength(2);
      expect(pairs[0]?.from.dateTime).toEqual(new Date('2024-01-01T10:10:00Z'));
      expect(pairs[0]?.to.dateTime).toEqual(new Date('2024-01-01T10:15:00Z'));
      expect(pairs[1]?.from.dateTime).toEqual(new Date('2024-01-01T10:15:00Z'));
      expect(pairs[1]?.to.dateTime).toEqual(new Date('2024-01-01T10:30:00Z'));
    });

    it('extends a single DATA reading to the closing STOP (last state before chronicle end)', () => {
      const readings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:30:00Z') }),
      ];

      const pairs = iterContinuousDataPairs(readings);

      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.from.dateTime).toEqual(new Date('2024-01-01T10:10:00Z'));
      expect(pairs[0]?.to.dateTime).toEqual(new Date('2024-01-01T10:30:00Z'));
    });

    it('does not extend when the segment has no closing STOP (recording still in progress)', () => {
      const readings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:15:00Z') }),
      ];

      const pairs = iterContinuousDataPairs(readings);

      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.to.dateTime).toEqual(new Date('2024-01-01T10:15:00Z'));
    });

    it('calendar mode: pairs each segment to its boundary without bridging pauses', () => {
      const sortedReadings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:20:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:25:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:30:00Z') }),
        mk({ type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:40:00Z') }),
      ];
      const categoryData = sortedReadings.filter((r) => r.type === ReadingTypeEnum.DATA);
      const boundaries = extractSessionBoundaryReadings(sortedReadings, true);
      const merged = mergeContinuousCategoryReadings(categoryData, boundaries);

      const pairs = iterContinuousDataPairs(merged, true);

      expect(pairs).toHaveLength(2);
      expect(pairs[0]?.from.dateTime).toEqual(new Date('2024-01-01T10:10:00Z'));
      expect(pairs[0]?.to.dateTime).toEqual(new Date('2024-01-01T10:20:00Z'));
      expect(pairs[0]?.to.type).toBe(ReadingTypeEnum.PAUSE_START);
      expect(pairs[1]?.from.dateTime).toEqual(new Date('2024-01-01T10:30:00Z'));
      expect(pairs[1]?.to.dateTime).toEqual(new Date('2024-01-01T10:40:00Z'));
      expect(pairs[1]?.to.type).toBe(ReadingTypeEnum.STOP);
    });
  });

  describe('setData pipeline simulation', () => {
    it('keeps one continuous segment after merge when pauses are present (chronometer mode)', () => {
      const sortedReadings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z'), name: 'obs1' }),
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:20:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:25:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:30:00Z'), name: 'obs1' }),
      ];

      const categoryData = sortedReadings.filter((r) => r.type === ReadingTypeEnum.DATA);
      const boundaries = extractSessionBoundaryReadings(sortedReadings);
      const merged = mergeContinuousCategoryReadings(categoryData, boundaries);

      expect(getContinuousSegmentStartIndices(merged)).toEqual([0]);
      expect(iterContinuousDataPairs(merged)).toHaveLength(1);
    });

    it('breaks the segment at the pause in calendar mode (treatPauseAsBoundary)', () => {
      const sortedReadings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z'), name: 'obs1' }),
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:20:00Z') }),
        mk({ type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:25:00Z') }),
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:30:00Z'), name: 'obs1' }),
      ];

      const categoryData = sortedReadings.filter((r) => r.type === ReadingTypeEnum.DATA);
      const boundaries = extractSessionBoundaryReadings(sortedReadings, true);
      const merged = mergeContinuousCategoryReadings(categoryData, boundaries);

      // merged = [DATA, PAUSE_START, PAUSE_END, DATA]; second segment starts at index 3.
      expect(getContinuousSegmentStartIndices(merged, true)).toEqual([0, 3]);

      const pairs = iterContinuousDataPairs(merged, true);
      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.from.dateTime).toEqual(new Date('2024-01-01T10:10:00Z'));
      expect(pairs[0]?.to.dateTime).toEqual(new Date('2024-01-01T10:20:00Z'));
    });

    it('keeps an ongoing pause (no PAUSE_END yet) frozen at PAUSE_START in calendar mode', () => {
      const sortedReadings = [
        mk({ type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:10:00Z'), name: 'obs1' }),
        mk({ type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:20:00Z') }),
      ];

      const categoryData = sortedReadings.filter((r) => r.type === ReadingTypeEnum.DATA);
      const boundaries = extractSessionBoundaryReadings(sortedReadings, true);
      const merged = mergeContinuousCategoryReadings(categoryData, boundaries);

      const pairs = iterContinuousDataPairs(merged, true);
      expect(pairs).toHaveLength(1);
      expect(pairs[0]?.to.dateTime).toEqual(new Date('2024-01-01T10:20:00Z'));
    });
  });
});
