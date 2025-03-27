import { NotFoundException } from '@nestjs/common';
import {
  BaseRepository,
  IWhereObject,
  OperatorEnum,
  TypeEnum,
} from '../../../utils/repositories/base.repositories';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';
import { Reading } from '../entities/reading.entity';

@CustomRepository(Reading)
export class ReadingRepository extends BaseRepository<Reading> {
  // private logger = new Logger('UserRepository')
}
