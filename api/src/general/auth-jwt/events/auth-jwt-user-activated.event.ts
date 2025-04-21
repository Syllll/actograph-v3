import { UserJwt } from '../entities/user-jwt.entity';

export class AuthJwtUserActivatedEvent {
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
} 