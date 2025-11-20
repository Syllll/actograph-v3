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

/**
 * DTO pour la création d'un utilisateur par un administrateur.
 * Similaire à UserCreateDto mais utilisé spécifiquement pour les endpoints d'administration.
 */
export class UserCreateForAdminDto {
  /** Prénom de l'utilisateur (optionnel) */
  @IsOptional()
  @IsString()
  firstname?: string;

  /** Nom de famille de l'utilisateur (optionnel) */
  @IsOptional()
  @IsString()
  lastname?: string;

  /** Liste des rôles de l'utilisateur (requis, au moins un rôle) */
  @IsNotEmpty()
  @IsEnum(UserRoleEnum, { each: true })
  roles!: UserRoleEnum[];

  /** Informations JWT de l'utilisateur (optionnel) */
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => UserJwtCreateDto)
  userJwt?: UserJwtCreateDto;
}
