import { BaseController } from '@utils/controllers/base.controller';
import { UserJwtRepository } from '../repositories/user.repository';
import { UserJwt, UserJwtCreateDto } from '../entities/userJwt.entity';
import { UserJwtService, SuccessResponse, TokenResponse } from '../services/userJwt.service';
export declare class AuthJwtController extends BaseController {
    private userJwtRepository;
    private usersService;
    private allowRegisterNewUserFromAuthJwt;
    constructor(userJwtRepository: UserJwtRepository, usersService: UserJwtService);
    postLogin(username: string, password: string): Promise<{
        token: string;
    }>;
    refreshToekn(token: string): Promise<{
        token: string | null;
    }>;
    logout(request: any, response: any): void;
    postRegister(user: UserJwtCreateDto): Promise<Partial<UserJwt>>;
    getNewPassword(username: string, resetPasswordUrl: string): Promise<SuccessResponse>;
    postNewPassword(token: string, password: string): Promise<TokenResponse>;
}
