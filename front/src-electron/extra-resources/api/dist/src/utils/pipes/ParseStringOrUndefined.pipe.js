"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseStringOrUndefinedPipe = void 0;
const common_1 = require("@nestjs/common");
class ParseStringOrUndefinedPipe {
    parseAndValidate(value, metadata) {
        var _a, _b;
        if (value === undefined)
            return value;
        if (typeof value !== 'string') {
            throw new common_1.BadRequestException(`${(_a = metadata.data) !== null && _a !== void 0 ? _a : '-'}: Given item must be a string.`);
        }
        if (metadata.choices && !metadata.choices.includes(value)) {
            throw new common_1.BadRequestException(`${(_b = metadata.data) !== null && _b !== void 0 ? _b : '-'}: Given item is not allowed.`);
        }
        return value;
    }
    transform(value, metadata) {
        const parsedValue = this.parseAndValidate(value, metadata);
        return parsedValue;
    }
}
exports.ParseStringOrUndefinedPipe = ParseStringOrUndefinedPipe;
//# sourceMappingURL=ParseStringOrUndefined.pipe.js.map