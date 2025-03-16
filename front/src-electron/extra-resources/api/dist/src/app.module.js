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
exports.AppModule = void 0;
const common_1 = require('@nestjs/common');
const app_controller_1 = require('./app.controller');
const app_service_1 = require('./app.service');
const config_1 = require('@nestjs/config');
const typeorm_1 = require('@nestjs/typeorm');
const typeorm_config_1 = require('../config/typeorm.config');
const event_emitter_1 = require('@nestjs/event-emitter');
const schedule_1 = require('@nestjs/schedule');
const core_module_1 = require('./core/core.module');
const general_module_1 = require('./general/general.module');
const typeorm_2 = require('typeorm');
let AppModule = class AppModule {
  constructor(dataSource) {
    this.dataSource = dataSource;
  }
};
AppModule = __decorate(
  [
    (0, common_1.Module)({
      imports: [
        event_emitter_1.EventEmitterModule.forRoot({
          wildcard: false,
          delimiter: '.',
          newListener: false,
          removeListener: false,
          maxListeners: 10,
          verboseMemoryLeak: false,
          ignoreErrors: false,
        }),
        config_1.ConfigModule.forRoot({ isGlobal: true }),
        typeorm_1.TypeOrmModule.forRoot(typeorm_config_1.typeOrmConfig),
        schedule_1.ScheduleModule.forRoot(),
        general_module_1.GeneralModule,
        core_module_1.CoreModule,
      ],
      controllers: [app_controller_1.AppController],
      providers: [app_service_1.AppService],
    }),
    __metadata('design:paramtypes', [typeorm_2.DataSource]),
  ],
  AppModule
);
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map
