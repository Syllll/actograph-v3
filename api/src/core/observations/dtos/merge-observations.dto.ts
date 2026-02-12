import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, IsOptional } from 'class-validator';

export class MergeObservationsDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  sourceObservationId1!: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  sourceObservationId2!: number;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;
}
