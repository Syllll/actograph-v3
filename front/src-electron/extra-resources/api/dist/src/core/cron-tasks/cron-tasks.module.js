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
exports.CronTasksModule = void 0;
const common_1 = require('@nestjs/common');
const authJwt_module_1 = require('../../general/auth-jwt/authJwt.module');
const cron_tasks_1 = require('./cron-tasks');
const users_module_1 = require('../users/users.module');
let CronTasksModule = class CronTasksModule {};
CronTasksModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [authJwt_module_1.AuthJwtModule, users_module_1.UsersModule],
      controllers: [],
      providers: [cron_tasks_1.CronTasks],
      exports: [],
    }),
  ],
  CronTasksModule
);
exports.CronTasksModule = CronTasksModule;
//# sourceMappingURL=cron-tasks.module.js.map
