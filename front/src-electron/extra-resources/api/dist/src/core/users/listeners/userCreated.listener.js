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
exports.UserCreatedListener = void 0;
const common_1 = require('@nestjs/common');
const event_emitter_1 = require('@nestjs/event-emitter');
const authJwtUserCreated_event_1 = require('../../../general/auth-jwt/events/authJwtUserCreated.event');
const user_service_1 = require('../services/user.service');
let UserCreatedListener = class UserCreatedListener {
  constructor(service) {
    this.service = service;
  }
  async handleUserCreatedEvent(event) {
    try {
      await this.service.createFromAuthJwt(event);
    } catch (err) {
      throw new common_1.InternalServerErrorException(
        'Create from google error'
      );
    }
  }
};
__decorate(
  [
    (0, event_emitter_1.OnEvent)('authJwt.userCreated', {
      async: true,
      promisify: true,
    }),
    __metadata('design:type', Function),
    __metadata('design:paramtypes', [
      authJwtUserCreated_event_1.authJwtUserCreatedEvent,
    ]),
    __metadata('design:returntype', Promise),
  ],
  UserCreatedListener.prototype,
  'handleUserCreatedEvent',
  null
);
UserCreatedListener = __decorate(
  [
    (0, common_1.Injectable)(),
    __metadata('design:paramtypes', [user_service_1.UserService]),
  ],
  UserCreatedListener
);
exports.UserCreatedListener = UserCreatedListener;
//# sourceMappingURL=userCreated.listener.js.map
