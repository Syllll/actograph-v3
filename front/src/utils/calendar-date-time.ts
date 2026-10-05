import {
  formatCalendarDateTime,
  parseCalendarDateTimeInTimeZone,
} from '@actograph/core';

/** Parse edited calendar text in the observation zone, keeping the source pass during a DST fold. */
export function parseCalendarDateTimeEditInTimeZone(
  wallText: string,
  sourceDate: Date,
  timeZone: string,
): Date | null {
  const format = 'DD/MM/YYYY HH:mm:ss.SSS';
  const sourceWallText = formatCalendarDateTime(sourceDate, timeZone, format);
  if (wallText === sourceWallText) return sourceDate;

  const sourceEarlierPass = parseCalendarDateTimeInTimeZone(
    sourceWallText,
    timeZone,
    'earlier',
  );
  const sourceLaterPass = parseCalendarDateTimeInTimeZone(
    sourceWallText,
    timeZone,
    'later',
  );
  const sourceIsInRepeatedTime = sourceEarlierPass !== null
    && sourceLaterPass !== null
    && sourceEarlierPass.getTime() !== sourceLaterPass.getTime();
  const disambiguation = sourceIsInRepeatedTime
    && sourceLaterPass.getTime() === sourceDate.getTime()
    ? 'later'
    : 'earlier';
  return parseCalendarDateTimeInTimeZone(wallText, timeZone, disambiguation);
}
