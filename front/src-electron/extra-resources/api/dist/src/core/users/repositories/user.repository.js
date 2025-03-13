"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const common_1 = require("@nestjs/common");
const user_entity_1 = require("../entities/user.entity");
const base_repositories_1 = require("../../../utils/repositories/base.repositories");
const typeorm_ex_decorator_1 = require("../../../database/typeorm-ex.decorator");
let UserRepository = class UserRepository extends base_repositories_1.BaseRepository {
    async findCurrentUserFromJwtUsername(username) {
        const includes = ['userJwt'];
        const whereObject = { conditions: [] };
        whereObject.conditions.push({
            key: 'userJwt.username',
            value: username,
            operator: base_repositories_1.OperatorEnum.EQUAL,
            type: base_repositories_1.TypeEnum.AND,
        });
        const response = await this.findAndFilter(whereObject, includes, 99999999, 0, 'id', 'DESC');
        if (response.count === 0)
            throw new common_1.NotFoundException('No user with this username');
        const output = response.results[0];
        return output;
    }
    async findCurrentUserFromJwtId(id) {
        const includes = ['userJwt'];
        const whereObject = { conditions: [] };
        whereObject.conditions.push({
            key: 'userJwt.id',
            value: id,
            operator: base_repositories_1.OperatorEnum.EQUAL,
            type: base_repositories_1.TypeEnum.AND,
        });
        const response = await this.findAndFilter(whereObject, includes, 99999999, 0, 'id', 'DESC');
        if (response.count === 0)
            throw new common_1.NotFoundException('No user with this username');
        const output = response.results[0];
        return output;
    }
};
UserRepository = __decorate([
    (0, typeorm_ex_decorator_1.CustomRepository)(user_entity_1.User)
], UserRepository);
exports.UserRepository = UserRepository;
//# sourceMappingURL=user.repository.js.map