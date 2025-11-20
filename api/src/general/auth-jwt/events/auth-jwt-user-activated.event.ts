/**
 * Événement émis lorsqu'un compte utilisateur est activé
 * 
 * Cet événement est émis après qu'un utilisateur ait activé son compte
 * via le token d'activation.
 * 
 * @module AuthJwtUserActivatedEvent
 */
import { UserJwt } from '../entities/user-jwt.entity';

/**
 * Événement d'activation de compte utilisateur
 */
export class AuthJwtUserActivatedEvent {
  /** Utilisateur qui a été activé */
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
} 