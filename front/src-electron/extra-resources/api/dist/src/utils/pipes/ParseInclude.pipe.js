"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseIncludePipe = void 0;
const common_1 = require("@nestjs/common");
class ParseIncludePipe {
    constructor(options) {
        this.relations = [];
        this.outputType = 'array';
        this.separator = ',';
        this.relations = options.relations;
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
        const allowEverything = this.relations.length === 1 && this.relations[0] === '*';
        const includeArray = value.split(this.separator);
        if (!allowEverything) {
            for (const include of includeArray) {
                if (!this.relations.includes(include)) {
                    throw new common_1.BadRequestException(`"${include}" is not authorized.`);
                }
            }
        }
        if (this.outputType === 'array')
            return includeArray;
        else
            return value;
    }
}
exports.ParseIncludePipe = ParseIncludePipe;
//# sourceMappingURL=ParseInclude.pipe.js.map