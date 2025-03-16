import { authJwtUserCreatedEvent } from '@auth-jwt/events/authJwtUserCreated.event';
import { UserService } from '../services/user.service';
export declare class UserCreatedListener {
  private service;
  constructor(service: UserService);
  handleUserCreatedEvent(event: authJwtUserCreatedEvent): Promise<void>;
}
