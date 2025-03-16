'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
exports.ParseEnumArrayPipe = void 0;
const Validator = require('class-validator');
const common_1 = require('@nestjs/common');
class ParseEnumArrayPipe {
  constructor(options) {
    this.type = options.type;
    this.seperator = options.separator;
  }
  parseAndValidate(value) {
    switch (this.type) {
      case Number: {
        const parsedValue = +value;
        if (
          !Validator.isNumber(parsedValue, {
            allowNaN: false,
            allowInfinity: false,
          })
        )
          throw new common_1.BadRequestException(
            'Given item must be a number.'
          );
        return parsedValue;
      }
      default: {
        const parsedValue = value;
        if (!Validator.isIn(parsedValue, this.type))
          throw new common_1.BadRequestException(
            'Given item must be in the enum.'
          );
        return parsedValue;
      }
    }
  }
  transform(value) {
    if (!value) return [];
    let items;
    try {
      items = value.split(this.seperator);
    } catch (error) {
      throw new common_1.BadRequestException('Given input is not parsable.');
    }
    return items.map((item) => {
      return this.parseAndValidate(item);
    });
  }
}
exports.ParseEnumArrayPipe = ParseEnumArrayPipe;
//# sourceMappingURL=ParseEnumArray.pipe.js.map
