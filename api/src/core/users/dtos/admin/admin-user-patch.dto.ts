import { IsEnum, IsOptional } from 'class-validator';

import { UserRoleEnum } from '../../utils/user-role.enum';
import { UserUpdateDto } from '../user-patch.dto';

/**
 * DTO pour la mise à jour d'un utilisateur par un administrateur.
 * Étend UserUpdateDto et ajoute la possibilité de modifier les rôles de l'utilisateur.
 * Seuls les administrateurs peuvent utiliser ce DTO pour modifier les rôles.
 */
export class AdminUserUpdateDto extends UserUpdateDto {
  /** Liste des rôles de l'utilisateur (optionnel, réservé aux administrateurs) */
  @IsOptional()
  @IsEnum(UserRoleEnum, { each: true })
  roles?: UserRoleEnum[];
}
