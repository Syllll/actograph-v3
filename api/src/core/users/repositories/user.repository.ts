import { NotFoundException } from '@nestjs/common';
import { EntityRepository } from 'typeorm';
import { User } from '../entities/user.entity';
import {
  BaseRepository,
  IWhereObject,
  OperatorEnum,
  TypeEnum,
} from '../../../utils/repositories/base.repositories';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';

/**
 * Repository pour l'entité User.
 * Fournit des méthodes spécifiques pour rechercher des utilisateurs
 * en fonction de leurs informations JWT (username ou ID).
 */
@CustomRepository(User)
export class UserRepository extends BaseRepository<User> {
  // private logger = new Logger('UserRepository')

  /**
   * Trouve un utilisateur à partir de son nom d'utilisateur JWT.
   * Inclut automatiquement la relation userJwt dans le résultat.
   *
   * @param username - Le nom d'utilisateur JWT à rechercher
   * @returns L'utilisateur trouvé
   * @throws NotFoundException si aucun utilisateur n'est trouvé avec ce nom d'utilisateur
   */
  async findCurrentUserFromJwtUsername(username: string): Promise<User> {
    const includes = ['userJwt'];

    const whereObject: IWhereObject = { conditions: [] };

    whereObject.conditions.push({
      key: 'userJwt.username',
      value: username,
      operator: OperatorEnum.EQUAL,
      type: TypeEnum.AND,
    });

    const response = await this.findAndFilter(
      whereObject,
      includes,
      99999999,
      0,
      'id',
      'DESC',
    );

    if (response.count === 0)
      throw new NotFoundException('No user with this username');
    const output = response.results[0];
    return output;
  }

  /**
   * Trouve un utilisateur à partir de l'ID de son UserJwt.
   * Inclut automatiquement la relation userJwt dans le résultat.
   *
   * @param id - L'ID du UserJwt à rechercher
   * @returns L'utilisateur trouvé
   * @throws NotFoundException si aucun utilisateur n'est trouvé avec cet ID
   */
  async findCurrentUserFromJwtId(id: number): Promise<User> {
    const includes = ['userJwt'];

    const whereObject: IWhereObject = { conditions: [] };

    whereObject.conditions.push({
      key: 'userJwt.id',
      value: id,
      operator: OperatorEnum.EQUAL,
      type: TypeEnum.AND,
    });

    const response = await this.findAndFilter(
      whereObject,
      includes,
      99999999,
      0,
      'id',
      'DESC',
    );

    if (response.count === 0)
      throw new NotFoundException('No user with this username');
    const output = response.results[0];
    return output;
  }
}
