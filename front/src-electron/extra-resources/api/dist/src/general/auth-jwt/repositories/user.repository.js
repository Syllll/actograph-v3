"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserJwtRepository = void 0;
const base_repositories_1 = require("../../../utils/repositories/base.repositories");
const userJwt_entity_1 = require("../entities/userJwt.entity");
const typeorm_ex_decorator_1 = require("../../../database/typeorm-ex.decorator");
let UserJwtRepository = class UserJwtRepository extends base_repositories_1.BaseRepository {
};
UserJwtRepository = __decorate([
    (0, typeorm_ex_decorator_1.CustomRepository)(userJwt_entity_1.UserJwt)
], UserJwtRepository);
exports.UserJwtRepository = UserJwtRepository;
//# sourceMappingURL=user.repository.js.map