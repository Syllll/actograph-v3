/**
 * Énumération des rôles utilisateurs disponibles dans l'application.
 * Les rôles déterminent les permissions et l'accès aux différentes fonctionnalités.
 */
export enum UserRoleEnum {
  /** Rôle administrateur : accès complet à toutes les fonctionnalités */
  Admin = 'admin',
  /** Rôle utilisateur standard : accès aux fonctionnalités de base */
  User = 'user',
}

/**
 * Liste de tous les rôles principaux utilisateurs.
 * Utilisée pour les vérifications de permissions dans les guards.
 */
export const allMainUsers = [UserRoleEnum.User, UserRoleEnum.Admin];
