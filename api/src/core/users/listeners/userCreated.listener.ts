import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { authJwtUserCreatedEvent } from '@auth-jwt/events/authJwtUserCreated.event';
import { UserService } from '../services/user.service';

@Injectable()
export class UserCreatedListener {
  constructor(private service: UserService) {}

  @OnEvent('authJwt.userCreated', {
    // Those are required to ensure a correct async handling of the event (await emitAsync when emitting)
    async: true,
    promisify: true,
  })
  async handleUserCreatedEvent(event: authJwtUserCreatedEvent) {
    // handle and process "UserGoogleCreatedEvent" event
    try {
      // Attach a user and an employee to each created gogle-user
      await this.service.createFromAuthJwt(event);
    } catch (err) {
      throw new InternalServerErrorException('Create from google error');
    }
  }
}
