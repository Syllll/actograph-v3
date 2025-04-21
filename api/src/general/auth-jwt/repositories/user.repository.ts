import { BaseRepository } from '@utils/repositories/base.repositories';

import { UserJwt } from '../entities/user-jwt.entity';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';

@CustomRepository(UserJwt)
export class UserJwtRepository extends BaseRepository<UserJwt> {
  // private logger = new Logger('UserRepository')
}
