import { UserJwt } from '../entities/user-jwt.entity';

export class AuthJwtUserCreatedEvent {
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
} 