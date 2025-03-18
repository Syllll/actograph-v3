import { NotFoundException } from '@nestjs/common';
import {
  BaseRepository,
  IWhereObject,
  OperatorEnum,
  TypeEnum,
} from '../../../utils/repositories/base.repositories';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';
import { Observation } from '../entities/observation.entity';

@CustomRepository(Observation)
export class ObservationRepository extends BaseRepository<Observation> {
  // private logger = new Logger('UserRepository')
}