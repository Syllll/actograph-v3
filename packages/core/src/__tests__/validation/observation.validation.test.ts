import {
  validateObservationName,
  validateReading,
  validateReadings,
  validateObservationData,
} from '../../validation/observation.validation';
import { ReadingTypeEnum } from '../../enums';
import { IReading } from '../../types';

describe('observation.validation', () => {
  describe('validateObservationName', () => {
    it('should fail for empty name', () => {
      const result = validateObservationName('');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('REQUIRED');
    });

    it('should fail for undefined name', () => {
      const result = validateObservationName(undefined);
      expect(result.valid).toBe(false);
    });

    it('should fail for name with only spaces', () => {
      const result = validateObservationName('   ');
      expect(result.valid).toBe(false);
    });

    it('should pass for valid name', () => {
      const result = validateObservationName('My Observation');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for name exceeding max length', () => {
      const longName = 'a'.repeat(256);
      const result = validateObservationName(longName);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('MAX_LENGTH');
    });
  });

  describe('validateReading', () => {
    it('should fail for missing type', () => {
      const result = validateReading({ dateTime: new Date() }, 0);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'REQUIRED')).toBe(true);
    });

    it('should fail for missing dateTime', () => {
      const result = validateReading({ type: ReadingTypeEnum.DATA }, 0);
      expect(result.valid).toBe(false);
    });

    it('should pass for valid reading', () => {
      const result = validateReading(
        { type: ReadingTypeEnum.DATA, dateTime: new Date(), name: 'obs1' },
        0,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('validateReadings', () => {
    it('should fail for missing START reading', () => {
      const readings: IReading[] = [
        { type: ReadingTypeEnum.STOP, dateTime: new Date() },
      ];
      const result = validateReadings(readings);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_START')).toBe(true);
    });

    it('should fail for missing STOP reading', () => {
      const readings: IReading[] = [
        { type: ReadingTypeEnum.START, dateTime: new Date() },
      ];
      const result = validateReadings(readings);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_STOP')).toBe(true);
    });

    it('should fail for START after STOP', () => {
      const readings: IReading[] = [
        { type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:10:00') },
        { type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:00:00') },
      ];
      const result = validateReadings(readings);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'INVALID_ORDER')).toBe(true);
    });

    it('should fail for unbalanced pauses', () => {
      const readings: IReading[] = [
        { type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00') },
        { type: ReadingTypeEnum.PAUSE_START, dateTime: new Date('2024-01-01T10:02:00') },
        { type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:10:00') },
      ];
      const result = validateReadings(readings);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'UNBALANCED_PAUSES')).toBe(true);
    });

    it('should pass for valid readings', () => {
      const readings: IReading[] = [
        { type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00') },
        { type: ReadingTypeEnum.DATA, dateTime: new Date('2024-01-01T10:05:00'), name: 'obs1' },
        { type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:10:00') },
      ];
      const result = validateReadings(readings);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateObservationData', () => {
    it('should validate complete observation', () => {
      const result = validateObservationData({
        name: 'Test Observation',
        readings: [
          { type: ReadingTypeEnum.START, dateTime: new Date('2024-01-01T10:00:00') },
          { type: ReadingTypeEnum.STOP, dateTime: new Date('2024-01-01T10:10:00') },
        ],
      });
      expect(result.valid).toBe(true);
    });

    it('should fail for invalid name and readings', () => {
      const result = validateObservationData({
        name: '',
        readings: [],
      });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });
});

