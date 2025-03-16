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
Object.defineProperty(exports, '__esModule', { value: true });
exports.AuthJwtModule = void 0;
const common_1 = require('@nestjs/common');
const passport_1 = require('@nestjs/passport');
const jwt_1 = require('@nestjs/jwt');
const authJwt_controller_1 = require('./controllers/authJwt.controller');
const userJwt_service_1 = require('./services/userJwt.service');
const user_repository_1 = require('./repositories/user.repository');
const typeorm_ex_module_1 = require('../../database/typeorm-ex.module');
let AuthJwtModule = class AuthJwtModule {};
AuthJwtModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [
        typeorm_ex_module_1.TypeOrmExModule.forCustomRepository([
          user_repository_1.UserJwtRepository,
        ]),
        passport_1.PassportModule,
        jwt_1.JwtModule.register({
          secret: process.env.JWT_SECRET,
        }),
      ],
      controllers: [authJwt_controller_1.AuthJwtController],
      providers: [userJwt_service_1.UserJwtService],
      exports: [userJwt_service_1.UserJwtService],
    }),
  ],
  AuthJwtModule
);
exports.AuthJwtModule = AuthJwtModule;
//# sourceMappingURL=authJwt.module.js.map
