/**
 * Repository pour l'entité UserJwt
 * 
 * Ce repository étend BaseRepository et fournit les méthodes de base
 * pour interagir avec la table user-jwt dans la base de données.
 * 
 * @module UserJwtRepository
 */
import { BaseRepository } from '@utils/repositories/base.repositories';

import { UserJwt } from '../entities/user-jwt.entity';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';

/**
 * Repository personnalisé pour UserJwt
 * 
 * Hérite de BaseRepository qui fournit les méthodes CRUD de base.
 * Des méthodes personnalisées peuvent être ajoutées ici si nécessaire.
 */
@CustomRepository(UserJwt)
export class UserJwtRepository extends BaseRepository<UserJwt> {
  // private logger = new Logger('UserRepository')
  // Logger optionnel pour le débogage et le suivi des opérations
}
