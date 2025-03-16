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
exports.SecurityService = void 0;
const common_1 = require('@nestjs/common');
const key_testor_1 = require('./key-testor');
const os = require('os');
const mode_1 = require('../../../../config/mode');
const axios_1 = require('axios');
let SecurityService = class SecurityService {
  constructor() {
    this._keyTestor = new key_testor_1.KeyTestor();
  }
  getLocalUsername() {
    const mode = (0, mode_1.getMode)();
    if (mode !== 'electron') {
      throw new common_1.InternalServerErrorException(
        'Local user is only available in electron mode'
      );
    }
    const user = os.userInfo();
    const localUsername = `_pc-${user.username}`;
    return localUsername;
  }
  async activateLicense(key) {
    var _a;
    await this.checkKeyChecksum(key);
    await this.checkKey(key);
    const response = await axios_1.default.post(
      `${process.env.ACTOGRAPH_API}/license`,
      {
        key: key,
        password: process.env.ACTOGRAPH_API_PASSWORD,
      }
    );
    const responseData = response.data;
    if (responseData.message) {
      throw new common_1.BadRequestException(
        (_a = responseData.message) !== null && _a !== void 0
          ? _a
          : 'Unknown error when checking licence, code: sec.ser.46'
      );
    }
    return true;
  }
  async checkKeyChecksum(key) {
    const check = this._keyTestor.checkKeyChecksum(key);
    if (!check) {
      throw new common_1.BadRequestException('Invalid key checksum');
    }
    return true;
  }
  async checkKey(key) {
    const check = this._keyTestor.checkKey(key);
    if (!check) {
      throw new common_1.BadRequestException('Invalid key');
    }
    return true;
  }
};
SecurityService = __decorate(
  [(0, common_1.Injectable)(), __metadata('design:paramtypes', [])],
  SecurityService
);
exports.SecurityService = SecurityService;
//# sourceMappingURL=security.service.js.map
