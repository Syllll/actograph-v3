import { TimeDisplayFormatEnum } from '../enums/time-display-format.enum';

export type CalendarDateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
};

export type RepeatedTimeDisambiguation = 'earlier' | 'later' | 'reject';

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timeZone: string): Intl.DateTimeFormat | null {
  const cached = formatterCache.get(timeZone);
  if (cached) return cached;

  try {
    const formatter = new Intl.DateTimeFormat('en-CA-u-ca-gregory-nu-latn', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(timeZone, formatter);
    return formatter;
  } catch {
    return null;
  }
}

function parseParts(formatter: Intl.DateTimeFormat, date: Date): CalendarDateParts {
  const values: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') {
      values[part.type] = Number(part.value);
    }
  }
  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
    millisecond: date.getUTCMilliseconds(),
  };
}

function localParts(date: Date): CalendarDateParts {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds(),
  };
}

export function isValidTimeZone(timeZone: unknown): timeZone is string {
  return typeof timeZone === 'string' && timeZone.trim().length > 0 && getFormatter(timeZone) !== null;
}

/** Read a valid IANA time zone from observation metadata, if present. */
export function getObservationTimeZone(meta: unknown): string | undefined {
  if (meta === null || typeof meta !== 'object' || !('timeZone' in meta)) return undefined;
  const timeZone = (meta as { timeZone?: unknown }).timeZone;
  if (!isValidTimeZone(timeZone)) return undefined;
  return getFormatter(timeZone)?.resolvedOptions().timeZone;
}

export function getLocalTimeZone(): string {
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return isValidTimeZone(local) ? getFormatter(local)!.resolvedOptions().timeZone : 'UTC';
}

/** Calendar fields in the requested IANA zone; omitted or invalid zones use device-local fields. */
export function getCalendarDateParts(date: Date, timeZone?: string): CalendarDateParts {
  if (!Number.isFinite(date.getTime())) {
    return { year: NaN, month: NaN, day: NaN, hour: NaN, minute: NaN, second: NaN, millisecond: NaN };
  }
  if (timeZone) {
    const formatter = getFormatter(timeZone);
    if (formatter) return parseParts(formatter, date);
  }
  return localParts(date);
}

function pad(value: number, width = 2): string {
  return String(value).padStart(width, '0');
}

/** Format a calendar date using graph enum or QDate-style tokens. */
export function formatCalendarDateTime(
  dateLike: Date | string,
  timeZone?: string,
  tokenFormat: string = TimeDisplayFormatEnum.Full,
): string {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (!Number.isFinite(date.getTime())) return '';
  const p = getCalendarDateParts(date, timeZone);
  const dd = pad(p.day);
  const MM = pad(p.month);
  const yyyy = String(p.year);
  const HH = pad(p.hour);
  const mm = pad(p.minute);
  const ss = pad(p.second);
  const SSS = pad(p.millisecond, 3);

  switch (tokenFormat) {
    case TimeDisplayFormatEnum.DateOnly: return `${dd}.${MM}.${yyyy}`;
    case TimeDisplayFormatEnum.HourMinute: return `${HH}:${mm}`;
    case TimeDisplayFormatEnum.HourMinuteSecond: return `${HH}:${mm}:${ss}`;
    case TimeDisplayFormatEnum.MinuteSecond: return `${mm}:${ss}`;
    case TimeDisplayFormatEnum.Second: return ss;
    case TimeDisplayFormatEnum.MinuteSecondMs: return `${mm}:${ss}:${SSS}`;
    case 'DD/MM/YYYY': return `${dd}/${MM}/${yyyy}`;
    case 'HH:mm:ss': return `${HH}:${mm}:${ss}`;
    case 'HH:mm:ss.SSS': return `${HH}:${mm}:${ss}.${SSS}`;
    case 'DD/MM/YYYY HH:mm:ss': return `${dd}/${MM}/${yyyy} ${HH}:${mm}:${ss}`;
    case 'DD/MM/YYYY HH:mm:ss.SSS': return `${dd}/${MM}/${yyyy} ${HH}:${mm}:${ss}.${SSS}`;
    case 'auto': return `${dd}/${MM}/${yyyy} ${HH}:${mm}:${ss}.${SSS}`;
    case TimeDisplayFormatEnum.Full:
    default: return `${dd}.${MM}.${yyyy} ${HH}:${mm}:${ss}:${SSS}`;
  }
}

function sameParts(a: CalendarDateParts, b: CalendarDateParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day &&
    a.hour === b.hour && a.minute === b.minute && a.second === b.second &&
    a.millisecond === b.millisecond;
}

function parseWallText(wallText: string): CalendarDateParts | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?$/.exec(wallText);
  const displayMatch = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(wallText);
  const match = isoMatch ?? displayMatch;
  if (!match) return null;
  const displayOrder = !isoMatch;
  const parts: CalendarDateParts = {
    year: Number(displayOrder ? match[3] : match[1]),
    month: Number(match[2]),
    day: Number(displayOrder ? match[1] : match[3]),
    hour: Number(match[4] ?? 0), minute: Number(match[5] ?? 0), second: Number(match[6] ?? 0),
    millisecond: Number((match[7] ?? '').padEnd(3, '0') || 0),
  };
  const check = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, parts.millisecond));
  const normalized = {
    year: check.getUTCFullYear(), month: check.getUTCMonth() + 1, day: check.getUTCDate(),
    hour: check.getUTCHours(), minute: check.getUTCMinutes(), second: check.getUTCSeconds(),
    millisecond: check.getUTCMilliseconds(),
  };
  return sameParts(parts, normalized) ? parts : null;
}

/** Parse a wall-clock ISO-like value in a zone. Explicit Z/offset strings retain their instant. */
export function parseCalendarDateTimeInTimeZone(
  wallText: string,
  timeZone: string,
  disambiguation: RepeatedTimeDisambiguation = 'earlier',
): Date | null {
  if (!isValidTimeZone(timeZone)) return null;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(wallText)) {
    const explicit = new Date(wallText);
    return Number.isFinite(explicit.getTime()) ? explicit : null;
  }

  const wanted = parseWallText(wallText);
  if (!wanted) return null;
  const formatter = getFormatter(timeZone)!;
  const wallAsUtc = Date.UTC(wanted.year, wanted.month - 1, wanted.day, wanted.hour, wanted.minute, wanted.second, wanted.millisecond);
  const offsets = new Set<number>();
  for (let delta = -48 * 60; delta <= 48 * 60; delta += 180) {
    const probe = new Date(wallAsUtc + delta * 60_000);
    const local = parseParts(formatter, probe);
    const localAsUtc = Date.UTC(local.year, local.month - 1, local.day, local.hour, local.minute, local.second, local.millisecond);
    offsets.add(localAsUtc - probe.getTime());
  }

  const matches = [...offsets]
    .map((offset) => new Date(wallAsUtc - offset))
    .filter((candidate) => sameParts(parseParts(formatter, candidate), wanted))
    .sort((a, b) => a.getTime() - b.getTime());

  if (matches.length === 0 || (matches.length > 1 && disambiguation === 'reject')) return null;
  return disambiguation === 'later' ? matches[matches.length - 1]! : matches[0]!;
}
