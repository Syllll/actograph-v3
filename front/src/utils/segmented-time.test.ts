import { formatSegmentedDuration, hasSegmentedTimeShape, isValidSegmentedTime, overwriteSegmentedDigits, parseSegmentedDuration } from './segmented-time';

describe('segmented time formatting and strict validation', () => {
  it.each([0, 1, 999, 3600000, 86400000, 123456789, 1000 * 86400000, 99999999 * 86400000])('round-trips duration %p without losing days or milliseconds', (milliseconds) => {
    expect(parseSegmentedDuration(formatSegmentedDuration(milliseconds))).toBe(milliseconds);
  });
  it('keeps exact segment widths including days', () => {
    expect(formatSegmentedDuration(86400000 + 3661001)).toBe('001j 01:01:01.001');
  });
  it.each(['000j 24:00:00.000', '000j 00:60:00.000', '000j 00:00:60.000', '-001j 00:00:00.000', '000j 0:00:00.000', '000j 00:00:00.0000', '5m'])('rejects malformed duration %p', (value) => {
    expect(parseSegmentedDuration(value)).toBeNull();
  });
  it.each(['29/02/2024 23:59:59.999', '29/02/2000 00:00:00.000', '01/01/0001 00:00:00.000'])('accepts valid calendar %p', (value) => {
    expect(isValidSegmentedTime(value, 'calendar')).toBe(true);
  });
  it.each(['29/02/2026 00:00:00.000', '29/02/1900 00:00:00.000', '31/04/2026 00:00:00.000', '00/01/2026 00:00:00.000', '01/13/2026 00:00:00.000', '01/01/0000 00:00:00.000', '01/01/2026 24:00:00.000', '01/01/2026 00:60:00.000', '01/01/2026 00:00:60.000', '1/01/2026 00:00:00.000'])('rejects impossible calendar %p without normalization', (value) => {
    expect(isValidSegmentedTime(value, 'calendar')).toBe(false);
  });
  it('recognizes cleared but fixed-width draft slots', () => {
    expect(hasSegmentedTimeShape('__/10/2026 10:00:00.000', 'calendar')).toBe(true);
    expect(isValidSegmentedTime('__/10/2026 10:00:00.000', 'calendar')).toBe(false);
  });
});

describe('fixed position digit replacement', () => {
  const source = '21/10/2026 12:34:56.789';
  it('types continuously from minutes through seconds and milliseconds', () => {
    expect(overwriteSegmentedDigits(source, '1234567', 14)).toEqual({ text: '21/10/2026 12:12:34.567', caret: 23 });
  });
  it('caps pasted digits at the final millisecond slot', () => {
    expect(overwriteSegmentedDigits(source, '123456', 21)).toEqual({ text: '21/10/2026 12:34:56.712', caret: 23 });
  });
  it('clears selected slots without removing separators', () => {
    expect(overwriteSegmentedDigits(source, '', 0, 10).text).toBe('__/__/____ 12:34:56.789');
  });
  it('does not wrap overflow to the first slot', () => {
    expect(overwriteSegmentedDigits(source, '99', source.length).text).toBe(source);
  });
});
