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
exports.UserCreateDto = void 0;
const class_transformer_1 = require('class-transformer');
const class_validator_1 = require('class-validator');
const userJwt_entity_1 = require('../../../general/auth-jwt/entities/userJwt.entity');
const user_role_enum_1 = require('../utils/user-role.enum');
class UserCreateDto {}
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  UserCreateDto.prototype,
  'firstname',
  void 0
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata('design:type', String),
  ],
  UserCreateDto.prototype,
  'lastname',
  void 0
);
__decorate(
  [
    (0, class_validator_1.IsNotEmpty)(),
    (0, class_validator_1.IsEnum)(user_role_enum_1.UserRoleEnum, {
      each: true,
    }),
    __metadata('design:type', Array),
  ],
  UserCreateDto.prototype,
  'roles',
  void 0
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateNested)({ each: true }),
    (0, class_transformer_1.Type)(() => userJwt_entity_1.UserJwtCreateDto),
    __metadata('design:type', userJwt_entity_1.UserJwtCreateDto),
  ],
  UserCreateDto.prototype,
  'userJwt',
  void 0
);
exports.UserCreateDto = UserCreateDto;
//# sourceMappingURL=user-create.dto.js.map
