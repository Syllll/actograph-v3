import {
  Observation,
} from '@core/observations/entities/observation.entity';
import { ObservationRepository } from '@core/observations/repositories/obsavation.repository';
import { ActivityGraphService } from '../activity-graph.service';
import { ProtocolService } from '../protocol/index.service';
import { ReadingService } from '../reading.service';
import { ObservationService } from './index.service';
import { ObservationType, ReadingTypeEnum } from '@actograph/core';
import { NotFoundException } from '@nestjs/common';

export class Example {
  // The version of the example observation
  // This is used to check if the example observation is up to date
  // If the version is not up to date, the example observation is recreated
  private readonly VERSION = 'v0.0.1';

  constructor(
    private readonly observationService: ObservationService,
    private readonly observationRepository: ObservationRepository,
    private readonly protocolService: ProtocolService,
    private readonly readingService: ReadingService,
    private readonly activityGraphService: ActivityGraphService,
  ) {}

  public async checkExampleAndRecreateItIfNeeded() {
    // If the example observation does not exist, create it
    const observation = await this.observationRepository.findOne({
      where: { type: ObservationType.Example },
    });
    if (!observation) {
      console.info(`Example observation not found, creating it...`);
      await this.createExampleObservation();
      return;
    }

    // Check the version of the observation, which is the last word of its description
    const version = observation.description?.split(' ').pop();
    if (version !== this.VERSION) {
      console.info(`Example observation version is outdated, recreating it...`);

      // If we already have an example observation, we need to delete it
      const observationToBeDeleted = await this.observationRepository.findOne({
        where: { type: ObservationType.Example },
      });
      if (observationToBeDeleted) {
        await this.observationRepository.delete(observationToBeDeleted.id);
      }

      // Create the new example observation
      await this.createExampleObservation();
      return;
    }
  }

  public async cloneExampleObservation(userId: number): Promise<Observation> {
    // Find the example observation
    const exampleObservation = await this.observationRepository.findOne({
      where: { type: ObservationType.Example },
    });
    if (!exampleObservation) {
      throw new NotFoundException('Example observation not found');
    }

    // Clone the example observation
    const clonedObservation = await this.observationService.clone(
      exampleObservation.id,
      userId,
    );
    return clonedObservation;
  }

  /**
   * This function creates an example observation with a protocol and a few readings
   * The example observation is loaded when the application is opened to great the user.
   */
  public async createExampleObservation(options?: {}) {
    // First create the observation entity
    const observationObj = this.observationRepository.create({
      name: 'Example Observation',
      description: 'This the exemple observation. v0.0.1',
      type: ObservationType.Example,
    });

    // Save the observation in the db
    const observation = await this.observationRepository.save(observationObj);

    // ********** Create the protocol **********

    const protocol = await this.protocolService.create({
      name: 'Example Protocol',
      description: 'This is an example protocol',
      observationId: observation.id,
    });

    // Add the position category
    const positionCategory = await this.protocolService.items.addCategory({
      protocolId: protocol.id,
      order: 0,
      name: 'Position',
      description: 'This is the position category',
    });
    // Add one observable: Debout
    const debout = await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: positionCategory.id,
      name: 'Debout',
    });
    // Add another observable: Assis
    const assis = await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: positionCategory.id,
      name: 'Assis',
    });
    // Add another observable: Autre Position
    const autrePosition = await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: positionCategory.id,
      name: 'Autre Position',
    });

    // Add the action category
    const actionCategory = await this.protocolService.items.addCategory({
      protocolId: protocol.id,
      order: 1,
      name: 'Action',
      description: 'This is the action category',
    });
    // Add one observable: Chercher
    const chercher = await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: actionCategory.id,
      name: 'Chercher',
    });
    // Add another observable: trouver
    const seLever = await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: actionCategory.id,
      name: 'Se lever',
    });
    // Add another observable: Autre Action
    const autreAction = await this.protocolService.items.addObservable({
      protocolId: protocol.id,
      categoryId: actionCategory.id,
      name: 'Autre Action',
    });

    // ********** Create the readings **********

    // Add a few readings:
    // - Start
    // - Chercher
    // - Debout
    // - Assis
    // - Autre Position
    // - Se lever
    // - Trouver
    // - Pause start
    // - Pause end
    // - Debout
    // - Assis
    // - Autre Position
    // - End

    await this.readingService.createMany([
      {
        name: 'Start',
        type: ReadingTypeEnum.START,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:00'),
      },
      {
        name: 'Chercher',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:01'),
      },
      {
        name: 'Debout',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:02'),
      },
      {
        name: 'Assis',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:03'),
      },
      {
        name: 'Autre Position',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:04'),
      },
      {
        name: 'Se lever',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:05'),
      },
      {
        name: 'Trouver',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:06'),
      },
      {
        name: 'Pause start',
        type: ReadingTypeEnum.PAUSE_START,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:07'),
      },
      {
        name: 'Pause end',
        type: ReadingTypeEnum.PAUSE_END,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:08'),
      },
      {
        name: 'Debout',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:09'),
      },
      {
        name: 'Assis',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:10'),
      },
      {
        name: 'Autre Position',
        type: ReadingTypeEnum.DATA,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:11'),
      },
      {
        name: 'End',
        type: ReadingTypeEnum.STOP,
        observationId: observation.id,
        dateTime: new Date('2025/01/01 12:00:12'),
      },
    ]);

    // Create the activity graph
    await this.activityGraphService.create({
      observationId: observation.id,
    });
  }
}
