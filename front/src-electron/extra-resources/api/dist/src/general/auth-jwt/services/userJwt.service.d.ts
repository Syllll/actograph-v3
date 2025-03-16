import { EventEmitter2 } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { UserJwt, UserJwtCreateDto } from '../entities/userJwt.entity';
import { UserJwtRepository } from '../repositories/user.repository';
export declare class TokenResponse {
  token: string;
  message: string;
  errors: string[];
}
export declare class SuccessResponse {
  success: boolean;
  message: string;
  errors: string[];
  output?: any;
}
export declare class UserJwtService {
  private readonly userJwtRepository;
  private readonly eventEmitter;
  private readonly jwtService;
  constructor(
    userJwtRepository: UserJwtRepository,
    eventEmitter: EventEmitter2,
    jwtService: JwtService
  );
  create(
    userCreateDto: UserJwtCreateDto,
    emitUserCreateSignal?: boolean
  ): Promise<Pick<UserJwt, 'id' | 'username'>>;
  login(user: UserJwt): string;
  createNewTokenFromPreviousOne(token: string): string | null;
  activate(activationToken: string): Promise<SuccessResponse>;
  findByUsername(username: string): Promise<UserJwt | null>;
  findByUsernamePassword(username: string, password: string): Promise<UserJwt>;
  findById(id: number): Promise<UserJwt>;
  sendMailForNewPassword(
    email: string,
    resetPasswordUrl: string
  ): Promise<UserJwt>;
  findByRecuperationToken(token: string): Promise<UserJwt>;
  changePasswordUser(
    token: string,
    password: string
  ): Promise<{
    user: UserJwt | null;
  }>;
  changePassword(
    userId: number,
    password: string
  ): Promise<{
    user: UserJwt | null;
  }>;
  save(userJwt: UserJwt): Promise<UserJwt>;
  softRemove(userJwt: UserJwt): Promise<UserJwt>;
}
