import { UserJwtCreateDto } from '@auth-jwt/entities/userJwt.entity';
import { UserRoleEnum } from '../utils/user-role.enum';
export declare class UserCreateDto {
  firstname?: string;
  lastname?: string;
  roles: UserRoleEnum[];
  userJwt?: UserJwtCreateDto;
}
