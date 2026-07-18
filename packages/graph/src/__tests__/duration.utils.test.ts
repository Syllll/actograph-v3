import { TimeDisplayFormatEnum } from '@actograph/core';
import { formatCalendarFixed, formatChronometerFixed } from '../utils/duration.utils';

describe('formatCalendarFixed', () => {
  // 15 janvier 2024, 09:05:03.007 (heure locale, comme les dates de readings)
  const date = new Date(2024, 0, 15, 9, 5, 3, 7);

  it('Full: JJ.MM.AAAA hh:mn:sec:ms', () => {
    expect(formatCalendarFixed(date, TimeDisplayFormatEnum.Full)).toBe(
      '15.01.2024 09:05:03:007',
    );
  });

  it('DateOnly: JJ.MM.AAAA', () => {
    expect(formatCalendarFixed(date, TimeDisplayFormatEnum.DateOnly)).toBe('15.01.2024');
  });

  it('HourMinute: hh:mn', () => {
    expect(formatCalendarFixed(date, TimeDisplayFormatEnum.HourMinute)).toBe('09:05');
  });

  it('HourMinuteSecond: hh:mn:sec', () => {
    expect(formatCalendarFixed(date, TimeDisplayFormatEnum.HourMinuteSecond)).toBe('09:05:03');
  });

  it('MinuteSecond: mn:sec', () => {
    expect(formatCalendarFixed(date, TimeDisplayFormatEnum.MinuteSecond)).toBe('05:03');
  });

  it('Second: sec seules (sans ms)', () => {
    expect(formatCalendarFixed(date, TimeDisplayFormatEnum.Second)).toBe('03');
  });

  it('MinuteSecondMs: mn:sec:ms', () => {
    expect(formatCalendarFixed(date, TimeDisplayFormatEnum.MinuteSecondMs)).toBe('05:03:007');
  });
});

describe('formatChronometerFixed', () => {
  const t0 = new Date(2000, 0, 1, 0, 0, 0, 0);

  it('Full: durée complète compacte', () => {
    // 1j 2h 3m 4s 5ms
    const ms = ((1 * 24 + 2) * 60 * 60 + 3 * 60 + 4) * 1000 + 5;
    const date = new Date(t0.getTime() + ms);
    expect(formatChronometerFixed(date, t0, TimeDisplayFormatEnum.Full)).toBe(
      '1j 2h 3m 4s 5ms',
    );
  });

  it('DateOnly: nombre de jours écoulés', () => {
    const date = new Date(t0.getTime() + 3 * 24 * 60 * 60 * 1000);
    expect(formatChronometerFixed(date, t0, TimeDisplayFormatEnum.DateOnly)).toBe('3j');
  });

  it('HourMinute: heures:minutes cumulées (jours inclus dans les heures)', () => {
    // 1j 2h 30m -> 26h30m
    const date = new Date(t0.getTime() + ((1 * 24 + 2) * 60 + 30) * 60 * 1000);
    expect(formatChronometerFixed(date, t0, TimeDisplayFormatEnum.HourMinute)).toBe('26h30m');
  });

  it('HourMinuteSecond: heures:minutes:secondes cumulées', () => {
    const date = new Date(t0.getTime() + (2 * 60 * 60 + 5 * 60 + 9) * 1000);
    expect(formatChronometerFixed(date, t0, TimeDisplayFormatEnum.HourMinuteSecond)).toBe(
      '2h05m09s',
    );
  });

  it('MinuteSecond: minutes:secondes cumulées (heures incluses dans les minutes)', () => {
    // 1h 2m 3s -> 62m03s
    const date = new Date(t0.getTime() + (1 * 60 * 60 + 2 * 60 + 3) * 1000);
    expect(formatChronometerFixed(date, t0, TimeDisplayFormatEnum.MinuteSecond)).toBe('62m03s');
  });

  it('Second: secondes totales cumulées (sans ms)', () => {
    // 1h 2m 3s -> 3723s
    const date = new Date(t0.getTime() + (1 * 60 * 60 + 2 * 60 + 3) * 1000);
    expect(formatChronometerFixed(date, t0, TimeDisplayFormatEnum.Second)).toBe('3723s');
  });

  it('MinuteSecondMs: minutes:secondes:millisecondes cumulées', () => {
    const date = new Date(t0.getTime() + 3 * 60 * 1000 + 4 * 1000 + 56);
    expect(formatChronometerFixed(date, t0, TimeDisplayFormatEnum.MinuteSecondMs)).toBe(
      '3m04s056ms',
    );
  });

  it('gère une date antérieure à t0 sans lever (durée négative)', () => {
    const date = new Date(t0.getTime() - 5000);
    expect(() => formatChronometerFixed(date, t0, TimeDisplayFormatEnum.Full)).not.toThrow();
  });
});
