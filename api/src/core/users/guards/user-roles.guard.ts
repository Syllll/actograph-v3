import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { UserRoleEnum } from '../utils/user-role.enum';
import { User } from '../entities/user.entity';
import { UserJwt } from '@auth-jwt/entities/userJwt.entity';
import { UserService } from '@users/services/user.service';

@Injectable()
export class UserRolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly userService: UserService,
  ) {}

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

  private matchRoles(
    authorizedRoles: string[],
    userRoles: string[] | undefined,
  ): boolean {
    if (!userRoles || userRoles.length === 0) return false;
    if (userRoles.includes(UserRoleEnum.Admin)) return true;
    return authorizedRoles.some((authorizedRole) =>
      userRoles.includes(authorizedRole),
    );
  }
}
