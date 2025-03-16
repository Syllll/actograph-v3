import { User } from '../entities/user.entity';
import { BaseRepository } from '../../../utils/repositories/base.repositories';
export declare class UserRepository extends BaseRepository<User> {
  findCurrentUserFromJwtUsername(username: string): Promise<User>;
  findCurrentUserFromJwtId(id: number): Promise<User>;
}
