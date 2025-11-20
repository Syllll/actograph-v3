/**
 * Événement émis lorsqu'un nouvel utilisateur est créé
 * 
 * Cet événement est émis après qu'un nouvel utilisateur ait été créé
 * dans la base de données. Peut être utilisé pour envoyer des emails
 * de bienvenue, créer des ressources associées, etc.
 * 
 * @module AuthJwtUserCreatedEvent
 */
import { UserJwt } from '../entities/user-jwt.entity';

/**
 * Événement de création d'utilisateur
 */
export class AuthJwtUserCreatedEvent {
  /** Utilisateur qui vient d'être créé */
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
} 