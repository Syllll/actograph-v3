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
exports.allRelations = exports.User = void 0;
const typeorm_1 = require('typeorm');
const class_transformer_1 = require('class-transformer');
const base_entity_1 = require('../../../utils/entities/base.entity');
const userJwt_entity_1 = require('../../../general/auth-jwt/entities/userJwt.entity');
const groups_1 = require('../serializationGroups/groups');
const user_role_enum_1 = require('../utils/user-role.enum');
let User = class User extends base_entity_1.BaseEntity {
  constructor(partial) {
    super();
    Object.assign(this, partial);
  }
  generateFullName() {
    this.fullname = `${this.firstname} ${this.lastname}`;
  }
  get isAdmin() {
    return this.roles.includes(user_role_enum_1.UserRoleEnum.Admin);
  }
};
__decorate(
  [
    (0, class_transformer_1.Expose)({
      groups: [groups_1.GROUP_USER, groups_1.GROUP_ADMIN],
    }),
    (0, typeorm_1.Column)('varchar', { length: 200, nullable: true }),
    __metadata('design:type', Object),
  ],
  User.prototype,
  'firstname',
  void 0
);
__decorate(
  [
    (0, class_transformer_1.Expose)({
      groups: [groups_1.GROUP_USER, groups_1.GROUP_ADMIN],
    }),
    (0, typeorm_1.Column)('varchar', { length: 200, nullable: true }),
    __metadata('design:type', Object),
  ],
  User.prototype,
  'lastname',
  void 0
);
__decorate(
  [
    (0, typeorm_1.AfterLoad)(),
    (0, typeorm_1.AfterInsert)(),
    (0, typeorm_1.AfterUpdate)(),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', []),
    __metadata('design:returntype', void 0),
  ],
  User.prototype,
  'generateFullName',
  null
);
__decorate(
  [
    (0, typeorm_1.Column)({ nullable: false, default: false }),
    __metadata('design:type', Boolean),
  ],
  User.prototype,
  'resetPasswordOngoing',
  void 0
);
__decorate(
  [
    (0, typeorm_1.Column)({
      type: 'simple-array',
      enum: user_role_enum_1.UserRoleEnum,
      default: user_role_enum_1.UserRoleEnum.User,
      nullable: false,
    }),
    __metadata('design:type', Array),
  ],
  User.prototype,
  'roles',
  void 0
);
__decorate(
  [
    (0, typeorm_1.Column)({ nullable: false, default: true }),
    __metadata('design:type', Boolean),
  ],
  User.prototype,
  'preferDarkTheme',
  void 0
);
__decorate(
  [
    (0, class_transformer_1.Expose)(),
    __metadata('design:type', Boolean),
    __metadata('design:paramtypes', []),
  ],
  User.prototype,
  'isAdmin',
  null
);
__decorate(
  [
    (0, typeorm_1.OneToOne)(() => userJwt_entity_1.UserJwt, {
      cascade: ['update', 'remove', 'soft-remove'],
      eager: false,
    }),
    (0, typeorm_1.JoinColumn)(),
    __metadata('design:type', userJwt_entity_1.UserJwt),
  ],
  User.prototype,
  'userJwt',
  void 0
);
User = __decorate(
  [(0, typeorm_1.Entity)('users'), __metadata('design:paramtypes', [Object])],
  User
);
exports.User = User;
exports.allRelations = [];
//# sourceMappingURL=user.entity.js.map
