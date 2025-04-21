import { UserJwt } from '../entities/user-jwt.entity';

export class AuthJwtUserDeletedEvent {
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
} 