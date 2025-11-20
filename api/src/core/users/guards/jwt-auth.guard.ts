import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Guard pour l'authentification JWT des utilisateurs.
 * Utilise la stratégie 'jwt-user' pour valider les tokens JWT dans les en-têtes Authorization.
 * Ce guard doit être utilisé en combinaison avec UserRolesGuard pour contrôler l'accès aux routes.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt-user') {}
