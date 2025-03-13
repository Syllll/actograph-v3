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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../guards/jwt-auth.guard");
const user_roles_guard_1 = require("../guards/user-roles.guard");
const user_role_enum_1 = require("../utils/user-role.enum");
const base_controller_1 = require("../../../utils/controllers/base.controller");
const user_service_1 = require("../services/user.service");
const roles_decorator_1 = require("../utils/roles.decorator");
const user_patch_dto_1 = require("../dtos/user-patch.dto");
const userJwt_service_1 = require("../../../general/auth-jwt/services/userJwt.service");
let UserController = class UserController extends base_controller_1.BaseController {
    constructor(service, userJwtService) {
        super();
        this.service = service;
        this.userJwtService = userJwtService;
    }
    async getResetPasswordToken(req, username) {
        const user = this.service.findWithUsername(username);
        if (!user) {
            throw new common_1.NotFoundException('User does not exist');
        }
        const resetPasswordToken = await this.service.resetPasswordToken.createResetPasswordToken(username);
        return resetPasswordToken;
    }
    async choosePasswordAfterReset(req, body) {
        const user = req.user;
        return await this.service.chooseNewPasswordAfterReset(user.id, body.password);
    }
    async get(req) {
        const userId = req.user.id;
        const user = await this.service.findOne(userId);
        if (!user) {
            throw new common_1.NotFoundException('User does not exist');
        }
        return user;
    }
    async update(req, body) {
        const userId = req.user.id;
        const user = await this.service.update(Object.assign(Object.assign({}, body), { id: userId }));
        if (!user) {
            throw new common_1.InternalServerErrorException('User could not be updated');
        }
        return user;
    }
};
__decorate([
    (0, common_1.Get)(':username/resetPassword-token'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, user_roles_guard_1.UserRolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.User, ...user_role_enum_1.allMainUsers),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('username', new common_1.DefaultValuePipe(undefined))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "getResetPasswordToken", null);
__decorate([
    (0, common_1.Patch)('choosePasswordAfterReset'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, user_roles_guard_1.UserRolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.User, ...user_role_enum_1.allMainUsers),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "choosePasswordAfterReset", null);
__decorate([
    (0, common_1.Get)('current'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, user_roles_guard_1.UserRolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.User, ...user_role_enum_1.allMainUsers),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "get", null);
__decorate([
    (0, common_1.Patch)('current'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, user_roles_guard_1.UserRolesGuard),
    (0, roles_decorator_1.Roles)(user_role_enum_1.UserRoleEnum.User, ...user_role_enum_1.allMainUsers),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, user_patch_dto_1.UserUpdateCurrentDto]),
    __metadata("design:returntype", Promise)
], UserController.prototype, "update", null);
UserController = __decorate([
    (0, common_1.Controller)('users'),
    __metadata("design:paramtypes", [user_service_1.UserService,
        userJwt_service_1.UserJwtService])
], UserController);
exports.UserController = UserController;
//# sourceMappingURL=user.controller.js.map