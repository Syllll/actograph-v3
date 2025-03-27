import { NotFoundException } from '@nestjs/common';
import {
  BaseRepository,
  IWhereObject,
  OperatorEnum,
  TypeEnum,
} from '../../../utils/repositories/base.repositories';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';
import { ActivityGraph } from '../entities/activity-graph.entity';

@CustomRepository(ActivityGraph)
export class ActivityGraphRepository extends BaseRepository<ActivityGraph> {
  // private logger = new Logger('UserRepository')
}
