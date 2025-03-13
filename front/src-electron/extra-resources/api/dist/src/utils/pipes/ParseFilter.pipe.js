"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseFilterPipe = void 0;
const common_1 = require("@nestjs/common");
class ParseFilterPipe {
    constructor() { }
    parseAndValidate(value, metadata) {
        var _a;
        if (typeof value !== 'string')
            throw new common_1.BadRequestException(`${(_a = metadata.data) !== null && _a !== void 0 ? _a : '-'}: Given item must be a string.`);
        return value;
    }
    transform(value, metadata) {
        if (value === undefined)
            return;
        const parsedValue = [...this.parseAndValidate(value, metadata)];
        if (parsedValue.length > 0) {
            if (parsedValue[0] === '*')
                parsedValue[0] = '%';
            const lastIndex = parsedValue.length - 1;
            if (parsedValue[lastIndex] === '*')
                parsedValue[lastIndex] = '%';
        }
        return parsedValue.join('');
    }
}
exports.ParseFilterPipe = ParseFilterPipe;
//# sourceMappingURL=ParseFilter.pipe.js.map