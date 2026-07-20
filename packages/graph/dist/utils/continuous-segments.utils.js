import { ReadingTypeEnum } from '@actograph/core';
function getReadingTimeMs(reading) {
    return new Date(reading.dateTime).getTime();
}
function sortReadingsByTime(readings) {
    return [...readings]
        .filter((reading) => Number.isFinite(getReadingTimeMs(reading)))
        .sort((a, b) => getReadingTimeMs(a) - getReadingTimeMs(b));
}
/** Global STOP markers injected into every continuous category. */
export function extractSessionBoundaryReadings(readings) {
    return sortReadingsByTime(readings).filter((reading) => reading.type === ReadingTypeEnum.STOP);
}
/**
 * Merges category DATA readings with global STOP markers and trims
 * entries before the first DATA (e.g. leading STOP markers).
 */
export function mergeContinuousCategoryReadings(categoryDataReadings, sessionBoundaryReadings) {
    const merged = sortReadingsByTime([...categoryDataReadings, ...sessionBoundaryReadings]);
    const firstDataIndex = merged.findIndex((reading) => reading.type === ReadingTypeEnum.DATA);
    if (firstDataIndex === -1) {
        return [];
    }
    return firstDataIndex > 0 ? merged.slice(firstDataIndex) : merged;
}
/** True when a DATA reading starts a new session without bridging the previous segment. */
export function isNewSessionWithoutBridge(reading, previousReading) {
    return (reading.type === ReadingTypeEnum.DATA &&
        previousReading?.type === ReadingTypeEnum.STOP);
}
/** True when a consecutive STOP should be skipped during continuous rendering. */
export function shouldSkipConsecutiveStop(reading, previousReading) {
    return (reading.type === ReadingTypeEnum.STOP &&
        previousReading?.type === ReadingTypeEnum.STOP);
}
/** True when a reading should not draw geometry in the continuous normal loop. */
export function shouldSkipInContinuousDraw(reading, previousReading) {
    if (shouldSkipConsecutiveStop(reading, previousReading)) {
        return true;
    }
    return (reading.type === ReadingTypeEnum.PAUSE_START ||
        reading.type === ReadingTypeEnum.PAUSE_END);
}
/**
 * Returns indices where a new continuous segment starts (first DATA, then each
 * DATA after STOP without bridge). Pauses do not split segments.
 */
export function getContinuousSegmentStartIndices(readings) {
    const firstDataIndex = readings.findIndex((reading) => reading.type === ReadingTypeEnum.DATA);
    if (firstDataIndex === -1) {
        return [];
    }
    const starts = [firstDataIndex];
    for (let i = firstDataIndex + 1; i < readings.length; i++) {
        const reading = readings[i];
        const previousReading = readings[i - 1];
        if (!reading) {
            continue;
        }
        if (shouldSkipInContinuousDraw(reading, previousReading)) {
            continue;
        }
        if (isNewSessionWithoutBridge(reading, previousReading)) {
            starts.push(i);
        }
    }
    return starts;
}
/**
 * Consecutive DATA pairs within the same continuous segment (no bridge across
 * STOP). Pauses are ignored and do not break pairing. Used for background and
 * frieze rendering.
 *
 * The last DATA of a segment is also paired with the segment's closing STOP
 * (session end or pause), so the final state is drawn through to that
 * boundary instead of disappearing.
 */
export function iterContinuousDataPairs(readings) {
    const starts = getContinuousSegmentStartIndices(readings);
    const pairs = [];
    for (let s = 0; s < starts.length; s++) {
        const segmentStartIdx = starts[s];
        const segmentEndIdx = s + 1 < starts.length ? starts[s + 1] : readings.length;
        const segmentReadings = readings.slice(segmentStartIdx, segmentEndIdx);
        const dataInSegment = segmentReadings.filter((reading) => reading.type === ReadingTypeEnum.DATA);
        for (let i = 0; i < dataInSegment.length - 1; i++) {
            pairs.push({ from: dataInSegment[i], to: dataInSegment[i + 1] });
        }
        const lastData = dataInSegment[dataInSegment.length - 1];
        const boundary = [...segmentReadings]
            .reverse()
            .find((reading) => reading.type === ReadingTypeEnum.STOP);
        if (lastData && boundary) {
            pairs.push({ from: lastData, to: boundary });
        }
    }
    return pairs;
}
//# sourceMappingURL=continuous-segments.utils.js.map