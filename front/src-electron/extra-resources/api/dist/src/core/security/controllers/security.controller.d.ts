import { BaseController } from '@utils/controllers/base.controller';
import { UserService } from 'src/core/users/services/user.service';
import { SecurityService } from '../services/security.service';
export declare class SecurityController extends BaseController {
  private readonly userService;
  private readonly securityService;
  constructor(userService: UserService, securityService: SecurityService);
  sayHi(): Promise<string>;
  activateLicense(body: { key: string }): Promise<boolean>;
  localUserName(req: any): Promise<string>;
}
