export type SegmentedTimeKind = 'calendar' | 'duration';

const calendarPattern = /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2}\.\d{3}$/;
const durationPattern = /^\d{3,8}j \d{2}:\d{2}:\d{2}\.\d{3}$/;

export function formatSegmentedDuration(milliseconds: number): string {
  const whole = Math.max(0, Math.trunc(milliseconds));
  const days = Math.floor(whole / 86400000).toString().padStart(3, '0');
  const hours = Math.floor(whole / 3600000) % 24;
  const minutes = Math.floor(whole / 60000) % 60;
  const seconds = Math.floor(whole / 1000) % 60;
  const pad = (value: number, width = 2) => value.toString().padStart(width, '0');
  return `${days}j ${pad(hours)}:${pad(minutes)}:${pad(seconds)}.${pad(whole % 1000, 3)}`;
}

export function parseSegmentedDuration(text: string): number | null {
  if (!durationPattern.test(text)) return null;
  const parts = text.match(/\d+/g)?.map(Number);
  if (!parts) return null;
  const [days, hours, minutes, seconds, milliseconds] = parts;
  if (hours > 23 || minutes > 59 || seconds > 59) return null;
  const duration = days * 86400000 + hours * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds;
  return Number.isSafeInteger(duration) ? duration : null;
}

/** Validate without normalizing impossible dates such as 31 February. Zone/DST validation belongs to the caller. */
export function isValidSegmentedTime(text: string, kind: SegmentedTimeKind): boolean {
  if (kind === 'duration') return parseSegmentedDuration(text) !== null;
  if (!calendarPattern.test(text)) return false;
  const [day, month, year, hours, minutes, seconds] = (text.match(/\d+/g) ?? []).map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || hours > 23 || minutes > 59 || seconds > 59) return false;
  const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const monthDays = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day <= monthDays[month - 1];
}

export function hasSegmentedTimeShape(text: string, kind: SegmentedTimeKind): boolean {
  const pattern = kind === 'calendar'
    ? /^[\d_]{2}\/[\d_]{2}\/[\d_]{4} [\d_]{2}:[\d_]{2}:[\d_]{2}\.[\d_]{3}$/
    : /^[\d_]{3,8}j [\d_]{2}:[\d_]{2}:[\d_]{2}\.[\d_]{3}$/;
  return pattern.test(text);
}

/** Separator positions never move. Clearing a digit leaves an incomplete slot. */
export function overwriteSegmentedDigits(
  text: string,
  digits: string,
  start: number,
  end = start,
): { text: string; caret: number } {
  const characters = [...text];
  const slots = characters.map((value, index) => /[\d_]/.test(value) ? index : -1).filter((index) => index >= 0);
  slots.filter((index) => index >= start && index < end).forEach((index) => { characters[index] = '_'; });
  const targets = slots.filter((index) => index >= start);
  const input = digits.replace(/\D/g, '').slice(0, targets.length);
  [...input].forEach((digit, index) => { characters[targets[index]] = digit; });
  const caret = input.length ? (targets[input.length] ?? text.length) : start;
  return { text: characters.join(''), caret };
}
