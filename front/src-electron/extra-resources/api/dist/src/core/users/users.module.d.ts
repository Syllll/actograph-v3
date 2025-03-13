import { OnModuleInit } from '@nestjs/common';
import { UserService } from './services/user.service';
export declare class UsersModule implements OnModuleInit {
    private usersService;
    constructor(usersService: UserService);
    onModuleInit(): Promise<void>;
}
