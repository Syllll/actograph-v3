import { SetMetadata } from '@nestjs/common';

/**
 * Décorateur pour définir les rôles autorisés à accéder à une route ou méthode.
 * Utilisé en combinaison avec le UserRolesGuard pour contrôler l'accès aux endpoints.
 *
 * @param roles - Liste des rôles autorisés (peut être plusieurs rôles)
 * @returns Décorateur NestJS qui ajoute les métadonnées de rôles
 *
 * @example
 * ```typescript
 * @Get('admin-only')
 * @Roles(UserRoleEnum.Admin)
 * async adminEndpoint() { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
