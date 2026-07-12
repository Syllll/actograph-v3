import { ReadingTypeEnum, ProtocolItemTypeEnum, ProtocolItemActionEnum } from '../../enums';
import { IReading, IProtocolItem } from '../../types';
import { calculateGeneralStatistics } from '../../statistics/general-statistics';

const observationStart = new Date('2024-01-01T10:00:00');
const observationEnd = new Date('2024-01-01T10:10:00');

const readings: IReading[] = [
  { type: ReadingTypeEnum.START, dateTime: observationStart },
  { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:01:00'), name: 'obsA' },
  { type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:02:00') },
  { type: ReadingTypeEnum.PAUSE_END, dateTime: new Date('2024-01-01T10:03:00') },
  { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:05:00'), name: 'obsB' },
  { type: ReadingTypeEnum.STOP, dateTime: observationEnd },
];

const protocolItems: IProtocolItem[] = [
  {
    id: 'cat1',
    name: 'Category 1',
    type: ProtocolItemTypeEnum.Category,
    action: ProtocolItemActionEnum.Continuous,
    children: [
      { id: 'obsA', name: 'obsA', type: ProtocolItemTypeEnum.Observable },
      { id: 'obsB', name: 'obsB', type: ProtocolItemTypeEnum.Observable },
    ],
  },
];

describe('general-statistics', () => {
  describe('calculateGeneralStatistics', () => {
    it('should subtract pause duration from observationDuration by default', () => {
      const stats = calculateGeneralStatistics(readings, protocolItems);

      expect(stats.totalDuration).toBe(10 * 60 * 1000);
      expect(stats.pauseDuration).toBe(1 * 60 * 1000);
      expect(stats.observationDuration).toBe(9 * 60 * 1000);
      expect(stats.pauseCount).toBe(1);
    });

    it('should include pause duration in observationDuration when includePauses is true', () => {
      const stats = calculateGeneralStatistics(readings, protocolItems, true);

      expect(stats.totalDuration).toBe(10 * 60 * 1000);
      expect(stats.pauseDuration).toBe(1 * 60 * 1000);
      expect(stats.observationDuration).toBe(10 * 60 * 1000);
    });

    it('should include pause overlap in category durations when includePauses is true', () => {
      const statsDefault = calculateGeneralStatistics(readings, protocolItems);
      const statsWithPauses = calculateGeneralStatistics(readings, protocolItems, true);

      const categoryDefault = statsDefault.categories[0];
      const categoryWithPauses = statsWithPauses.categories[0];

      expect(categoryWithPauses.totalDuration).toBeGreaterThan(
        categoryDefault.totalDuration,
      );
    });
  });
});
