/**
 * Événement émis lorsqu'un utilisateur demande une réinitialisation de mot de passe
 * 
 * Cet événement est émis après qu'un token de réinitialisation ait été généré
 * et sauvegardé pour l'utilisateur.
 * 
 * @module AuthJwtPasswordForgotEvent
 */
import { UserJwt } from '../entities/user-jwt.entity';

/**
 * Événement de demande de réinitialisation de mot de passe
 */
export class AuthJwtPasswordForgotEvent {
  /** Utilisateur ayant demandé la réinitialisation */
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
} 