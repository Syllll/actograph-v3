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
exports.UserJwt = exports.UserJwtCreateDto = void 0;
const typeorm_1 = require('typeorm');
const class_validator_1 = require('class-validator');
const base_entity_1 = require('../../../utils/entities/base.entity');
class UserJwtCreateDto {}
__decorate(
  [(0, class_validator_1.IsNotEmpty)(), __metadata('design:type', String)],
  UserJwtCreateDto.prototype,
  'username',
  void 0
);
__decorate(
  [(0, class_validator_1.IsNotEmpty)(), __metadata('design:type', String)],
  UserJwtCreateDto.prototype,
  'password',
  void 0
);
__decorate(
  [
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsBoolean)(),
    __metadata('design:type', Boolean),
  ],
  UserJwtCreateDto.prototype,
  'activated',
  void 0
);
exports.UserJwtCreateDto = UserJwtCreateDto;
let UserJwt = class UserJwt extends base_entity_1.BaseEntity {
  constructor() {
    super(...arguments);
    this.activated = false;
  }
};
__decorate(
  [
    (0, typeorm_1.Column)('varchar', { nullable: false, length: 255 }),
    (0, typeorm_1.Index)({ unique: true }),
    __metadata('design:type', String),
  ],
  UserJwt.prototype,
  'username',
  void 0
);
__decorate(
  [
    (0, typeorm_1.Column)('varchar', {
      name: 'password',
      nullable: false,
      length: 255,
      select: false,
    }),
    __metadata('design:type', String),
  ],
  UserJwt.prototype,
  'password',
  void 0
);
__decorate(
  [
    (0, typeorm_1.Column)('boolean', { name: 'activated', default: false }),
    __metadata('design:type', Object),
  ],
  UserJwt.prototype,
  'activated',
  void 0
);
__decorate(
  [
    (0, typeorm_1.Column)('varchar', {
      name: 'activationToken',
      nullable: true,
      length: 255,
      select: false,
    }),
    __metadata('design:type', Object),
  ],
  UserJwt.prototype,
  'activationToken',
  void 0
);
__decorate(
  [
    (0, typeorm_1.Column)('varchar', {
      name: 'forgetPasswordToken',
      nullable: true,
      length: 255,
      select: false,
    }),
    __metadata('design:type', Object),
  ],
  UserJwt.prototype,
  'forgetPasswordToken',
  void 0
);
UserJwt = __decorate([(0, typeorm_1.Entity)('user-jwt')], UserJwt);
exports.UserJwt = UserJwt;
//# sourceMappingURL=userJwt.entity.js.map
