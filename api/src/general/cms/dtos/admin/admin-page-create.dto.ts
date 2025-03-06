import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { PageTypeEnum } from '../../entities/page.entity';
import { User } from '@users/entities/user.entity';
import { Bloc } from '../../entities/bloc.entity';

class ObjectWithIdDto {
  @IsNotEmpty()
  @IsNumber()
  id!: number;
}

export class AdminPageCreateDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(PageTypeEnum)
  type?: PageTypeEnum;

  @IsOptional()
  @Type(() => ObjectWithIdDto)
  @ValidateNested()
  layout?: ObjectWithIdDto;

  createdBy?: User;
}