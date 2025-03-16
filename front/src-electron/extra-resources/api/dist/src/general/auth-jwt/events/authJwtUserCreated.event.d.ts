import { UserJwt } from '../entities/userJwt.entity';
export declare class authJwtUserCreatedEvent {
  user: UserJwt;
  constructor(user: UserJwt);
}
