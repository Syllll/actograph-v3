import type { IReading } from '@actograph/core';
/** Global STOP markers injected into every continuous category. */
export declare function extractSessionBoundaryReadings(readings: IReading[]): IReading[];
/**
 * Merges category DATA readings with global STOP markers and trims
 * entries before the first DATA (e.g. leading STOP markers).
 */
export declare function mergeContinuousCategoryReadings(categoryDataReadings: IReading[], sessionBoundaryReadings: IReading[]): IReading[];
/** True when a DATA reading starts a new session without bridging the previous segment. */
export declare function isNewSessionWithoutBridge(reading: IReading, previousReading: IReading | undefined): boolean;
/** True when a consecutive STOP should be skipped during continuous rendering. */
export declare function shouldSkipConsecutiveStop(reading: IReading, previousReading: IReading | undefined): boolean;
/** True when a reading should not draw geometry in the continuous normal loop. */
export declare function shouldSkipInContinuousDraw(reading: IReading, previousReading: IReading | undefined): boolean;
/**
 * Returns indices where a new continuous segment starts (first DATA, then each
 * DATA after STOP without bridge). Pauses do not split segments.
 */
export declare function getContinuousSegmentStartIndices(readings: IReading[]): number[];
/**
 * Consecutive DATA pairs within the same continuous segment (no bridge across
 * STOP). Pauses are ignored and do not break pairing. Used for background and
 * frieze rendering.
 */
export declare function iterContinuousDataPairs(readings: IReading[]): Array<{
    from: IReading;
    to: IReading;
}>;
//# sourceMappingURL=continuous-segments.utils.d.ts.map