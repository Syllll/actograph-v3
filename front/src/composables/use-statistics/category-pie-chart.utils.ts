import { ICategoryStatistics } from '@services/observations/statistics.interface';
import { resolveTotalCategoryDuration } from './statistics-export.utils';

export interface PieChartSegment {
  label: string;
  value: number;
  durationLabel: string;
}

export interface BuildCategoryPieChartDataOptions {
  treatPausesAsSeparateState: boolean;
  pauseSegmentLabel: string;
  unaccountedSegmentLabel: string;
  formatDuration: (ms: number) => string;
}

export const CATEGORY_PIE_CHART_BASE_COLORS = [
  '#1976D2',
  '#388E3C',
  '#F57C00',
  '#7B1FA2',
  '#C2185B',
  '#00796B',
  '#0288D1',
  '#5D4037',
];

export const CATEGORY_PIE_CHART_PAUSE_COLOR = '#9E9E9E';

// Represents the portion of the observation window not covered by any observable
// or pause (e.g. before the first observable of the category was recorded).
// A pale, low-contrast gray (lighter than the pause color) so it reads as "no
// data" rather than as another category. Must be a plain hex string: amCharts5's
// ColorSet doesn't carry alpha, and its CSS rgba() parser rejects spaces after
// commas, so an rgba() value here silently falls through to a wrong color.
export const CATEGORY_PIE_CHART_UNACCOUNTED_COLOR = '#D6D6D6';

export function shouldIncludePauseSegment(
  treatPausesAsSeparateState: boolean,
  pauseDuration: number,
): boolean {
  return treatPausesAsSeparateState && pauseDuration > 0;
}

type PieStatsInput = Pick<
  ICategoryStatistics,
  | 'observables'
  | 'totalCategoryDuration'
  | 'pauseDuration'
  | 'observationDuration'
  | 'windowDuration'
>;

function resolvePieDenominator(
  stats: PieStatsInput,
  includePauseSegment: boolean,
): number {
  const totalWindow = resolveTotalCategoryDuration(stats);
  const pauseDuration = stats.pauseDuration || 0;

  if (includePauseSegment) {
    return totalWindow + pauseDuration;
  }

  // OFF mode: full wall-clock window. Conditional stats expose it explicitly
  // because observationDuration is stored ex-pause for the ON-mode base.
  if (stats.windowDuration && stats.windowDuration > 0) {
    return stats.windowDuration;
  }

  return totalWindow;
}

/**
 * Duration (ms) within the observation window not covered by any observable's "on"
 * period nor by the pause segment. This happens e.g. when the first observable of a
 * category is recorded some time after the observation START: that lead time isn't
 * attributable to any observable and must be shown as an empty slice, not silently
 * dropped (which would make the other slices stretch to fill the whole pie).
 */
export function calculateUnaccountedPieDuration(
  stats: PieStatsInput,
  treatPausesAsSeparateState: boolean,
): number {
  if (!stats.observables || stats.observables.length === 0) {
    return 0;
  }

  const pauseDuration = stats.pauseDuration || 0;
  const includePauseSegment = shouldIncludePauseSegment(
    treatPausesAsSeparateState,
    pauseDuration,
  );
  const pieDenominator = resolvePieDenominator(stats, includePauseSegment);
  if (pieDenominator <= 0) {
    return 0;
  }

  const accountedDuration =
    stats.observables.reduce((sum, obs) => sum + Math.max(0, obs.onDuration || 0), 0) +
    (includePauseSegment ? pauseDuration : 0);

  return Math.max(0, pieDenominator - accountedDuration);
}

export function buildCategoryPieChartData(
  stats: PieStatsInput,
  options: BuildCategoryPieChartDataOptions,
): PieChartSegment[] {
  if (!stats.observables || stats.observables.length === 0) {
    return [];
  }

  const pauseDuration = stats.pauseDuration || 0;
  const includePauseSegment = shouldIncludePauseSegment(
    options.treatPausesAsSeparateState,
    pauseDuration,
  );
  const pieDenominator = resolvePieDenominator(stats, includePauseSegment);

  const data = stats.observables
    .filter((obs) => {
      const hasDuration = obs.onDuration > 0;
      const hasCount = obs.onCount > 0;
      return hasDuration || hasCount;
    })
    .map((obs) => {
      const value = pieDenominator > 0 ? (obs.onDuration / pieDenominator) * 100 : 0;
      return {
        label: obs.observableName,
        value,
        durationLabel: options.formatDuration(obs.onDuration || 0),
      };
    });

  if (includePauseSegment && pieDenominator > 0) {
    data.push({
      label: options.pauseSegmentLabel,
      value: (pauseDuration / pieDenominator) * 100,
      durationLabel: options.formatDuration(pauseDuration),
    });
  }

  if (pieDenominator > 0) {
    const unaccountedDuration = calculateUnaccountedPieDuration(
      stats,
      options.treatPausesAsSeparateState,
    );
    if (unaccountedDuration > 0) {
      data.push({
        label: options.unaccountedSegmentLabel,
        value: (unaccountedDuration / pieDenominator) * 100,
        durationLabel: options.formatDuration(unaccountedDuration),
      });
    }
  }

  return data;
}

export function buildCategoryPieChartColors(
  treatPausesAsSeparateState: boolean,
  pauseDuration: number,
  baseColors: string[] = CATEGORY_PIE_CHART_BASE_COLORS,
  hasUnaccountedSegment = false,
): string[] {
  const colors = shouldIncludePauseSegment(treatPausesAsSeparateState, pauseDuration)
    ? [...baseColors, CATEGORY_PIE_CHART_PAUSE_COLOR]
    : [...baseColors];

  if (hasUnaccountedSegment) {
    colors.push(CATEGORY_PIE_CHART_UNACCOUNTED_COLOR);
  }

  return colors;
}
