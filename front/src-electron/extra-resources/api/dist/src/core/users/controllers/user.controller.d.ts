import { BaseController } from '@utils/controllers/base.controller';
import { UserService } from '../services/user.service';
import { User } from '../entities/user.entity';
import { UserUpdateCurrentDto } from '../dtos/user-patch.dto';
import { UserJwtService } from '@auth-jwt/services/userJwt.service';
export declare class UserController extends BaseController {
    private readonly service;
    private readonly userJwtService;
    constructor(service: UserService, userJwtService: UserJwtService);
    getResetPasswordToken(req: any, username: string): Promise<string>;
    choosePasswordAfterReset(req: any, body: {
        password: string;
    }): Promise<User>;
    get(req: any): Promise<User>;
    update(req: any, body: UserUpdateCurrentDto): Promise<User>;
}
