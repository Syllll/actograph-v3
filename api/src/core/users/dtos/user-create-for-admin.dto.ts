import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { UserJwtCreateDto } from '@auth-jwt/entities/userJwt.entity';

import { UserRoleEnum } from '../utils/user-role.enum';

export class UserCreateForAdminDto {
  @IsOptional()
  @IsString()
  firstname?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsNotEmpty()
  @IsEnum(UserRoleEnum, { each: true })
  roles!: UserRoleEnum[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserJwtCreateDto)
  userJwt?: UserJwtCreateDto;
}
