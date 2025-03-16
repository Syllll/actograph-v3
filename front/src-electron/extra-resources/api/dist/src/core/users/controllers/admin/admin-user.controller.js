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
var __param =
  (this && this.__param) ||
  function (paramIndex, decorator) {
    return function (target, key) {
      decorator(target, key, paramIndex);
    };
  };
Object.defineProperty(exports, '__esModule', { value: true });
exports.AdminUserController = void 0;
const common_1 = require('@nestjs/common');
const user_roles_guard_1 = require('../../guards/user-roles.guard');
const user_create_for_admin_dto_1 = require('../../dtos/user-create-for-admin.dto');
const jwt_auth_guard_1 = require('../../guards/jwt-auth.guard');
const base_controller_1 = require('../../../../utils/controllers/base.controller');
const roles_decorator_1 = require('../../utils/roles.decorator');
const user_role_enum_1 = require('../../utils/user-role.enum');
const ParseEnumArray_pipe_1 = require('../../../../utils/pipes/ParseEnumArray.pipe');
const ParseFilter_pipe_1 = require('../../../../utils/pipes/ParseFilter.pipe');
const user_service_1 = require('../../services/user.service');
const userJwt_service_1 = require('../../../../general/auth-jwt/services/userJwt.service');
const admin_user_patch_dto_1 = require('../../dtos/admin/admin-user-patch.dto');
const decorators_1 = require('../../../../utils/decorators');
let AdminUserController = class AdminUserController extends base_controller_1.BaseController {
  constructor(service, userJwtService) {
    super();
    this.service = service;
    this.userJwtService = userJwtService;
  }
  async getAll() {
    const users = await this.service.getAll();
    return this.checkNotFound(users);
  }
  async getWithPagination(
    searchQueryParams,
    relations = [],
    searchString,
    filterRoles = []
  ) {
    const results = await this.service.findAndPaginateWithOptions(
      {
        limit: searchQueryParams.limit,
        offset: searchQueryParams.offset,
        orderBy: searchQueryParams.orderBy,
        order: searchQueryParams.order,
        relations,
      },
      {
        search: searchString,
        roles: filterRoles,
      }
    );
    return results;
  }
  async getOne(id) {
    const user = await this.service.findOne(id);
    return this.checkNotFound(user);
  }
  async resetPassword(id) {
    return await this.service.askForResetPassword(id);
  }
  async create(body) {
    var _a;
    try {
      if (
        (_a = body.userJwt) === null || _a === void 0 ? void 0 : _a.username
      ) {
        const usernameExists = await this.userJwtService.findByUsername(
          body.userJwt.username
        );
        if (usernameExists) {
          throw new common_1.HttpException(
            'Un utilisateur existe déjà avec ce nom, essayez autre chose',
            common_1.HttpStatus.BAD_REQUEST
          );
        }
      }
      return await this.service.create(body);
    } catch (err) {
      console.error(err);
      throw new common_1.HttpException(
        'Creation impossible',
        common_1.HttpStatus.BAD_REQUEST
      );
    }
  }
  async update(body) {
    const userUpdated = await this.service.updateAdmin(body);
    return userUpdated;
  }
  async remove(id) {
    const user = await this.service.delete(id);
    return user;
  }
};
__decorate(
  [
    (0, common_1.Get)(),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      user_roles_guard_1.UserRolesGuard
    ),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.Admin),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  AdminUserController.prototype,
  'getAll',
  null
);
__decorate(
  [
    (0, common_1.Get)('paginate'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      user_roles_guard_1.UserRolesGuard
    ),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.Admin),
    __param(0, (0, decorators_1.SearchQueryParams)()),
    __param(
      1,
      (0, common_1.Query)(
        'includes',
        new ParseEnumArray_pipe_1.ParseEnumArrayPipe({
          type: ['userJwt'],
          separator: ',',
        })
      )
    ),
    __param(
      2,
      (0, common_1.Query)(
        'searchString',
        new common_1.DefaultValuePipe('*'),
        ParseFilter_pipe_1.ParseFilterPipe
      )
    ),
    __param(
      3,
      (0, common_1.Query)(
        'filterRoles',
        new ParseEnumArray_pipe_1.ParseEnumArrayPipe({
          type: ['admin', 'user'],
          separator: ',',
        })
      )
    ),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, Array, String, Array]),
    __metadata('design:returntype', Promise),
  ],
  AdminUserController.prototype,
  'getWithPagination',
  null
);
__decorate(
  [
    (0, common_1.Get)(':id'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      user_roles_guard_1.UserRolesGuard
    ),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.Admin),
    __param(0, (0, common_1.Param)('id')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Number]),
    __metadata('design:returntype', Promise),
  ],
  AdminUserController.prototype,
  'getOne',
  null
);
__decorate(
  [
    (0, common_1.Patch)('resetPassword/:id'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      user_roles_guard_1.UserRolesGuard
    ),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.Admin),
    __param(0, (0, common_1.Param)('id')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Number]),
    __metadata('design:returntype', Promise),
  ],
  AdminUserController.prototype,
  'resetPassword',
  null
);
__decorate(
  [
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      user_roles_guard_1.UserRolesGuard
    ),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.Admin),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      user_create_for_admin_dto_1.UserCreateForAdminDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  AdminUserController.prototype,
  'create',
  null
);
__decorate(
  [
    (0, common_1.Patch)('current'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      user_roles_guard_1.UserRolesGuard
    ),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.Admin),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      admin_user_patch_dto_1.AdminUserUpdateDto,
    ]),
    __metadata('design:returntype', Promise),
  ],
  AdminUserController.prototype,
  'update',
  null
);
__decorate(
  [
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(
      jwt_auth_guard_1.JwtAuthGuard,
      user_roles_guard_1.UserRolesGuard
    ),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.Admin),
    __param(0, (0, common_1.Param)('id')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Number]),
    __metadata('design:returntype', Promise),
  ],
  AdminUserController.prototype,
  'remove',
  null
);
AdminUserController = __decorate(
  [
    (0, common_1.Controller)('users-admin'),
    __metadata('design:paramtypes', [
      user_service_1.UserService,
      userJwt_service_1.UserJwtService,
    ]),
  ],
  AdminUserController
);
exports.AdminUserController = AdminUserController;
//# sourceMappingURL=admin-user.controller.js.map
