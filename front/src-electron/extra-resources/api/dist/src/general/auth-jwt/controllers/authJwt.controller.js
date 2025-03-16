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
exports.AuthJwtController = void 0;
const common_1 = require('@nestjs/common');
const typeorm_1 = require('@nestjs/typeorm');
const base_controller_1 = require('../../../utils/controllers/base.controller');
const user_repository_1 = require('../repositories/user.repository');
const userJwt_entity_1 = require('../entities/userJwt.entity');
const userJwt_service_1 = require('../services/userJwt.service');
let AuthJwtController = class AuthJwtController extends base_controller_1.BaseController {
  constructor(userJwtRepository, usersService) {
    super();
    this.userJwtRepository = userJwtRepository;
    this.usersService = usersService;
    this.allowRegisterNewUserFromAuthJwt = true;
  }
  async postLogin(username, password) {
    const user = await this.usersService.findByUsernamePassword(
      username,
      password
    );
    if (!user) throw new common_1.HttpException('Wrong credentials', 403);
    const jwt = this.usersService.login(user);
    return {
      token: jwt,
    };
  }
  async refreshToekn(token) {
    let jwt = null;
    try {
      jwt = this.usersService.createNewTokenFromPreviousOne(token);
    } catch (err) {
      throw new common_1.UnauthorizedException('Token cannot be refreshed');
    }
    return {
      token: jwt,
    };
  }
  logout(request, response) {
    request.logout();
    response.redirect(process.env.FRONTEND_URL);
  }
  async postRegister(user) {
    if (this.allowRegisterNewUserFromAuthJwt) {
      try {
        const result = await this.usersService.create(user);
        return result;
      } catch (err) {
        throw new common_1.HttpException(
          'Creation impossible',
          common_1.HttpStatus.BAD_REQUEST
        );
      }
    } else {
      throw new common_1.HttpException(
        'Creation  not authorized',
        common_1.HttpStatus.UNAUTHORIZED
      );
    }
  }
  async getNewPassword(username, resetPasswordUrl) {
    const response = new userJwt_service_1.SuccessResponse();
    const result = await this.usersService.sendMailForNewPassword(
      username,
      resetPasswordUrl
    );
    if (!result)
      throw new common_1.HttpException(
        'Récupération impossible',
        common_1.HttpStatus.BAD_REQUEST
      );
    response.success = true;
    response.message = JSON.stringify(
      'Mail de récupération de mot de passe envoyé'
    );
    response.errors = [];
    return response;
  }
  async postNewPassword(token, password) {
    const response = new userJwt_service_1.TokenResponse();
    const result = await this.usersService.changePasswordUser(token, password);
    if (!result.user)
      throw new common_1.HttpException(
        'Impossible to change password',
        common_1.HttpStatus.BAD_REQUEST
      );
    response.token = this.usersService.login(result.user);
    return response;
  }
};
__decorate(
  [
    (0, common_1.Post)('login'),
    __param(0, (0, common_1.Body)('username')),
    __param(1, (0, common_1.Body)('password')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, String]),
    __metadata('design:returntype', Promise),
  ],
  AuthJwtController.prototype,
  'postLogin',
  null
);
__decorate(
  [
    (0, common_1.Post)('refreshToken'),
    __param(0, (0, common_1.Body)('token')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String]),
    __metadata('design:returntype', Promise),
  ],
  AuthJwtController.prototype,
  'refreshToekn',
  null
);
__decorate(
  [
    (0, common_1.Get)('logout'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [Object, Object]),
    __metadata('design:returntype', void 0),
  ],
  AuthJwtController.prototype,
  'logout',
  null
);
__decorate(
  [
    (0, common_1.Post)('register'),
    __param(0, (0, common_1.Body)()),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [userJwt_entity_1.UserJwtCreateDto]),
    __metadata('design:returntype', Promise),
  ],
  AuthJwtController.prototype,
  'postRegister',
  null
);
__decorate(
  [
    (0, common_1.Post)('password-forgot'),
    __param(0, (0, common_1.Body)('username')),
    __param(1, (0, common_1.Body)('resetPasswordUrl')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, String]),
    __metadata('design:returntype', Promise),
  ],
  AuthJwtController.prototype,
  'getNewPassword',
  null
);
__decorate(
  [
    (0, common_1.Post)('recuperation'),
    __param(0, (0, common_1.Body)('token')),
    __param(1, (0, common_1.Body)('password')),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [String, String]),
    __metadata('design:returntype', Promise),
  ],
  AuthJwtController.prototype,
  'postNewPassword',
  null
);
AuthJwtController = __decorate(
  [
    (0, common_1.Controller)('auth-jwt'),
    __param(
      0,
      (0, typeorm_1.InjectRepository)(user_repository_1.UserJwtRepository)
    ),
    __metadata('design:paramtypes', [
      user_repository_1.UserJwtRepository,
      userJwt_service_1.UserJwtService,
    ]),
  ],
  AuthJwtController
);
exports.AuthJwtController = AuthJwtController;
//# sourceMappingURL=authJwt.controller.js.map
