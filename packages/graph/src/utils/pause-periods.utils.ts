import { calculatePausePeriods } from '@actograph/core';
import type { IPeriod, IReading } from '@actograph/core';

/**
 * Pause intervals for graph rendering (overlay tranche 2).
 * Reuses core pairing logic; pauses do not affect continuous segment geometry.
 */
export function getGraphPausePeriods(readings: IReading[]): IPeriod[] {
  return calculatePausePeriods(readings);
}
