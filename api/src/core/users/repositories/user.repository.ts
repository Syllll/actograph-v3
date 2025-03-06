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

@CustomRepository(User)
export class UserRepository extends BaseRepository<User> {
  // private logger = new Logger('UserRepository')

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
