import { Expose } from 'class-transformer';

export class GeneralStatisticsDto {
  @Expose()
  totalDuration!: number; // Duration in milliseconds

  @Expose()
  totalReadings!: number;

  @Expose()
  pauseCount!: number;

  @Expose()
  pauseDuration!: number; // Total pause duration in milliseconds

  @Expose()
  observationDuration!: number; // Duration minus pauses in milliseconds

  @Expose()
  categories!: CategoryStatisticsSummaryDto[];
}

export class CategoryStatisticsSummaryDto {
  @Expose()
  categoryId!: string;

  @Expose()
  categoryName!: string;

  @Expose()
  activeObservablesCount!: number;

  @Expose()
  totalDuration!: number; // Total duration of "on" state for all observables in this category
}

