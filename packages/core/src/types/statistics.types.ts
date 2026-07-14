import { ConditionOperatorEnum, ObservableStateEnum } from '../enums';

/**
 * Time period interface
 */
export interface IPeriod {
  start: Date;
  end: Date;
}

/**
 * Observable statistics
 */
export interface IObservableStatistics {
  observableId: string;
  observableName: string;
  onDuration: number; // Duration in milliseconds when observable was "on"
  onPercentage: number; // Percentage of total observation duration (0-100)
  onCount: number; // Number of times the observable was turned "on"
}

/**
 * Category statistics summary (for general statistics)
 */
export interface ICategoryStatisticsSummary {
  categoryId: string;
  categoryName: string;
  activeObservablesCount: number;
  totalDuration: number; // Total duration of "on" state for all observables in this category
}

/**
 * Category statistics (detailed)
 */
export interface ICategoryStatistics {
  categoryId: string;
  categoryName: string;
  observables: IObservableStatistics[];
  pauseDuration?: number; // Total pause duration in milliseconds for this observation
  totalCategoryDuration?: number; // Total duration of all observables in this category (milliseconds)
  // The window used as the percentage basis (milliseconds): for
  // calculateCategoryStatistics, the observation span (first START to last
  // STOP), pause-excluded unless the caller passes includePauses=true; for
  // calculateCategoryStatisticsForPeriods (conditional statistics), the total
  // duration of the filtered periods instead. Optional for backward
  // compatibility with producers that don't set it, in which case consumers
  // fall back to totalCategoryDuration (sum of observable on-durations).
  observationDuration?: number;
  // Full filtered wall-clock window for conditional statistics (milliseconds).
  // observationDuration is stored ex-pause; windowDuration is the OFF-mode
  // pie-chart denominator.
  windowDuration?: number;
}

/**
 * General statistics
 */
export interface IGeneralStatistics {
  totalDuration: number; // Duration in milliseconds
  totalReadings: number;
  pauseCount: number;
  pauseDuration: number; // Total pause duration in milliseconds
  observationDuration: number; // Duration minus pauses in milliseconds
  categories: ICategoryStatisticsSummary[];
}

/**
 * Observable condition for conditional statistics
 */
export interface IObservableCondition {
  observableName: string;
  state: ObservableStateEnum;
}

/**
 * Time range condition
 */
export interface ITimeRangeCondition {
  startTime?: Date;
  endTime?: Date;
}

/**
 * Condition group
 */
export interface IConditionGroup {
  observables: IObservableCondition[];
  timeRange?: ITimeRangeCondition;
  operator: ConditionOperatorEnum; // Operator to combine observables within this group
}

/**
 * Conditional statistics request
 */
export interface IConditionalStatisticsRequest {
  conditionGroups: IConditionGroup[];
  groupOperator: ConditionOperatorEnum; // Operator to combine groups (AND/OR)
  targetCategoryId: string; // Category to analyze under the conditions
}

/**
 * Conditional statistics result
 */
export interface IConditionalStatistics {
  conditions: IConditionGroup[];
  targetCategory: ICategoryStatistics;
  filteredDuration: number; // Total duration matching the conditions
}

