import { IsNotEmpty, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CloneProtocolDto {
  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  sourceObservationId!: number;

  @IsNotEmpty()
  @IsNumber()
  @Type(() => Number)
  targetObservationId!: number;
}
