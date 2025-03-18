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
import { ActivityGraphRepository } from '../repositories/activity-graph.repository';
import { ActivityGraph } from '../entities/activity-graph.entity';

@Injectable()
export class ActivityGraphService extends BaseService<
  ActivityGraph,
  ActivityGraphRepository
> {
  constructor(
    @InjectRepository(ActivityGraphRepository)
    private readonly activityGraphRepository: ActivityGraphRepository,
  ) {
    super(activityGraphRepository);
  }
}