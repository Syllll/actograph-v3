import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import { LicenseRepository } from '@core/security/repositories/license.repository';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { Observation } from '../entities/observation.entity';
import { ObservationRepository } from '../repositories/obsavation.repository';
import { Protocol } from '../entities/protocol.entity';
import { ProtocolRepository } from '../repositories/protocol.repository';

@Injectable()
  export class ProtocolService extends BaseService<
  Protocol,
  ProtocolRepository
> {
  constructor(
    @InjectRepository(ProtocolRepository)
    private readonly protocolRepository: ProtocolRepository,
  ) {
    super(protocolRepository);
  }
}