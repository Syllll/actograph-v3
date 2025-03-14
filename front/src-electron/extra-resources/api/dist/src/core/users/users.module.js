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
exports.UsersModule = void 0;
const common_1 = require("@nestjs/common");
const authJwt_module_1 = require("../../general/auth-jwt/authJwt.module");
const mode_1 = require("../../../config/mode");
const user_controller_1 = require("./controllers/user.controller");
const admin_user_controller_1 = require("./controllers/admin/admin-user.controller");
const userCreated_listener_1 = require("./listeners/userCreated.listener");
const user_repository_1 = require("./repositories/user.repository");
const user_service_1 = require("./services/user.service");
const typeorm_ex_module_1 = require("../../database/typeorm-ex.module");
const user_role_enum_1 = require("./utils/user-role.enum");
const jwt_strategy_1 = require("./jwt.strategy");
const index_module_1 = require("../security/index.module");
const security_service_1 = require("../security/services/security.service");
let UsersModule = class UsersModule {
    constructor(securityService, usersService) {
        this.securityService = securityService;
        this.usersService = usersService;
    }
    async onModuleInit() {
        console.info(`Users module initialization...`);
        const adminUsername = process.env.ADMINUSER_LOGIN;
        const password = process.env.ADMINUSER_PASSWORD;
        if (adminUsername && password) {
            const role = user_role_enum_1.UserRoleEnum.Admin;
            const users = await this.usersService.findWithUsername(adminUsername);
            if (users && users.length === 0) {
                console.info('Creating the admin user...');
                await this.usersService.create({
                    roles: [role],
                    userJwt: {
                        username: adminUsername,
                        password,
                        activated: true,
                    },
                });
            }
            else {
                console.info('The admin user already exists. Skip creation step.');
            }
        }
        if ((0, mode_1.getMode)() === 'electron') {
            const localUsername = this.securityService.getLocalUsername();
            const users = await this.usersService.findWithUsername(localUsername);
            if (users && users.length === 0) {
                console.info('Creating the local user...');
                const u = await this.usersService.create({
                    roles: [user_role_enum_1.UserRoleEnum.User],
                    userJwt: {
                        username: localUsername,
                        password: localUsername.split('-')[1],
                        activated: true,
                    },
                });
            }
            else {
                console.info('The local user already exists. Skip creation step.');
            }
        }
        console.info(`Users module initialization done.`);
    }
};
UsersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            authJwt_module_1.AuthJwtModule,
            (0, common_1.forwardRef)(() => index_module_1.SecurityModule),
            typeorm_ex_module_1.TypeOrmExModule.forCustomRepository([user_repository_1.UserRepository]),
        ],
        controllers: [user_controller_1.UserController, admin_user_controller_1.AdminUserController],
        providers: [userCreated_listener_1.UserCreatedListener, user_service_1.UserService, jwt_strategy_1.JwtStrategy],
        exports: [user_service_1.UserService],
    }),
    __param(0, (0, common_1.Inject)((0, common_1.forwardRef)(() => security_service_1.SecurityService))),
    __metadata("design:paramtypes", [security_service_1.SecurityService,
        user_service_1.UserService])
], UsersModule);
exports.UsersModule = UsersModule;
//# sourceMappingURL=users.module.js.map