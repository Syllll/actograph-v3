import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AuthJwtUserCreatedEvent } from '@auth-jwt/events/auth-jwt-user-created.event';
import { UserService } from '../services/user.service';

/**
 * Listener pour l'événement de création d'un utilisateur JWT.
 * Écoute l'événement 'authJwt.userCreated' et crée automatiquement un User
 * associé au UserJwt créé dans le module d'authentification.
 */
@Injectable()
export class UserCreatedListener {
  constructor(private service: UserService) {}

  /**
   * Gère l'événement de création d'un utilisateur JWT.
   * Crée automatiquement un User associé au UserJwt créé.
   *
   * @param event - L'événement contenant le UserJwt créé
   * @throws InternalServerErrorException si la création échoue
   */
  @OnEvent('authJwt.userCreated', {
    // Those are required to ensure a correct async handling of the event (await emitAsync when emitting)
    async: true,
    promisify: true,
  })
  async handleUserCreatedEvent(event: AuthJwtUserCreatedEvent) {
    // handle and process "UserGoogleCreatedEvent" event
    try {
      // Attach a user and an employee to each created gogle-user
      await this.service.createFromAuthJwt(event);
    } catch (err) {
      throw new InternalServerErrorException('Create from google error');
    }
  }
}
