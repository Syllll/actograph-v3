import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRoleEnum } from '../utils/user-role.enum';
import { User } from '../entities/user.entity';
import { UserJwt } from '@auth-jwt/entities/user-jwt.entity';
import { UserService } from '@users/services/user.service';

/**
 * Guard pour vérifier les rôles des utilisateurs.
 * Vérifie si l'utilisateur authentifié a les rôles requis pour accéder à une route.
 * Les rôles requis sont définis via le décorateur @Roles() sur les méthodes de contrôleur.
 *
 * Règles de vérification :
 * - Si aucun rôle n'est spécifié, l'accès est public (tout le monde peut accéder)
 * - Les administrateurs ont toujours accès à toutes les routes
 * - Un utilisateur doit avoir au moins un des rôles autorisés
 */
@Injectable()
export class UserRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

  /**
   * Vérifie si l'utilisateur peut accéder à la route en fonction de ses rôles.
   *
   * @param context - Le contexte d'exécution de la requête
   * @returns true si l'utilisateur a les permissions nécessaires, false sinon
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const authorizedRoles = this.reflector.get<string[]>('roles', handler);
    // If not roles, everyone can access (= public)
    if (!authorizedRoles) return true;
    const request = context.switchToHttp().getRequest();

    // Request.user is the user, so we can directly access its roles
    const roles = request.user.roles;

    return this.matchRoles(authorizedRoles, roles);
  }

  /**
   * Compare les rôles autorisés avec les rôles de l'utilisateur.
   *
   * @param authorizedRoles - Les rôles autorisés pour la route
   * @param userRoles - Les rôles de l'utilisateur authentifié
   * @returns true si l'utilisateur a les permissions nécessaires :
   *   - Les administrateurs ont toujours accès
   *   - L'utilisateur doit avoir au moins un des rôles autorisés
   */
  private matchRoles(
    authorizedRoles: string[],
    userRoles: string[] | undefined,
  ): boolean {
    if (!userRoles || userRoles.length === 0) return false;
    // Les administrateurs ont toujours accès
    if (userRoles.includes(UserRoleEnum.Admin)) return true;
    // L'utilisateur doit avoir au moins un des rôles autorisés
    return authorizedRoles.some((authorizedRole) =>
      userRoles.includes(authorizedRole),
    );
  }
}
