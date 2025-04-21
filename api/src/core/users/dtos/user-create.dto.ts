import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

import { UserJwtCreateDto } from '@auth-jwt/entities/user-jwt.entity';

import { UserRoleEnum } from '../utils/user-role.enum';

export class UserCreateDto {
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
