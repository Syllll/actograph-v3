import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { PageStatusEnum } from '../../entities/page.entity';
import { IsNull } from 'typeorm';

class ObjectWithIdDto {
  @IsNotEmpty()
  @IsNumber()
  id!: number;
}
export class AdminPageUpdateDto {
  @IsNotEmpty()
  @IsNumber()
  id!: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PageStatusEnum)
  status?: PageStatusEnum;

  @IsOptional()
  @Type(() => ObjectWithIdDto || null)
  @ValidateNested()
  layout?: ObjectWithIdDto | null;
}