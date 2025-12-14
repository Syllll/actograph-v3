import { Expose } from 'class-transformer';

export class MonthlyUsageDto {
  @Expose()
  month!: string; // Format: "YYYY-MM"

  @Expose()
  monthLabel!: string; // Format: "Janvier 2024"

  @Expose()
  shortMonth!: string; // Format: "Jan"

  @Expose()
  year!: number;

  @Expose()
  count!: number; // Nombre de relevés ce mois
}

export class GlobalMonthlyStatisticsDto {
  @Expose()
  monthlyData!: MonthlyUsageDto[];

  @Expose()
  totalReadings!: number;
}

