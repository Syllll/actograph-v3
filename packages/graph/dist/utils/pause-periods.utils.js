import { calculatePausePeriods } from '@actograph/core';
/**
 * Pause intervals for graph rendering (overlay tranche 2).
 * Reuses core pairing logic; pauses do not affect continuous segment geometry.
 */
export function getGraphPausePeriods(readings) {
    return calculatePausePeriods(readings);
}
//# sourceMappingURL=pause-periods.utils.js.map