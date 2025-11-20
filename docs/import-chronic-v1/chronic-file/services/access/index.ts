import { UnauthorizedException } from '@nestjs/common';
import { UserEntity } from '@users/entities/user.entity';
import { UserRoleEnum } from '@users/utils/user-role.enum';

/**
 * Implements the rules restricting the chronic file operations.S
 */
export class Access {
  /* public canImport(user: UserEntity): void {
    const roles = user.roles;
    if (!roles.includes(UserRoleEnum.Admin) && !user.roles.includes(UserRoleEnum.User)) {
      throw new UnauthorizedException('Cannot access import');
    }
  } */
}
