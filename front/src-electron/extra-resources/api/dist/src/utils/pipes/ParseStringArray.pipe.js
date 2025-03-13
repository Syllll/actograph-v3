"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseStringArrayPipe = void 0;
const common_1 = require("@nestjs/common");
class ParseStringArrayPipe {
    constructor(options) {
        this.outputType = 'array';
        this.separator = ',';
        if (options.outputType)
            this.outputType = options.outputType;
        if (options.separator)
            this.separator = options.separator;
    }
    parseAndValidate(value) {
        if (typeof value !== 'string')
            throw new common_1.BadRequestException('Given item must be a string.');
        return value;
    }
    transform(value) {
        if (value === undefined)
            return;
        const stringArray = value.split(this.separator);
        if (this.outputType === 'array')
            return stringArray;
        else
            return value;
    }
}
exports.ParseStringArrayPipe = ParseStringArrayPipe;
//# sourceMappingURL=ParseStringArray.pipe.js.map