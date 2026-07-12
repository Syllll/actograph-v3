import type { IReading } from '../types';
import {
  filterReadingsForGraphDisplay,
  getGraphDisplayTimeBounds,
} from '../utils/reading-graph-scope';

/**
 * Align statistics with graph scope: same filtered readings and time bounds.
 */
export function scopeReadingsForStatistics(readings: IReading[]): {
  scopedReadings: IReading[];
  observationStart: Date | null;
  observationEnd: Date | null;
} {
  const scopedReadings = filterReadingsForGraphDisplay(readings);
  const bounds = getGraphDisplayTimeBounds(readings);

  if (!bounds || scopedReadings.length === 0) {
    return {
      scopedReadings,
      observationStart: null,
      observationEnd: null,
    };
  }

  return {
    scopedReadings,
    observationStart: new Date(bounds.startMs),
    observationEnd: new Date(bounds.endMs),
  };
}
