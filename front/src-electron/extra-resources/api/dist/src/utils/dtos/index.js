"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaginationWithSearchDto = exports.PaginationDto = exports.PaginationQueries = void 0;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const pipes_1 = require("../pipes");
exports.PaginationQueries = (0, common_1.createParamDecorator)(async (data, ctx) => {
    const parseIntOrUndefinedPipe = new pipes_1.ParseIntOrUndefinedPipe();
    const parseStringOrUndefinedPipe = new pipes_1.ParseStringOrUndefinedPipe();
    const parseFilterPipe = new pipes_1.ParseFilterPipe();
    const limit = parseIntOrUndefinedPipe.transform('limit', {
        type: 'query',
        metatype: Number,
        data: 'limit',
    });
    const offset = parseIntOrUndefinedPipe.transform('offset', {
        type: 'query',
        metatype: Number,
        data: 'offset',
    });
    const orderBy = parseStringOrUndefinedPipe.transform('orderBy', {
        type: 'query',
        metatype: String,
        data: 'orderBy',
    });
    const order = parseStringOrUndefinedPipe.transform('order', {
        type: 'query',
        metatype: String,
        data: 'order',
        choices: ['ASC', 'DESC'],
    });
    const q = parseFilterPipe.transform('q', {
        type: 'query',
        metatype: String,
        data: 'q',
    });
    return {
        limit: limit || 10,
        offset: offset || 0,
        orderBy: orderBy || 'id',
        order: order || 'DESC',
        q,
    };
});
class PaginationDto {
    constructor() {
        this.limit = 100;
        this.offset = 0;
        this.orderBy = 'id';
        this.order = 'DESC';
        this.includes = [];
    }
}
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => Number(value), { toClassOnly: true }),
    __metadata("design:type", Number)
], PaginationDto.prototype, "limit", void 0);
__decorate([
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => Number(value), { toClassOnly: true }),
    __metadata("design:type", Number)
], PaginationDto.prototype, "offset", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaginationDto.prototype, "orderBy", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => o.order === 'ASC' || o.order === 'DESC'),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", Object)
], PaginationDto.prototype, "order", void 0);
__decorate([
    (0, class_validator_1.ValidateIf)((o) => {
        const includes = o.includes;
        if (typeof includes === 'string') {
            return true;
        }
        else {
            return false;
        }
    }),
    (0, class_validator_1.IsOptional)(),
    (0, class_transformer_1.Transform)(({ value }) => {
        if (!value || value.length === 0) {
            return [];
        }
        return value.split(',');
    }, { toClassOnly: true }),
    __metadata("design:type", Array)
], PaginationDto.prototype, "includes", void 0);
exports.PaginationDto = PaginationDto;
class PaginationWithSearchDto extends PaginationDto {
    constructor() {
        super(...arguments);
        this.q = '*';
    }
}
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], PaginationWithSearchDto.prototype, "q", void 0);
exports.PaginationWithSearchDto = PaginationWithSearchDto;
//# sourceMappingURL=index.js.map