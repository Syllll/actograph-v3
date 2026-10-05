/**
 * Date-time helpers for mobile readings.
 *
 * New readings use UTC. Calendar display uses the observation's origin
 * timezone when available, or the device timezone for legacy chronicles.
 */

import { getCalendarDateParts } from '@actograph/core';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function pad3(value: number): string {
  return String(value).padStart(3, '0');
}

export function toAbsoluteDateTimeString(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}T${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}.${pad3(date.getMilliseconds())}`;
}

/** Store the actual instant, independently of the device timezone. */
export function toReadingDateTimeString(date: Date): string {
  return date.toISOString();
}

export function toAbsoluteTimeString(
  dateLike: Date | string,
  withMilliseconds = true,
  timeZone?: string
): string {
  const date = dateLike instanceof Date ? dateLike : new Date(dateLike);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const parts = getCalendarDateParts(date, timeZone);
  const hh = pad2(parts.hour);
  const mm = pad2(parts.minute);
  const ss = pad2(parts.second);

  if (!withMilliseconds) {
    return `${hh}:${mm}:${ss}`;
  }

  return `${hh}:${mm}:${ss}.${pad3(parts.millisecond)}`;
}
