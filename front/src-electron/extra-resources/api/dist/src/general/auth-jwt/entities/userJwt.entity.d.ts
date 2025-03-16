import { BaseEntity } from '@utils/entities/base.entity';
export declare class UserJwtCreateDto {
  username: string;
  password: string;
  activated?: boolean;
}
export declare class UserJwt extends BaseEntity {
  username: string;
  password: string;
  activated: boolean;
  activationToken: string | null;
  forgetPasswordToken: string | null;
}
