'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.BaseController = void 0;
const common_1 = require('@nestjs/common');
class BaseController {
  handleCatchError(e) {
    if (e instanceof common_1.InternalServerErrorException)
      throw new common_1.InternalServerErrorException();
    if (e instanceof common_1.NotFoundException)
      throw new common_1.NotFoundException();
    if (e instanceof common_1.BadRequestException)
      throw new common_1.BadRequestException();
    throw new common_1.HttpException('ERROR', 500);
  }
  checkNotFound(objectToTest, customMessage) {
    if (!objectToTest) throw new common_1.NotFoundException(customMessage);
    return objectToTest;
  }
}
exports.BaseController = BaseController;
//# sourceMappingURL=base.controller.js.map
