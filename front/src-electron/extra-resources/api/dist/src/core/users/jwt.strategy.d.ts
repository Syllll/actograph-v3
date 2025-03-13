import { Strategy } from 'passport-jwt';
import { User as User } from './entities/user.entity';
import { UserService } from './services/user.service';
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly userService;
    constructor(userService: UserService);
    validate(payload: any): Promise<User>;
}
export {};
