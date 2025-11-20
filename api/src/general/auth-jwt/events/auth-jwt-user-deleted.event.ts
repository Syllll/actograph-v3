/**
 * Événement émis lorsqu'un utilisateur est supprimé
 * 
 * Cet événement est émis après qu'un utilisateur ait été supprimé
 * (soft delete ou hard delete). Peut être utilisé pour nettoyer
 * les ressources associées, envoyer des notifications, etc.
 * 
 * @module AuthJwtUserDeletedEvent
 */
import { UserJwt } from '../entities/user-jwt.entity';

/**
 * Événement de suppression d'utilisateur
 */
export class AuthJwtUserDeletedEvent {
  /** Utilisateur qui a été supprimé */
  user: UserJwt;

  constructor(user: UserJwt) {
    this.user = user;
    // console.log('mailPasswordForgot');
  }
} 