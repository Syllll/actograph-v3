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
import { ReadingRepository } from '../repositories/reading.repository';
import { Reading } from '../entities/reading.entity';

@Injectable()
export class ReadingService extends BaseService<
  Reading,
  ReadingRepository
> {
  constructor(
    @InjectRepository(ReadingRepository)
    private readonly readingRepository: ReadingRepository,
  ) {
    super(readingRepository);
  }
}