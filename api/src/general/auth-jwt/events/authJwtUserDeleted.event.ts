import { UserJwt } from '../entities/userJwt.entity';

export class authJwtUserDeletedEvent {
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
}
