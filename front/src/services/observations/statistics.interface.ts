export interface IGeneralStatistics {
  totalDuration: number; // Duration in milliseconds
  totalReadings: number;
  pauseCount: number;
  pauseDuration: number; // Total pause duration in milliseconds
  observationDuration: number; // Duration minus pauses in milliseconds
  categories: ICategoryStatisticsSummary[];
}

export interface ICategoryStatisticsSummary {
  categoryId: string;
  categoryName: string;
  activeObservablesCount: number;
  totalDuration: number; // Total duration of "on" state for all observables in this category
}

export interface ICategoryStatistics {
  categoryId: string;
  categoryName: string;
  observables: IObservableStatistics[];
  pauseDuration?: number; // Total pause duration in milliseconds for this observation
  totalCategoryDuration?: number; // Total duration of all observables in this category (milliseconds)
}

export interface IObservableStatistics {
  observableId: string;
  observableName: string;
  onDuration: number; // Duration in milliseconds when observable was "on"
  onPercentage: number; // Percentage within the category (0-100)
  onCount: number; // Number of times the observable was turned "on"
}

export enum ConditionOperatorEnum {
  AND = 'and',
  OR = 'or',
}

export enum ObservableStateEnum {
  ON = 'on',
  OFF = 'off',
}

export interface IObservableCondition {
  observableName: string;
  state: ObservableStateEnum;
}

export interface ITimeRangeCondition {
  startTime?: Date;
  endTime?: Date;
}

export interface IConditionGroup {
  observables: IObservableCondition[];
  timeRange?: ITimeRangeCondition;
  operator: ConditionOperatorEnum; // Operator to combine observables within this group
}

export interface IConditionalStatisticsRequest {
  conditionGroups: IConditionGroup[];
  groupOperator: ConditionOperatorEnum; // Operator to combine groups (AND/OR)
  targetCategoryId: string; // Category to analyze under the conditions
}

export interface IConditionalStatistics {
  conditions: IConditionGroup[];
  targetCategory: ICategoryStatistics;
  filteredDuration: number; // Total duration matching the conditions
}

