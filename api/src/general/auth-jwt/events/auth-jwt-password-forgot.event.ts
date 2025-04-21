import { UserJwt } from '../entities/user-jwt.entity';

export class AuthJwtPasswordForgotEvent {
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
} 