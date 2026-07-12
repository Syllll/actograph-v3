import { ICategoryStatistics } from '@services/observations/statistics.interface';
import { resolveTotalCategoryDuration } from './statistics-export.utils';

export interface PieChartSegment {
  label: string;
  value: number;
}

export interface BuildCategoryPieChartDataOptions {
  treatPausesAsSeparateState: boolean;
  pauseSegmentLabel: string;
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

export function shouldIncludePauseSegment(
  treatPausesAsSeparateState: boolean,
  pauseDuration: number,
): boolean {
  return treatPausesAsSeparateState && pauseDuration > 0;
}

export function buildCategoryPieChartData(
  stats: Pick<ICategoryStatistics, 'observables' | 'totalCategoryDuration' | 'pauseDuration'>,
  options: BuildCategoryPieChartDataOptions,
): PieChartSegment[] {
  if (!stats.observables || stats.observables.length === 0) {
    return [];
  }

  const totalCategoryDuration = resolveTotalCategoryDuration(stats);
  const pauseDuration = stats.pauseDuration || 0;
  const includePauseSegment = shouldIncludePauseSegment(
    options.treatPausesAsSeparateState,
    pauseDuration,
  );

  const pieDenominator = includePauseSegment
    ? totalCategoryDuration + pauseDuration
    : totalCategoryDuration;

  const data = stats.observables
    .filter((obs) => {
      const hasDuration = obs.onDuration > 0;
      const hasCount = obs.onCount > 0;
      return hasDuration || hasCount;
    })
    .map((obs) => {
      let value: number;
      if (includePauseSegment && pieDenominator > 0) {
        value = (obs.onDuration / pieDenominator) * 100;
      } else {
        value = Math.max(0, obs.onPercentage || 0);
      }
      return {
        label: obs.observableName,
        value,
      };
    });

  if (includePauseSegment && pieDenominator > 0) {
    data.push({
      label: options.pauseSegmentLabel,
      value: (pauseDuration / pieDenominator) * 100,
    });
  }

  return data.length > 0 ? data : [];
}

export function buildCategoryPieChartColors(
  treatPausesAsSeparateState: boolean,
  pauseDuration: number,
  baseColors: string[] = CATEGORY_PIE_CHART_BASE_COLORS,
): string[] {
  if (shouldIncludePauseSegment(treatPausesAsSeparateState, pauseDuration)) {
    return [...baseColors, CATEGORY_PIE_CHART_PAUSE_COLOR];
  }

  return baseColors;
}
