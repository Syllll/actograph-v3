import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { BackgroundPatternEnum, DisplayModeEnum } from '@actograph/core';

export class UpdateProtocolItemGraphPreferencesDto {
  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(10)
  strokeWidth?: number;

  @IsEnum(BackgroundPatternEnum)
  @IsOptional()
  backgroundPattern?: BackgroundPatternEnum;

  @IsEnum(DisplayModeEnum)
  @IsOptional()
  displayMode?: DisplayModeEnum;

  @IsString()
  @IsOptional()
  supportCategoryId?: string | null;
}
