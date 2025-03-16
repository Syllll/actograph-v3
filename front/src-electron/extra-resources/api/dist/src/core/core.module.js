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
exports.CoreModule = void 0;
const common_1 = require('@nestjs/common');
const users_module_1 = require('./users/users.module');
const cron_tasks_module_1 = require('./cron-tasks/cron-tasks.module');
const typeorm_ex_module_1 = require('../database/typeorm-ex.module');
const index_module_1 = require('./security/index.module');
let CoreModule = class CoreModule {};
CoreModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [
        typeorm_ex_module_1.TypeOrmExModule.forCustomRepository([]),
        users_module_1.UsersModule,
        index_module_1.SecurityModule,
        cron_tasks_module_1.CronTasksModule,
      ],
      controllers: [],
      providers: [],
    }),
  ],
  CoreModule
);
exports.CoreModule = CoreModule;
//# sourceMappingURL=core.module.js.map
