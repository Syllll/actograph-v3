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

@Injectable()
export class ObservationService extends BaseService<
  Observation,
  ObservationRepository
> {
  constructor(
    @InjectRepository(ObservationRepository)
    private readonly observationRepository: ObservationRepository,
  ) {
    super(observationRepository);
  }

  async findAllForuser(userId: number): Promise<Observation[]> {
    return this.observationRepository.find({
      where: {
        user: { id: userId },
      },
    });
  }
}