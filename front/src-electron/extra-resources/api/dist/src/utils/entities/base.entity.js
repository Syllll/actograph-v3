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
exports.BaseEntity = void 0;
const groups_1 = require('../../core/users/serializationGroups/groups');
const class_transformer_1 = require('class-transformer');
const typeorm_1 = require('typeorm');
class BaseEntity {}
__decorate(
  [(0, typeorm_1.PrimaryGeneratedColumn)(), __metadata('design:type', Number)],
  BaseEntity.prototype,
  'id',
  void 0
);
__decorate(
  [(0, typeorm_1.CreateDateColumn)(), __metadata('design:type', Date)],
  BaseEntity.prototype,
  'createdAt',
  void 0
);
__decorate(
  [(0, typeorm_1.UpdateDateColumn)(), __metadata('design:type', Date)],
  BaseEntity.prototype,
  'updatedAt',
  void 0
);
__decorate(
  [
    (0, class_transformer_1.Expose)({ groups: [groups_1.GROUP_ADMIN] }),
    (0, typeorm_1.DeleteDateColumn)({ nullable: true, default: null }),
    __metadata('design:type', Date),
  ],
  BaseEntity.prototype,
  'deletedAt',
  void 0
);
exports.BaseEntity = BaseEntity;
//# sourceMappingURL=base.entity.js.map
