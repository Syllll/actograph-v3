import type { IPeriod, IReading } from '@actograph/core';
/**
 * Pause intervals for graph rendering (overlay tranche 2).
 * Reuses core pairing logic; pauses do not affect continuous segment geometry.
 */
export declare function getGraphPausePeriods(readings: IReading[]): IPeriod[];
//# sourceMappingURL=pause-periods.utils.d.ts.map