import { Expose } from 'class-transformer';

export class CategoryStatisticsDto {
  @Expose()
  categoryId!: string;

  @Expose()
  categoryName!: string;

  @Expose()
  observables!: ObservableStatisticsDto[];

  @Expose()
  pauseDuration?: number; // Total pause duration in milliseconds for this observation

  @Expose()
  totalCategoryDuration?: number; // Total duration of all observables in this category (milliseconds)

  @Expose()
  observationDuration?: number; // Full observation window (first START to last STOP) used as the percentage basis (milliseconds)

  @Expose()
  windowDuration?: number; // Full filtered wall-clock window for conditional statistics (milliseconds)
}

export class ObservableStatisticsDto {
  @Expose()
  observableId!: string;

  @Expose()
  observableName!: string;

  @Expose()
  onDuration!: number; // Duration in milliseconds when observable was "on"

  @Expose()
  onPercentage!: number; // Percentage of total observation duration (0-100)

  @Expose()
  onCount!: number; // Number of times the observable was turned "on"
}

