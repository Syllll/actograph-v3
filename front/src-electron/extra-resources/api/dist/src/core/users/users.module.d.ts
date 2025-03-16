import { OnModuleInit } from '@nestjs/common';
import { UserService } from './services/user.service';
import { SecurityService } from '@core/security/services/security.service';
export declare class UsersModule implements OnModuleInit {
  private securityService;
  private usersService;
  constructor(securityService: SecurityService, usersService: UserService);
  onModuleInit(): Promise<void>;
}
