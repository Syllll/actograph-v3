import { ReadingTypeEnum, ProtocolItemTypeEnum, ProtocolItemActionEnum } from '../../enums';
import { IReading, IProtocolItem } from '../../types';
import {
  calculateContinuousObservableDurations,
  calculateCategoryStatistics,
  calculateDiscreteObservableCount,
  countObservableActivationsInPeriods,
} from '../../statistics/category-statistics';
import { calculatePausePeriods } from '../../statistics/period-calculator';

const observationStart = new Date('2024-01-01T10:00:00');
const observationEnd = new Date('2024-01-01T10:10:00');

const baseReadings: IReading[] = [
  { type: ReadingTypeEnum.START, dateTime: observationStart },
  { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:01:00'), name: 'obsA' },
  { type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:02:00') },
  { type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:03:00') },
  { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:05:00'), name: 'obsB' },
  { type: ReadingTypeEnum.STOP, dateTime: observationEnd },
];

const continuousCategory: IProtocolItem = {
  id: 'cat1',
  name: 'Category 1',
  type: ProtocolItemTypeEnum.Category,
  action: ProtocolItemActionEnum.Continuous,
  children: [
    { id: 'obsA', name: 'obsA', type: ProtocolItemTypeEnum.Observable },
    { id: 'obsB', name: 'obsB', type: ProtocolItemTypeEnum.Observable },
  ],
};

describe('category-statistics', () => {
  describe('calculateContinuousObservableDurations', () => {
    const pausePeriods = calculatePausePeriods(baseReadings);

    it('should subtract pause overlap by default', () => {
      const result = calculateContinuousObservableDurations(
        'obsA',
        ['obsA', 'obsB'],
        baseReadings,
        pausePeriods,
        observationEnd,
      );

      // obsA from 10:01 to 10:05 = 4 min, minus 1 min pause overlap = 3 min
      expect(result.onDuration).toBe(3 * 60 * 1000);
      expect(result.onCount).toBe(1);
    });

    it('should include pause time when includePauses is true', () => {
      const result = calculateContinuousObservableDurations(
        'obsA',
        ['obsA', 'obsB'],
        baseReadings,
        pausePeriods,
        observationEnd,
        true,
      );

      expect(result.onDuration).toBe(4 * 60 * 1000);
      expect(result.onCount).toBe(1);
    });
  });

  describe('calculateCategoryStatistics', () => {
    it('should exclude pauses from total duration and percentages by default', () => {
      const stats = calculateCategoryStatistics(
        continuousCategory,
        baseReadings,
        observationStart,
        observationEnd,
      );

      const obsA = stats.observables.find((o) => o.observableName === 'obsA');
      expect(obsA?.onDuration).toBe(3 * 60 * 1000);
      // Total duration = 10 min - 1 min pause = 9 min
      expect(obsA?.onPercentage).toBeCloseTo((3 / 9) * 100, 5);
      expect(stats.pauseDuration).toBe(1 * 60 * 1000);
      expect(stats.observationDuration).toBe(9 * 60 * 1000);
    });

    it('exposes an observationDuration larger than the sum of observable durations when the first observable starts after START', () => {
      // obsA starts 1 min after START, so that 1 min isn't covered by any observable.
      const stats = calculateCategoryStatistics(
        continuousCategory,
        baseReadings,
        observationStart,
        observationEnd,
      );

      const totalObservableDuration = stats.observables.reduce(
        (sum, obs) => sum + obs.onDuration,
        0,
      );

      expect(stats.observationDuration).toBe(9 * 60 * 1000);
      expect(totalObservableDuration).toBeLessThan(stats.observationDuration!);
      expect(stats.observationDuration! - totalObservableDuration).toBe(1 * 60 * 1000);
    });

    it('should include pauses in total duration and on durations when includePauses is true', () => {
      const stats = calculateCategoryStatistics(
        continuousCategory,
        baseReadings,
        observationStart,
        observationEnd,
        true,
      );

      const obsA = stats.observables.find((o) => o.observableName === 'obsA');
      expect(obsA?.onDuration).toBe(4 * 60 * 1000);
      // Total duration = full 10 min
      expect(obsA?.onPercentage).toBeCloseTo(40, 5);
    });
  });

  describe('calculateDiscreteObservableCount', () => {
    it('should not be affected by includePauses option', () => {
      const discreteCategory: IProtocolItem = {
        ...continuousCategory,
        action: ProtocolItemActionEnum.Discrete,
      };

      const statsDefault = calculateCategoryStatistics(
        discreteCategory,
        baseReadings,
        observationStart,
        observationEnd,
      );
      const statsWithPauses = calculateCategoryStatistics(
        discreteCategory,
        baseReadings,
        observationStart,
        observationEnd,
        true,
      );

      expect(statsDefault.observables[0].onCount).toBe(1);
      expect(statsWithPauses.observables[0].onCount).toBe(1);
      expect(calculateDiscreteObservableCount('obsA', baseReadings)).toBe(1);
    });
  });

  describe('countObservableActivationsInPeriods', () => {
    it('should count activations whose timestamps fall inside the given periods', () => {
      const periods = [
        {
          start: new Date('2024-01-01T10:01:00'),
          end: new Date('2024-01-01T10:03:00'),
        },
        {
          start: new Date('2024-01-01T10:06:00'),
          end: new Date('2024-01-01T10:07:00'),
        },
      ];

      expect(
        countObservableActivationsInPeriods(baseReadings, 'obsA', periods),
      ).toBe(1);
      expect(
        countObservableActivationsInPeriods(baseReadings, 'obsB', periods),
      ).toBe(0);
    });
  });
});
