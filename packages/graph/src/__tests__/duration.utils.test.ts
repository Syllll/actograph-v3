import { TimeDisplayFormatEnum } from '@actograph/core';
import {
  formatAxisLabel,
  formatCalendarAutoHover,
  formatCalendarFixed,
  formatChronometerFixed,
  getCalendarFixedFormatNotation,
} from '../utils/duration.utils';

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

  it('formats calendar labels in an explicitly configured origin zone', () => {
    const instant = new Date('2026-10-25T01:10:00.123Z');
    expect(formatCalendarFixed(instant, TimeDisplayFormatEnum.Full, 'Europe/Paris'))
      .toBe('25.10.2026 02:10:00:123');
    expect(formatAxisLabel(instant, 60 * 60 * 1000, 'Europe/Paris'))
      .toBe('25/10 02:10:00');
  });

  it('preserves the historical auto hover label, with optional origin-zone formatting', () => {
    const instant = new Date('2026-10-25T01:10:00.123Z');
    const oldLocalLabel = instant.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      second: '2-digit', fractionalSecondDigits: 3,
    }).replace(/\//g, '-');
    const oldParisLabel = instant.toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
      second: '2-digit', fractionalSecondDigits: 3, timeZone: 'Europe/Paris',
    }).replace(/\//g, '-');
    expect(formatCalendarAutoHover(instant)).toBe(oldLocalLabel);
    expect(formatCalendarAutoHover(instant, 'Europe/Paris')).toBe(oldParisLabel);
    expect(formatCalendarAutoHover(instant, 'Invalid/Timezone')).toBe(oldLocalLabel);
  });
});

describe('getCalendarFixedFormatNotation', () => {
  it('renvoie la notation courte attendue pour chaque format fixe', () => {
    expect(getCalendarFixedFormatNotation(TimeDisplayFormatEnum.Full)).toBe(
      'JJ.MM.AAAA hh:mn:sec:ms',
    );
    expect(getCalendarFixedFormatNotation(TimeDisplayFormatEnum.DateOnly)).toBe('JJ.MM.AAAA');
    expect(getCalendarFixedFormatNotation(TimeDisplayFormatEnum.HourMinute)).toBe('hh:mn');
    expect(getCalendarFixedFormatNotation(TimeDisplayFormatEnum.HourMinuteSecond)).toBe(
      'hh:mn:sec',
    );
    expect(getCalendarFixedFormatNotation(TimeDisplayFormatEnum.MinuteSecond)).toBe('mn:sec');
    expect(getCalendarFixedFormatNotation(TimeDisplayFormatEnum.Second)).toBe('sec');
    expect(getCalendarFixedFormatNotation(TimeDisplayFormatEnum.MinuteSecondMs)).toBe(
      'mn:sec:ms',
    );
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
