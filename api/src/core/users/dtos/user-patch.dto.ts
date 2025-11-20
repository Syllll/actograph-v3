import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

/**
 * DTO pour la mise à jour des informations de l'utilisateur actuel.
 * Utilisé par les utilisateurs pour mettre à jour leur propre profil.
 */
export class UserUpdateCurrentDto {
  /** Prénom de l'utilisateur (optionnel) */
  @IsOptional()
  @IsString()
  firstname?: string;

  /** Nom de famille de l'utilisateur (optionnel) */
  @IsOptional()
  @IsString()
  lastname?: string;

  /** Préférence de thème sombre (optionnel) */
  @IsOptional()
  @IsBoolean()
  preferDarkTheme?: boolean;

  /** Indicateur de réinitialisation de mot de passe en cours (optionnel) */
  @IsOptional()
  @IsBoolean()
  resetPasswordOngoing?: boolean;
}

/**
 * DTO pour la mise à jour d'un utilisateur (avec ID).
 * Étend UserUpdateCurrentDto et ajoute l'ID requis pour identifier l'utilisateur à mettre à jour.
 */
export class UserUpdateDto extends UserUpdateCurrentDto {
  /** ID de l'utilisateur à mettre à jour (requis) */
  @IsNotEmpty()
  @IsNumber()
  id!: number;
}
