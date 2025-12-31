import {
  calculatePausePeriods,
  calculatePauseOverlap,
  intersectPeriods,
  unionPeriods,
  filterByTimeRange,
} from '../../statistics/period-calculator';
import { ReadingTypeEnum } from '../../enums';
import { IReading } from '../../types';
import { IPeriod } from '../../types/statistics.types';

describe('period-calculator', () => {
  describe('calculatePausePeriods', () => {
    it('should return empty array when no pauses', () => {
      const readings: IReading[] = [
        { type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00') },
        { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:05:00'), name: 'obs1' },
        { type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:10:00') },
      ];

      const pauses = calculatePausePeriods(readings);
      expect(pauses).toEqual([]);
    });

    it('should extract single pause period', () => {
      const readings: IReading[] = [
        { type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00') },
        { type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:02:00') },
        { type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:03:00') },
        { type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:10:00') },
      ];

      const pauses = calculatePausePeriods(readings);
      expect(pauses).toHaveLength(1);
      expect(pauses[0].start).toEqual(new Date('2024-01-01T10:02:00'));
      expect(pauses[0].end).toEqual(new Date('2024-01-01T10:03:00'));
    });

    it('should extract multiple pause periods', () => {
      const readings: IReading[] = [
        { type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00') },
        { type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:02:00') },
        { type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:03:00') },
        { type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:05:00') },
        { type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:06:00') },
        { type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:10:00') },
      ];

      const pauses = calculatePausePeriods(readings);
      expect(pauses).toHaveLength(2);
    });
  });

  describe('calculatePauseOverlap', () => {
    const pausePeriods: IPeriod[] = [
      { start: new Date('2024-01-01T10:02:00'), end: new Date('2024-01-01T10:04:00') },
    ];

    it('should return 0 when no overlap', () => {
      const overlap = calculatePauseOverlap(
        new Date('2024-01-01T10:00:00'),
        new Date('2024-01-01T10:01:00'),
        pausePeriods,
      );
      expect(overlap).toBe(0);
    });

    it('should calculate full overlap', () => {
      const overlap = calculatePauseOverlap(
        new Date('2024-01-01T10:00:00'),
        new Date('2024-01-01T10:10:00'),
        pausePeriods,
      );
      // Pause is 2 minutes = 120000ms
      expect(overlap).toBe(2 * 60 * 1000);
    });

    it('should calculate partial overlap', () => {
      const overlap = calculatePauseOverlap(
        new Date('2024-01-01T10:03:00'),
        new Date('2024-01-01T10:10:00'),
        pausePeriods,
      );
      // Only 1 minute overlaps (10:03 to 10:04)
      expect(overlap).toBe(1 * 60 * 1000);
    });
  });

  describe('intersectPeriods', () => {
    it('should return empty array for empty input', () => {
      expect(intersectPeriods([])).toEqual([]);
    });

    it('should return same periods for single array', () => {
      const periods: IPeriod[] = [
        { start: new Date('2024-01-01T10:00:00'), end: new Date('2024-01-01T10:05:00') },
      ];
      expect(intersectPeriods([periods])).toEqual(periods);
    });

    it('should find intersection of two period arrays', () => {
      const periods1: IPeriod[] = [
        { start: new Date('2024-01-01T10:00:00'), end: new Date('2024-01-01T10:10:00') },
      ];
      const periods2: IPeriod[] = [
        { start: new Date('2024-01-01T10:05:00'), end: new Date('2024-01-01T10:15:00') },
      ];

      const result = intersectPeriods([periods1, periods2]);
      expect(result).toHaveLength(1);
      expect(result[0].start).toEqual(new Date('2024-01-01T10:05:00'));
      expect(result[0].end).toEqual(new Date('2024-01-01T10:10:00'));
    });

    it('should return empty when no intersection', () => {
      const periods1: IPeriod[] = [
        { start: new Date('2024-01-01T10:00:00'), end: new Date('2024-01-01T10:05:00') },
      ];
      const periods2: IPeriod[] = [
        { start: new Date('2024-01-01T10:10:00'), end: new Date('2024-01-01T10:15:00') },
      ];

      const result = intersectPeriods([periods1, periods2]);
      expect(result).toHaveLength(0);
    });
  });

  describe('unionPeriods', () => {
    it('should return empty array for empty input', () => {
      expect(unionPeriods([])).toEqual([]);
    });

    it('should merge overlapping periods', () => {
      const periods1: IPeriod[] = [
        { start: new Date('2024-01-01T10:00:00'), end: new Date('2024-01-01T10:10:00') },
      ];
      const periods2: IPeriod[] = [
        { start: new Date('2024-01-01T10:05:00'), end: new Date('2024-01-01T10:15:00') },
      ];

      const result = unionPeriods([periods1, periods2]);
      expect(result).toHaveLength(1);
      expect(result[0].start).toEqual(new Date('2024-01-01T10:00:00'));
      expect(result[0].end).toEqual(new Date('2024-01-01T10:15:00'));
    });

    it('should keep separate non-overlapping periods', () => {
      const periods1: IPeriod[] = [
        { start: new Date('2024-01-01T10:00:00'), end: new Date('2024-01-01T10:05:00') },
      ];
      const periods2: IPeriod[] = [
        { start: new Date('2024-01-01T10:10:00'), end: new Date('2024-01-01T10:15:00') },
      ];

      const result = unionPeriods([periods1, periods2]);
      expect(result).toHaveLength(2);
    });
  });

  describe('filterByTimeRange', () => {
    const periods: IPeriod[] = [
      { start: new Date('2024-01-01T10:00:00'), end: new Date('2024-01-01T10:10:00') },
      { start: new Date('2024-01-01T10:20:00'), end: new Date('2024-01-01T10:30:00') },
    ];

    it('should return all periods when no filter', () => {
      const result = filterByTimeRange(periods);
      expect(result).toHaveLength(2);
    });

    it('should filter by start time', () => {
      const result = filterByTimeRange(periods, new Date('2024-01-01T10:05:00'));
      expect(result).toHaveLength(2);
      expect(result[0].start).toEqual(new Date('2024-01-01T10:05:00'));
    });

    it('should filter by end time', () => {
      const result = filterByTimeRange(
        periods,
        undefined,
        new Date('2024-01-01T10:25:00'),
      );
      expect(result).toHaveLength(2);
      expect(result[1].end).toEqual(new Date('2024-01-01T10:25:00'));
    });

    it('should exclude periods outside range', () => {
      const result = filterByTimeRange(
        periods,
        new Date('2024-01-01T10:15:00'),
        new Date('2024-01-01T10:25:00'),
      );
      expect(result).toHaveLength(1);
    });
  });
});

