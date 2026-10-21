import { parseCalendarDateTimeEditInTimeZone } from './calendar-date-time';

describe('parseCalendarDateTimeEditInTimeZone', () => {
  const zone = 'Europe/Paris';

  it('keeps an unchanged second-pass reading at its original instant', () => {
    const source = new Date('2026-10-25T01:10:00.123Z');
    expect(parseCalendarDateTimeEditInTimeZone('25/10/2026 02:10:00.123', source, zone)?.toISOString())
      .toBe('2026-10-25T01:10:00.123Z');
  });

  it('keeps the second pass when only milliseconds are edited', () => {
    const source = new Date('2026-10-25T01:10:00.123Z');
    expect(parseCalendarDateTimeEditInTimeZone('25/10/2026 02:10:00.456', source, zone)?.toISOString())
      .toBe('2026-10-25T01:10:00.456Z');
  });

  it('keeps the first pass for edits to a first-pass reading', () => {
    const source = new Date('2026-10-25T00:10:00.123Z');
    expect(parseCalendarDateTimeEditInTimeZone('25/10/2026 02:10:00.456', source, zone)?.toISOString())
      .toBe('2026-10-25T00:10:00.456Z');
  });

  it('uses the first pass when an ordinary source is edited to an ambiguous time', () => {
    const source = new Date('2026-10-24T23:10:00.123Z');
    expect(parseCalendarDateTimeEditInTimeZone('25/10/2026 02:10:00.456', source, zone)?.toISOString())
      .toBe('2026-10-25T00:10:00.456Z');
  });

  it('rejects wall times skipped by a forward clock change', () => {
    const source = new Date('2026-03-29T00:10:00.000Z');
    expect(parseCalendarDateTimeEditInTimeZone('29/03/2026 02:30:00.000', source, zone))
      .toBeNull();
  });
});


it.each([
  '31/02/2026 12:00:00.000', '29/02/2025 12:00:00.000',
  '21/10/2026 24:00:00.000', '21/10/2026 12:60:00.000',
  '21/10/2026 12:00:60.000', '21/10/2026 12:00:00.___',
])('rejects impossible or incomplete timestamp %s without normalizing it', (text) => {
  expect(parseCalendarDateTimeEditInTimeZone(text, new Date('2026-10-21T08:00:00Z'), 'Europe/Paris')).toBeNull();
});
