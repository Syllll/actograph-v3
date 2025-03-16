import { BaseEntity } from '@utils/entities/base.entity';
import { UserJwt } from '@auth-jwt/entities/userJwt.entity';
import { UserRoleEnum } from '../utils/user-role.enum';
export declare class User extends BaseEntity {
  firstname: string | null;
  lastname: string | null;
  fullname: string;
  generateFullName(): void;
  resetPasswordOngoing: boolean;
  roles: UserRoleEnum[];
  preferDarkTheme: boolean;
  get isAdmin(): boolean;
  userJwt: UserJwt;
  constructor(partial: Partial<User>);
}
export declare const allRelations: never[];
