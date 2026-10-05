/**
 * Detection of the wall clock going back (end of daylight saving time) in the
 * device timezone. Readings and durations remain exact across the repeated
 * period. Forward changes skip wall-clock times without losing information
 * and are ignored here.
 */

const MINUTE_MS = 60 * 1000;
const SAMPLE_STEP_MS = 15 * MINUTE_MS;
/** Warn this long before the clock goes back. */
export const CLOCK_CHANGE_WARNING_MS = 60 * MINUTE_MS;

export interface IClockChange {
  /** Instant of the change. */
  at: number;
  /** Date#getTimezoneOffset() before and after the change, in minutes. */
  offsetBefore: number;
  offsetAfter: number;
}

export interface IClockChangeNotice {
  phase: 'upcoming' | 'repeated';
  /** Identifies the notice so that dismissing it does not hide the next phase. */
  key: string;
  title: string;
  message: string;
}

const offsetAt = (ms: number) => new Date(ms).getTimezoneOffset();

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** "HH:MM" shown by a clock using the given offset at this instant. */
function wallTime(ms: number, offset: number): string {
  const shifted = new Date(ms - offset * MINUTE_MS);
  return `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}

function formatShift(minutes: number): string {
  if (minutes === 60) return 'd’une heure';
  if (minutes % 60 === 0) return `de ${minutes / 60} heures`;
  return `de ${minutes} min`;
}

/** First backward clock change in [fromMs, toMs], or null. */
export function findClockGoingBack(fromMs: number, toMs: number): IClockChange | null {
  let previous = fromMs;
  let previousOffset = offsetAt(previous);
  while (previous < toMs) {
    const next = Math.min(previous + SAMPLE_STEP_MS, toMs);
    const nextOffset = offsetAt(next);
    if (nextOffset !== previousOffset) {
      let low = previous;
      let high = next;
      while (high - low > 1) {
        const middle = Math.floor((low + high) / 2);
        if (offsetAt(middle) === previousOffset) low = middle;
        else high = middle;
      }
      if (nextOffset > previousOffset) {
        return { at: high, offsetBefore: previousOffset, offsetAfter: nextOffset };
      }
    }
    previous = next;
    previousOffset = nextOffset;
  }
  return null;
}

/** Notice to display at `nowMs`: shortly before the clock goes back, then during the repeated period. */
export function getClockChangeNotice(nowMs: number): IClockChangeNotice | null {
  const recent = findClockGoingBack(nowMs - 3 * 60 * MINUTE_MS, nowMs);
  if (recent) {
    const shift = recent.offsetAfter - recent.offsetBefore;
    const repeatedUntil = recent.at + shift * MINUTE_MS;
    if (nowMs < repeatedUntil) {
      const end = wallTime(repeatedUntil, recent.offsetAfter);
      return {
        phase: 'repeated',
        key: `repeated-${recent.at}`,
        title: `Heure répétée jusqu’à ${end}`,
        message: `L’horloge a reculé ${formatShift(shift)}. Vos relevés et leurs durées restent exacts.`,
      };
    }
  }

  const upcoming = findClockGoingBack(nowMs, nowMs + CLOCK_CHANGE_WARNING_MS);
  if (!upcoming) return null;
  const shift = upcoming.offsetAfter - upcoming.offsetBefore;
  const changeTime = wallTime(upcoming.at, upcoming.offsetBefore);
  const backTo = wallTime(upcoming.at, upcoming.offsetAfter);
  const minutes = Math.max(1, Math.ceil((upcoming.at - nowMs) / MINUTE_MS));
  return {
    phase: 'upcoming',
    key: `upcoming-${upcoming.at}`,
    title: `Changement d’heure dans ${minutes} min`,
    message: `À ${changeTime}, l’horloge reculera ${formatShift(shift)} (retour à ${backTo}). Vos relevés et leurs durées resteront exacts.`,
  };
}
