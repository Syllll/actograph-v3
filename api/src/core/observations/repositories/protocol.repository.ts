import { NotFoundException } from '@nestjs/common';
import {
  BaseRepository,
  IWhereObject,
  OperatorEnum,
  TypeEnum,
} from '../../../utils/repositories/base.repositories';

import { CustomRepository } from 'src/database/typeorm-ex.decorator';
import { Protocol } from '../entities/protocol.entity';

@CustomRepository(Protocol)
export class ProtocolRepository extends BaseRepository<Protocol> {
  // private logger = new Logger('UserRepository')
} 