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
exports.SecurityModule = void 0;
const common_1 = require('@nestjs/common');
const users_module_1 = require('../users/users.module');
const security_controller_1 = require('./controllers/security.controller');
const security_service_1 = require('./services/security.service');
let SecurityModule = class SecurityModule {};
SecurityModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [(0, common_1.forwardRef)(() => users_module_1.UsersModule)],
      controllers: [security_controller_1.SecurityController],
      providers: [security_service_1.SecurityService],
      exports: [security_service_1.SecurityService],
    }),
  ],
  SecurityModule
);
exports.SecurityModule = SecurityModule;
//# sourceMappingURL=index.module.js.map
