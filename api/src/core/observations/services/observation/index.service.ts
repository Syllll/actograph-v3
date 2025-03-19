import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import { Observation } from '../../entities/observation.entity';
import { ObservationRepository } from '../../repositories/obsavation.repository';
import { IConditions, IPaginationOptions, IPaginationOutput, OperatorEnum, TypeEnum } from '@utils/repositories/base.repositories';
import { Find } from './find';
import { Check } from './check';

@Injectable()
export class ObservationService extends BaseService<
  Observation,
  ObservationRepository
> {
  public find: Find;
  public check: Check;

  constructor(
    @InjectRepository(ObservationRepository)
    private readonly observationRepository: ObservationRepository,
  ) {
    super(observationRepository);

    this.find = new Find(this, observationRepository);
    this.check = new Check(this);
  }

  

  
}