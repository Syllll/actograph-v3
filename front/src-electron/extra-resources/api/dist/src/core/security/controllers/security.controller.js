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
exports.SecurityController = void 0;
const common_1 = require('@nestjs/common');
const jwt_auth_guard_1 = require('../../users/guards/jwt-auth.guard');
const user_role_enum_1 = require('../../users/utils/user-role.enum');
const roles_decorator_1 = require('../../users/utils/roles.decorator');
const base_controller_1 = require('../../../utils/controllers/base.controller');
const user_service_1 = require('../../users/services/user.service');
const mode_1 = require('../../../../config/mode');
const security_service_1 = require('../services/security.service');
let SecurityController = class SecurityController extends base_controller_1.BaseController {
  constructor(userService, securityService) {
    super();
    this.userService = userService;
    this.securityService = securityService;
  }
  async sayHi() {
    return 'hi';
  }
  async activateLicense(body) {
    return this.securityService.activateLicense(body.key);
  }
  async localUserName(req) {
    const mode = (0, mode_1.getMode)();
    if (mode !== 'electron') {
      throw new common_1.InternalServerErrorException(
        'Local user is only available in electron mode'
      );
    }
    const result = this.securityService.getLocalUsername();
    return result;
  }
};
__decorate(
  [
    (0, common_1.Get)('say-hi'),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', Promise),
  ],
  SecurityController.prototype,
  'sayHi',
  null
);
__decorate(
  [
    (0, common_1.Post)('activate-license'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.User),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  SecurityController.prototype,
  'activateLicense',
  null
);
__decorate(
  [
    (0, common_1.Get)('local-user-name'),
    __param(0, (0, common_1.Req)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object]),
    __metadata('design:returntype', Promise),
  ],
  SecurityController.prototype,
  'localUserName',
  null
);
SecurityController = __decorate(
  [
    (0, common_1.Controller)('security'),
    __param(
      0,
      (0, common_1.Inject)(
        (0, common_1.forwardRef)(() => user_service_1.UserService)
      )
    ),
    __metadata('design:paramtypes', [
      user_service_1.UserService,
      security_service_1.SecurityService,
    ]),
  ],
  SecurityController
);
exports.SecurityController = SecurityController;
//# sourceMappingURL=security.controller.js.map
