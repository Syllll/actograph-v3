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
exports.AdminUserUpdateDto = void 0;
const class_validator_1 = require("class-validator");
const user_role_enum_1 = require("../../utils/user-role.enum");
const user_patch_dto_1 = require("../user-patch.dto");
class AdminUserUpdateDto extends user_patch_dto_1.UserUpdateDto {
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsEnum)(user_role_enum_1.UserRoleEnum, { each: true }),
    __metadata("design:type", Array)
], AdminUserUpdateDto.prototype, "roles", void 0);
exports.AdminUserUpdateDto = AdminUserUpdateDto;
//# sourceMappingURL=admin-user-patch.dto.js.map