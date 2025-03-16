'use strict';
var __decorate =
  (this && this.__decorate) ||
  function (decorators, target, key, desc) {
    var c = arguments.length,
      r =
        c < 3
          ? target
          : desc === null
          ? (desc = Object.getOwnPropertyDescriptor(target, key))
          : desc,
      d;
    if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
      r = Reflect.decorate(decorators, target, key, desc);
    else
      for (var i = decorators.length - 1; i >= 0; i--)
        if ((d = decorators[i]))
          r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
  };
var __metadata =
  (this && this.__metadata) ||
  function (k, v) {
    if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
      return Reflect.metadata(k, v);
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.UserRolesGuard = void 0;
const common_1 = require('@nestjs/common');
const core_1 = require('@nestjs/core');
const user_role_enum_1 = require('../utils/user-role.enum');
const user_service_1 = require('../services/user.service');
let UserRolesGuard = class UserRolesGuard {
  constructor(reflector, userService) {
    this.reflector = reflector;
    this.userService = userService;
  }
  async canActivate(context) {
    const handler = context.getHandler();
    const authorizedRoles = this.reflector.get('roles', handler);
    if (!authorizedRoles) return true;
    const request = context.switchToHttp().getRequest();
    const roles = request.user.roles;
    return this.matchRoles(authorizedRoles, roles);
  }
  matchRoles(authorizedRoles, userRoles) {
    if (!userRoles || userRoles.length === 0) return false;
    if (userRoles.includes(user_role_enum_1.UserRoleEnum.Admin)) return true;
    return authorizedRoles.some((authorizedRole) =>
      userRoles.includes(authorizedRole)
    );
  }
};
UserRolesGuard = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [
      core_1.Reflector,
      user_service_1.UserService,
    ]),
  ],
  UserRolesGuard
);
exports.UserRolesGuard = UserRolesGuard;
//# sourceMappingURL=user-roles.guard.js.map
