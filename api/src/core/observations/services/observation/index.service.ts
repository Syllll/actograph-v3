import {
  DateModeEnum,
  License,
  LicenseTypeEnum,
} from '@core/security/entities/license.entity';
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { BaseService } from '@utils/services/base.service';
import {
  Observation,
  ObservationType,
} from '../../entities/observation.entity';
import { ObservationRepository } from '../../repositories/obsavation.repository';
import {
  IConditions,
  IPaginationOptions,
  IPaginationOutput,
  OperatorEnum,
  TypeEnum,
} from '@utils/repositories/base.repositories';
import { Find } from './find';
import { Check } from './check';
import { ActivityGraphService } from '../activity-graph.service';
import { ProtocolService } from '../protocol/index.service';
import { ReadingService } from '../reading.service';
import { Example } from './example';

@Injectable()
export class ObservationService extends BaseService<
  Observation,
  ObservationRepository
> {
  public find: Find;
  public check: Check;
  public example: Example;

  constructor(
    @InjectRepository(ObservationRepository)
    private readonly observationRepository: ObservationRepository,
    private readonly protocolService: ProtocolService,
    private readonly activityGraphService: ActivityGraphService,
    private readonly readingService: ReadingService,
  ) {
    super(observationRepository);

    this.find = new Find(this, observationRepository);
    this.check = new Check(this);
    this.example = new Example(
      this,
      observationRepository,
      this.protocolService,
      this.readingService,
      this.activityGraphService,
    );
  }

  public async remove(id: number) {
    const observation = await this.findOne(id, {
      relations: ['protocol', 'activityGraph'],
    });
    if (!observation) {
      throw new NotFoundException('Observation not found');
    }

    // Remove the protocol
    if (observation.protocol) {
      await this.protocolService.delete(observation.protocol.id);
    }

    // Remove the activity graph
    if (observation.activityGraph) {
      await this.activityGraphService.delete(observation.activityGraph.id);
    }

    // Remove the readings if any
    await this.readingService.removeAllForObservation(<number>observation.id);
  }

  public async clone(observationId: number, newUserId: number) {
    const observation = await this.findOne(observationId, {
      relations: ['protocol', 'activityGraph'],
    });
    if (!observation || !observation.id) {
      throw new NotFoundException('Observation not found');
    }

    // Find observation with same name
    const sameNameObservationsCount =
      await this.find.findObservationsCountWithSameName({
        userId: newUserId,
        name: observation.name ?? '',
      });
    let clonedObservationName = `${observation.name}`;
    if (sameNameObservationsCount > 0) {
      clonedObservationName = `${observation.name} (${
        sameNameObservationsCount + 1
      })`;
    }

    const _clonedObservation = this.observationRepository.create({
      ...observation,
      id: undefined,
      protocol: undefined,
      activityGraph: undefined,
      user: {
        id: newUserId,
      },
      type: ObservationType.Normal,
      name: clonedObservationName,
    });
    const clonedObservation = await this.observationRepository.save(
      _clonedObservation,
    );

    // Clone the protocol
    if (observation.protocol) {
      await this.protocolService.clone({
        protocolId: observation.protocol.id,
        observationIdToCopyTo: clonedObservation.id,
        newUserId: newUserId,
      });
    }

    // Clone the activity graph
    if (observation.activityGraph) {
      await this.activityGraphService.clone({
        activityGraphId: observation.activityGraph.id,
        observationIdToCopyTo: clonedObservation.id,
      });
    }

    // Clone the readings
    await this.readingService.cloneAndAttributeToObservation({
      observationIdToCopyFrom: observation.id,
      observationIdToCopyTo: clonedObservation.id,
    });

    return clonedObservation;
  }
}
