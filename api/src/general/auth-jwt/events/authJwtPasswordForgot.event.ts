import { UserJwt } from '../entities/userJwt.entity';

export class authJwtPasswordForgotEvent {
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
}
