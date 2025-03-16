import { UserJwtService } from '@auth-jwt/services/userJwt.service';
import { UserRepository } from '@users/repositories/user.repository';
import { UserService } from './user.service';
export declare class ResetPasswordToken {
  private parent;
  private parentRepository;
  private jwtService;
  constructor(
    parent: UserService,
    parentRepository: UserRepository,
    jwtService: UserJwtService
  );
  createResetPasswordToken(username: string): Promise<string>;
}
