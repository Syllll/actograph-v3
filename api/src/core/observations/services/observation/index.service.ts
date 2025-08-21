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
import { ProtocolItemTypeEnum } from '@core/observations/entities/protocol.entity';
import { ReadingTypeEnum } from '@core/observations/entities/reading.entity';

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

  public async create(options: {
    userId: number;
    name: string;
    description?: string;
    protocol?: {
      name?: string;
      description?: string;
      categories?: {
        name: string;
        description?: string;
        observables?: {
          name: string;
        }[];
      }[];
    };
    readings?: {
      name: string;
      type: ReadingTypeEnum;
      dateTime: Date;
    }[];
    activityGraph?: {};
  }) {
    const observation = this.observationRepository.create({
      user: {
        id: options.userId,
      },
      name: options.name ?? 'Nouvelle observation',
      description: options.description,
      type: ObservationType.Normal,
    });
    
    const savedObservation = await this.observationRepository.save(observation);

    // Create the protocol
    if (options.protocol) {
      const protocol = await this.protocolService.create({
        observationId: savedObservation.id,
        name: options.protocol.name ?? 'Protocol - ' + savedObservation.name,
        description: options.protocol.description,
      });

      // Create the categories
      if (options.protocol.categories) {
        let categoryOrder = 0;
        for (const category of options.protocol.categories) {
          const savedCategory = await this.protocolService.items.addCategory({
            protocolId: protocol.id,
            name: category.name,
            description: category.description,
            order: categoryOrder,
          });

          // Increase the order
          categoryOrder++;

          // Create the observables
          if (category.observables) {
            for (const observable of category.observables) {
              await this.protocolService.items.addObservable({
                protocolId: protocol.id,
                categoryId: savedCategory.id,
                name: observable.name,
              });
            }
          }
        }
      }
    }

    // Create the readings
    if (options.readings) {
      await this.readingService.createMany(
        options.readings.map((r) => {
          return {
            ...r,
            observationId: savedObservation.id,
          };
        }),
      );
    }

    // Create the activity graph
    if (options.activityGraph) {
      await this.activityGraphService.create({
        observationId: savedObservation.id,
      });
    }

    return savedObservation;
  }
}
