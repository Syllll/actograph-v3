import {
  formatCalendarDateTime,
  getCalendarDateParts,
  getLocalTimeZone,
  getObservationTimeZone,
  isValidTimeZone,
  parseCalendarDateTimeInTimeZone,
} from '../../utils/observation-time-zone';

describe('observation time zone helpers', () => {
  it('formats one instant in its origin zone on devices with different local zones', () => {
    const instant = new Date('2026-10-25T01:10:00.123Z');
    expect(formatCalendarDateTime(instant, 'Europe/Paris', 'DD/MM/YYYY')).toBe('25/10/2026');
    expect(formatCalendarDateTime(instant, 'Europe/Paris', 'HH:mm:ss.SSS')).toBe('02:10:00.123');
    expect(formatCalendarDateTime(instant, 'Europe/Paris', 'HH:mm:ss')).toBe('02:10:00');
    expect(formatCalendarDateTime(instant, 'Europe/Paris', 'DD/MM/YYYY HH:mm:ss.SSS'))
      .toBe('25/10/2026 02:10:00.123');
    expect(formatCalendarDateTime(instant, 'America/Toronto', 'HH:mm:ss.SSS')).toBe('21:10:00.123');
    expect(getCalendarDateParts(instant, 'Europe/Paris')).toEqual({
      year: 2026, month: 10, day: 25, hour: 2, minute: 10, second: 0, millisecond: 123,
    });
  });

  it('validates metadata and keeps legacy device-local behavior when absent or invalid', () => {
    expect(getObservationTimeZone({ timeZone: 'Europe/Paris' })).toBe('Europe/Paris');
    expect(getObservationTimeZone({ timeZone: 'Not/AZone' })).toBeUndefined();
    expect(getObservationTimeZone(null)).toBeUndefined();
    expect(isValidTimeZone('America/Toronto')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    const instant = new Date('2026-07-01T12:34:56.789Z');
    expect(getCalendarDateParts(instant)).toEqual(getCalendarDateParts(instant, getLocalTimeZone()));
  });

  it('parses explicit instants and resolves repeated and skipped wall times', () => {
    expect(parseCalendarDateTimeInTimeZone('2026-10-25T01:10:00.000Z', 'Europe/Paris')?.toISOString())
      .toBe('2026-10-25T01:10:00.000Z');
    expect(parseCalendarDateTimeInTimeZone('2026-10-25T02:10:00.000', 'Europe/Paris')?.toISOString())
      .toBe('2026-10-25T00:10:00.000Z');
    expect(parseCalendarDateTimeInTimeZone('2026-10-25T02:10:00.000', 'Europe/Paris', 'later')?.toISOString())
      .toBe('2026-10-25T01:10:00.000Z');
    expect(parseCalendarDateTimeInTimeZone('2026-10-25T02:10:00.000', 'Europe/Paris', 'reject'))
      .toBeNull();
    expect(parseCalendarDateTimeInTimeZone('2026-03-29T02:10:00.000', 'Europe/Paris'))
      .toBeNull();
    expect(parseCalendarDateTimeInTimeZone('25/10/2026 02:10:00.123', 'Europe/Paris')?.toISOString())
      .toBe('2026-10-25T00:10:00.123Z');
    expect(parseCalendarDateTimeInTimeZone('25/10/2026', 'Europe/Paris')?.toISOString())
      .toBe('2026-10-24T22:00:00.000Z');
  });
});
