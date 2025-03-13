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
exports.UserJwtService = exports.SuccessResponse = exports.TokenResponse = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const event_emitter_1 = require("@nestjs/event-emitter");
const jwt_1 = require("@nestjs/jwt");
const uuid_1 = require("uuid");
const bcrypt = require("bcrypt");
const sgMail = require("@sendgrid/mail");
const user_repository_1 = require("../repositories/user.repository");
const authJwtPasswordForgot_event_1 = require("../events/authJwtPasswordForgot.event");
const authJwtUserCreated_event_1 = require("../events/authJwtUserCreated.event");
const authJwtUserActivated_event_1 = require("../events/authJwtUserActivated.event");
class TokenResponse {
}
exports.TokenResponse = TokenResponse;
class SuccessResponse {
}
exports.SuccessResponse = SuccessResponse;
let UserJwtService = class UserJwtService {
    constructor(userJwtRepository, eventEmitter, jwtService) {
        this.userJwtRepository = userJwtRepository;
        this.eventEmitter = eventEmitter;
        this.jwtService = jwtService;
    }
    async create(userCreateDto, emitUserCreateSignal = true) {
        const encryptedPassword = await bcrypt.hash(userCreateDto.password, 10);
        const UserToBeCreated = {
            activationToken: (0, uuid_1.v4)(),
            password: encryptedPassword,
            username: userCreateDto.username,
            activated: true,
        };
        const newUser = this.userJwtRepository.create(UserToBeCreated);
        const savedUser = await this.userJwtRepository.save(newUser);
        if (emitUserCreateSignal) {
            await this.eventEmitter.emitAsync('authJwt.userCreated', new authJwtUserCreated_event_1.authJwtUserCreatedEvent(savedUser));
        }
        return {
            id: savedUser.id,
            username: savedUser.username,
        };
    }
    login(user) {
        const payload = { id: user.id, username: user.username };
        return this.jwtService.sign(payload, {
            expiresIn: '3600s',
        });
    }
    createNewTokenFromPreviousOne(token) {
        let output = null;
        if (this.jwtService.verify(token)) {
            const payload = this.jwtService.decode(token);
            if (payload) {
                const p = payload;
                output = this.jwtService.sign({
                    id: p.id,
                    username: p.username,
                }, {
                    expiresIn: '3600s',
                });
            }
        }
        return output;
    }
    async activate(activationToken) {
        const result = new SuccessResponse();
        result.success = false;
        result.message = 'Activation failure';
        try {
            const user = await this.userJwtRepository.findOne({
                where: {
                    activationToken,
                },
            });
            if (!user) {
                throw new common_1.NotFoundException();
            }
            if (user.activated === true) {
                result.success = true;
                result.message = 'already activated';
                return result;
            }
            user.activated = true;
            this.userJwtRepository.save(user);
            result.success = true;
            await this.eventEmitter.emitAsync('authJwt.userActivated', new authJwtUserActivated_event_1.authJwtUserActivatedEvent(user));
            return result;
        }
        catch (error) {
            result.errors = [`${error.code} - ${error.message}`];
            return result;
        }
    }
    async findByUsername(username) {
        const user = await this.userJwtRepository
            .createQueryBuilder()
            .andWhere('LOWER(username) = LOWER(:username)', { username })
            .andWhere('activated = true')
            .getOne();
        return user;
    }
    async findByUsernamePassword(username, password) {
        const user = await this.userJwtRepository.findOne({
            where: {
                username: username,
            },
            select: ['username', 'id', 'password', 'activated'],
        });
        if ((user === null || user === void 0 ? void 0 : user.password) && (await bcrypt.compare(password, user.password))) {
            const fullUser = await this.userJwtRepository.findOne({
                where: { id: user.id },
            });
            if (fullUser)
                return fullUser;
            throw new common_1.HttpException('User not found', common_1.HttpStatus.NOT_FOUND);
        }
        throw new common_1.BadRequestException();
    }
    async findById(id) {
        const user = await this.userJwtRepository.findOneFromId(id);
        if (!user) {
            throw new common_1.NotFoundException();
        }
        return user;
    }
    async sendMailForNewPassword(email, resetPasswordUrl) {
        const user = await this.userJwtRepository.findOne({
            where: {
                username: email,
            },
            select: ['id', 'username', 'forgetPasswordToken', 'activated'],
        });
        if (!user) {
            throw new common_1.NotFoundException();
        }
        user.forgetPasswordToken = (0, uuid_1.v4)();
        await this.userJwtRepository.save(user);
        await this.eventEmitter.emitAsync('authJwt.passwordForgot', new authJwtPasswordForgot_event_1.authJwtPasswordForgotEvent(user));
        const sgKey = process.env.SENDGRID_API_KEY;
        if (sgKey) {
            const emailFrom = process.env.EMAIL_FROM;
            sgMail.setApiKey(sgKey);
            const msg = {
                to: { email },
                from: { email: emailFrom },
                subject: `${process.env.APP_NAME} - Reset Password`,
                text: 'Click on this link to reset your password : ' + resetPasswordUrl,
                html: '<a href="' +
                    resetPasswordUrl +
                    '">Click here</a> to reset your password.',
            };
            try {
                await sgMail.send(msg);
            }
            catch (error) {
                console.error(error);
                if (error.response) {
                    console.error(error.response.body);
                }
            }
        }
        return user;
    }
    async findByRecuperationToken(token) {
        const user = await this.userJwtRepository.findOneBy({
            forgetPasswordToken: token,
        });
        if (!user) {
            throw new common_1.NotFoundException();
        }
        return user;
    }
    async changePasswordUser(token, password) {
        const userInstance = await this.findByRecuperationToken(token);
        if (!userInstance) {
            throw new common_1.NotFoundException();
        }
        return await this.changePassword(userInstance.id, password);
    }
    async changePassword(userId, password) {
        const result = {
            user: null,
        };
        const user = await this.userJwtRepository.findOne({
            where: {
                id: userId,
            },
            select: ['username', 'id', 'password', 'activated'],
        });
        if (!user) {
            throw new common_1.NotFoundException();
        }
        user.password = await bcrypt.hash(password, 10);
        user.forgetPasswordToken = null;
        await this.userJwtRepository.save(user);
        result.user = user;
        return result;
    }
    async save(userJwt) {
        return await this.userJwtRepository.save(userJwt);
    }
    async softRemove(userJwt) {
        return await this.userJwtRepository.softRemove(userJwt);
    }
};
UserJwtService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_repository_1.UserJwtRepository)),
    __metadata("design:paramtypes", [user_repository_1.UserJwtRepository,
        event_emitter_1.EventEmitter2,
        jwt_1.JwtService])
], UserJwtService);
exports.UserJwtService = UserJwtService;
//# sourceMappingURL=userJwt.service.js.map