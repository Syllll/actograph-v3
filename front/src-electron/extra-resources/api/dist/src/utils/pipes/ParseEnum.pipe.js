"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseEnumPipe = void 0;
const Validator = require("class-validator");
const common_1 = require("@nestjs/common");
class ParseEnumPipe {
    constructor(options) {
        this.type = options;
    }
    isInEnum(val, enumObj) {
        const enumKeys = Object.keys(enumObj);
        const result = enumKeys.find((key) => enumObj[key] === val);
        if (result)
            return true;
        else
            return false;
    }
    parseAndValidate(value) {
        if (!value) {
            throw new common_1.BadRequestException('Given item is undefined.');
        }
        switch (this.type) {
            case Number: {
                const parsedValue = +value;
                if (!Validator.isNumber(parsedValue, {
                    allowNaN: false,
                    allowInfinity: false,
                }))
                    throw new common_1.BadRequestException('Given item must be a number.');
                return parsedValue;
            }
            default: {
                const parsedValue = value;
                if (!this.isInEnum(parsedValue, this.type))
                    throw new common_1.BadRequestException('Given item must be in the enum.');
                return parsedValue;
            }
        }
    }
    transform(value) {
        if (value === undefined)
            return;
        return this.parseAndValidate(value);
    }
}
exports.ParseEnumPipe = ParseEnumPipe;
//# sourceMappingURL=ParseEnum.pipe.js.map