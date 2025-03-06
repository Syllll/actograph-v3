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
import { User } from '@users/entities/user.entity';
import { Bloc, BlocTypeEnum } from '../../entities/bloc.entity';

export class AdminBlocCreateDto {
  @IsNotEmpty()
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(BlocTypeEnum)
  type?: BlocTypeEnum;

  createdBy?: User;
}