/**
 * Date-time helpers for mobile readings.
 *
 * Readings are stored as "floating" local datetimes (no timezone suffix)
 * to preserve the wall-clock time seen by the user (e.g. 10:00 stays 10:00).
 */

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function pad3(value: number): string {
  return String(value).padStart(3, '0');
}

export function toAbsoluteDateTimeString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${pad3(date.getMilliseconds())}`;
}

export function toAbsoluteTimeString(
  dateLike: Date | string,
  withMilliseconds = true
): string {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());

  if (!withMilliseconds) {
    return `${hh}:${mm}:${ss}`;
  }

  return `${hh}:${mm}:${ss}.${pad3(date.getMilliseconds())}`;
}
