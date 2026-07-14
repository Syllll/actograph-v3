import {
  ICategoryStatistics,
  IConditionalStatistics,
  IConditionalStatisticsRequest,
} from '@services/observations/statistics.interface';

export interface IConditionalStatisticsCoreResult {
  categoryStatistics: ICategoryStatistics;
  filteredPeriods: Array<{ start: Date; end: Date }>;
}

export function mapConditionalStatisticsResult(
  request: IConditionalStatisticsRequest,
  result: IConditionalStatisticsCoreResult,
): IConditionalStatistics {
  const filteredDuration = result.filteredPeriods.reduce(
    (sum, period) => sum + (period.end.getTime() - period.start.getTime()),
    0,
  );

  return {
    conditions: request.conditionGroups,
    targetCategory: result.categoryStatistics,
    filteredDuration,
  };
}

export function shouldUseLocalConditionalStatistics(
  treatPausesAsSeparateState: boolean,
): boolean {
  return !treatPausesAsSeparateState;
}
