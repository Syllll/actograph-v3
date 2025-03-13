import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserService } from '@users/services/user.service';
export declare class UserRolesGuard implements CanActivate {
    private readonly reflector;
    private readonly userService;
    constructor(reflector: Reflector, userService: UserService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private matchRoles;
}
