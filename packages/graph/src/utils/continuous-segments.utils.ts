import type { IReading } from '@actograph/core';
import { ReadingTypeEnum } from '@actograph/core';

function getReadingTimeMs(reading: IReading): number {
  return new Date(reading.dateTime).getTime();
}

function sortReadingsByTime(readings: IReading[]): IReading[] {
  return [...readings]
    .filter((reading) => Number.isFinite(getReadingTimeMs(reading)))
    .sort((a, b) => getReadingTimeMs(a) - getReadingTimeMs(b));
}

/**
 * STOP always breaks a segment. In calendar mode, an open pause spans real
 * wall-clock time (unlike chronometer mode, where elapsed time is frozen
 * during a pause), so PAUSE_START/PAUSE_END must break segments too —
 * otherwise the state drawn before the pause silently bridges across it.
 */
function isBoundaryReadingType(
  type: IReading['type'],
  treatPauseAsBoundary: boolean,
): boolean {
  return (
    type === ReadingTypeEnum.STOP ||
    (treatPauseAsBoundary &&
      (type === ReadingTypeEnum.PAUSE_START || type === ReadingTypeEnum.PAUSE_END))
  );
}

/** Global STOP (and, in calendar mode, pause) markers injected into every continuous category. */
export function extractSessionBoundaryReadings(
  readings: IReading[],
  treatPauseAsBoundary = false,
): IReading[] {
  return sortReadingsByTime(readings).filter((reading) =>
    isBoundaryReadingType(reading.type, treatPauseAsBoundary),
  );
}

/**
 * Merges category DATA readings with global boundary markers and trims
 * entries before the first DATA (e.g. leading STOP markers).
 */
export function mergeContinuousCategoryReadings(
  categoryDataReadings: IReading[],
  sessionBoundaryReadings: IReading[],
): IReading[] {
  const merged = sortReadingsByTime([...categoryDataReadings, ...sessionBoundaryReadings]);
  const firstDataIndex = merged.findIndex(
    (reading) => reading.type === ReadingTypeEnum.DATA,
  );
  if (firstDataIndex === -1) {
    return [];
  }
  return firstDataIndex > 0 ? merged.slice(firstDataIndex) : merged;
}

/** True when a DATA reading starts a new session without bridging the previous segment. */
export function isNewSessionWithoutBridge(
  reading: IReading,
  previousReading: IReading | undefined,
  treatPauseAsBoundary = false,
): boolean {
  return (
    reading.type === ReadingTypeEnum.DATA &&
    !!previousReading &&
    isBoundaryReadingType(previousReading.type, treatPauseAsBoundary)
  );
}

/** True when a consecutive boundary reading should be skipped during continuous rendering. */
export function shouldSkipConsecutiveStop(
  reading: IReading,
  previousReading: IReading | undefined,
  treatPauseAsBoundary = false,
): boolean {
  return (
    !!previousReading &&
    isBoundaryReadingType(reading.type, treatPauseAsBoundary) &&
    isBoundaryReadingType(previousReading.type, treatPauseAsBoundary)
  );
}

/** True when a reading should not draw geometry in the continuous normal loop. */
export function shouldSkipInContinuousDraw(
  reading: IReading,
  previousReading: IReading | undefined,
  treatPauseAsBoundary = false,
): boolean {
  if (shouldSkipConsecutiveStop(reading, previousReading, treatPauseAsBoundary)) {
    return true;
  }
  if (treatPauseAsBoundary) {
    return false;
  }
  // Legacy behaviour (chronometer mode): pauses never break a segment, so
  // pause markers are simply ignored during rendering.
  return (
    reading.type === ReadingTypeEnum.PAUSE_START ||
    reading.type === ReadingTypeEnum.PAUSE_END
  );
}

/**
 * Returns indices where a new continuous segment starts (first DATA, then each
 * DATA after a boundary reading without bridge). With treatPauseAsBoundary,
 * an open pause splits segments the same way a STOP does.
 */
export function getContinuousSegmentStartIndices(
  readings: IReading[],
  treatPauseAsBoundary = false,
): number[] {
  const firstDataIndex = readings.findIndex(
    (reading) => reading.type === ReadingTypeEnum.DATA,
  );
  if (firstDataIndex === -1) {
    return [];
  }

  const starts: number[] = [firstDataIndex];

  for (let i = firstDataIndex + 1; i < readings.length; i++) {
    const reading = readings[i];
    const previousReading = readings[i - 1];
    if (!reading) {
      continue;
    }

    if (shouldSkipInContinuousDraw(reading, previousReading, treatPauseAsBoundary)) {
      continue;
    }

    if (isNewSessionWithoutBridge(reading, previousReading, treatPauseAsBoundary)) {
      starts.push(i);
    }
  }

  return starts;
}

/**
 * Consecutive DATA pairs within the same continuous segment (no bridge across
 * a boundary). Used for background and frieze rendering.
 *
 * The last DATA of a segment is also paired with the segment's closing
 * boundary (session end or, in calendar mode, pause start), so the final
 * state is drawn through to that boundary instead of disappearing.
 */
export function iterContinuousDataPairs(
  readings: IReading[],
  treatPauseAsBoundary = false,
): Array<{ from: IReading; to: IReading }> {
  const starts = getContinuousSegmentStartIndices(readings, treatPauseAsBoundary);
  const pairs: Array<{ from: IReading; to: IReading }> = [];

  for (let s = 0; s < starts.length; s++) {
    const segmentStartIdx = starts[s]!;
    const segmentEndIdx = s + 1 < starts.length ? starts[s + 1]! : readings.length;
    const segmentReadings = readings.slice(segmentStartIdx, segmentEndIdx);
    const dataInSegment = segmentReadings.filter(
      (reading) => reading.type === ReadingTypeEnum.DATA,
    );

    for (let i = 0; i < dataInSegment.length - 1; i++) {
      pairs.push({ from: dataInSegment[i]!, to: dataInSegment[i + 1]! });
    }

    const lastData = dataInSegment[dataInSegment.length - 1];
    // Boundary readings only ever trail the last DATA of a segment (a DATA
    // right after one always starts a new segment), so the first boundary
    // found scanning forward is also the earliest — e.g. PAUSE_START rather
    // than the PAUSE_END that closes it out, which is what should end the
    // drawn state.
    const boundary = segmentReadings.find((reading) =>
      isBoundaryReadingType(reading.type, treatPauseAsBoundary),
    );
    if (lastData && boundary) {
      pairs.push({ from: lastData, to: boundary });
    }
  }

  return pairs;
}

/** Exported for reuse by drawing code that needs the same boundary semantics. */
export { isBoundaryReadingType };
