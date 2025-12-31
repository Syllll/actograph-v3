import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { Expose } from 'class-transformer';
import { CategoryStatisticsDto } from './statistics-category.dto';
import { ConditionOperatorEnum, ObservableStateEnum } from '@actograph/core';

export class ObservableConditionDto {
  @IsString()
  @IsNotEmpty()
  observableName!: string;

  @IsEnum(ObservableStateEnum)
  state!: ObservableStateEnum;
}

export class TimeRangeConditionDto {
  @IsOptional()
  startTime?: Date;

  @IsOptional()
  endTime?: Date;
}

export class ConditionGroupDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ObservableConditionDto)
  observables!: ObservableConditionDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeConditionDto)
  timeRange?: TimeRangeConditionDto;

  @IsEnum(ConditionOperatorEnum)
  operator!: ConditionOperatorEnum; // Operator to combine observables within this group
}

export class ConditionalStatisticsRequestDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConditionGroupDto)
  conditionGroups!: ConditionGroupDto[];

  @IsEnum(ConditionOperatorEnum)
  groupOperator!: ConditionOperatorEnum; // Operator to combine groups (AND/OR)

  @IsString()
  @IsNotEmpty()
  targetCategoryId!: string; // Category to analyze under the conditions
}

export class ConditionalStatisticsDto {
  @Expose()
  conditions!: ConditionGroupDto[];

  @Expose()
  targetCategory!: CategoryStatisticsDto;

  @Expose()
  filteredDuration!: number; // Total duration matching the conditions
}

