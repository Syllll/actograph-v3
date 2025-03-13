"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseIntOrUndefinedPipe = void 0;
const common_1 = require("@nestjs/common");
class ParseIntOrUndefinedPipe {
    parseAndValidate(value, metadata) {
        var _a;
        if (value === undefined)
            return value;
        const v = parseInt(value, 10);
        if (isNaN(v)) {
            throw new common_1.BadRequestException(`${(_a = metadata.data) !== null && _a !== void 0 ? _a : '-'}: Given item must be a number.`);
        }
        return v;
    }
    transform(value, metadata) {
        const parseDateValue = this.parseAndValidate(value, metadata);
        return parseDateValue;
    }
}
exports.ParseIntOrUndefinedPipe = ParseIntOrUndefinedPipe;
//# sourceMappingURL=ParseIntOrUndefined.pipe.js.map